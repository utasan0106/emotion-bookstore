#!/usr/bin/python3
"""Offline, deterministic public-delivery font corpus, build and audit (no Git).

/usr/bin/python3 tools/build-public-gothic-fonts.py --source-dir /path/to/official/ttfs
/usr/bin/python3 tools/build-public-gothic-fonts.py --check
Optional --output-dir isolates a second build; --repo-root supports test fixtures.
"""
import argparse
from collections import defaultdict, deque
import fnmatch
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import re
import sys
import unicodedata
from urllib.parse import unquote, urlsplit

from fontTools import subset, version as FONTTOOLS_VERSION
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
ASSET_PATH = 'assets/fonts/public-gothic'
FAMILY = 'EB Public Gothic'
SOURCE_CMAP_HASH = '3452e4b2c6a7262dd1cd1d82960ab1ffbe6d89e184b807f7e38773573f297c45'
OFL_HASH = '0fac78a235c98d640cb06332eb5362c211d86fa03c011df438c35005d22ad2c7'
FONTS = [
    {'weight': 400, 'style': 'Regular', 'sourceFile': 'ZenKakuGothicNew-Regular.ttf',
     'sha256': 'b840cd07a67d89cacca44249ae49aa99ee7640eb5ce623be8d8983d6aabac801',
     'output': 'eb-public-gothic-400.woff2', 'postscriptName': 'EBPublicGothic-Regular'},
    {'weight': 700, 'style': 'Bold', 'sourceFile': 'ZenKakuGothicNew-Bold.ttf',
     'sha256': '0081cedabc4921982fcd061f845a005664ac7fb642af2dd34b4007bc63ccd235',
     'output': 'eb-public-gothic-700.woff2', 'postscriptName': 'EBPublicGothic-Bold'},
]
# Editorial inputs can generate future visible text without being browser scripts.
# This small explicit list is intentionally NOT a recursive tools/docs/QA scan.
EDITORIAL_INPUTS = (
    'tools/work-entry-source.html', 'tools/city-discovery-source.js',
    'tools/weekly-outings-source.js', 'tools/artist-profiles.js',
    'tools/city-columns.js', 'tools/city-editorials.js', 'tools/city-research.js',
    'tools/venue-source.js', 'tools/places-source.js', 'tools/event-media-source.js',
    'tools/work-media.js', 'tools/work-cover-source.json',
    'tools/social-posts-source.js', 'tools/site-navigation.js', 'tools/page-chrome.js',
    'tools/build-city-discovery.js', 'tools/build-weekly-outings.js',
    'tools/build-work-pages.js',
)
VISIBLE_ATTRS = {'alt', 'title', 'placeholder', 'aria-label', 'aria-description',
                 'aria-valuetext', 'label', 'value'}
TEXT_EXTENSIONS = {'.js', '.mjs', '.json', '.geojson', '.css'}
REF_RE = re.compile(r'''["'`]([^\s"'`<>]+?\.(?:m?js|json|geojson|css)(?:[?#][^\s"'`<>]*)?)["'`]''')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encoded(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode('utf-8')


def cmap_digest(values):
    return digest(json.dumps(sorted(values), separators=(',', ':')).encode())


def points(text):
    # Control characters and Unicode format controls are layout, not glyphs.
    return {ord(c) for c in text if ord(c) >= 32 and unicodedata.category(c) not in ('Cc', 'Cf', 'Cs')}


def japanese(cp):
    return (0x3040 <= cp <= 0x30ff or 0x3400 <= cp <= 0x9fff or
            0xf900 <= cp <= 0xfaff or 0xff61 <= cp <= 0xff9f or 0x20000 <= cp <= 0x323af)


def decoded(text):
    # Keep literal source too: comments/identifiers make this a safe superset,
    # not a claim that every JS character is displayed. Decode escaped strings.
    def scalar(match):
        value = int(match.group(1) or match.group(2) or match.group(3), 16)
        return chr(value) if value <= 0x10ffff else ''
    value = re.sub(r'\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})', scalar, text)
    value = re.sub(r'[\ud800-\udbff][\udc00-\udfff]',
                   lambda m: chr(0x10000 + ((ord(m[0][0]) - 0xd800) << 10) + ord(m[0][1]) - 0xdc00), value)
    return html.unescape(value)


class DeliveryRules:
    """Current .vercelignore gitignore-style rules, independent of a Git index.

    Slash-anchored paths, directory prefixes, basename globs, and ordered ! rules
    are supported. Fail closed on escaped rules, not silently approximate them.
    """
    def __init__(self, text):
        self.rules = []
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '\\' in line:
                raise ValueError('Unsupported escaped .vercelignore pattern: ' + line)
            negate = line.startswith('!')
            pattern = line[1:] if negate else line
            anchored = pattern.startswith('/') or '/' in pattern.rstrip('/')
            self.rules.append((pattern.strip('/'), anchored, negate))

    def ignored(self, name):
        result = False
        parts = PurePosixPath(name).parts
        for pattern, anchored, negate in self.rules:
            if anchored:
                match = any(fnmatch.fnmatchcase('/'.join(parts[:i]), pattern)
                            for i in range(1, len(parts) + 1))
            else:
                match = any(fnmatch.fnmatchcase(part, pattern) for part in parts)
            if match:
                result = not negate
        return result


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.visible = []
        self.inline = []
        self.scripts = []
        self.styles = []
        self.attribute_superset = []
        self.skip = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for key, value in attrs:
            if key.startswith('data-') and value:
                self.attribute_superset.append(value)
        for key in VISIBLE_ATTRS:
            if a.get(key):
                self.visible.append(a[key])
        if tag == 'script':
            self.skip.append('script')
            if a.get('src'):
                self.scripts.append(a['src'])
        elif tag == 'style':
            self.skip.append('style')
        if tag == 'link' and ('stylesheet' in a.get('rel', '').split() or
                              a.get('as') in ('script', 'style')) and a.get('href'):
            self.styles.append(a['href'])

    def handle_endtag(self, tag):
        if self.skip and tag == self.skip[-1]:
            self.skip.pop()

    def handle_data(self, data):
        (self.inline if self.skip else self.visible).append(data)


def resolve(root, base, reference):
    u = urlsplit(html.unescape(reference))
    if u.scheme or u.netloc or not u.path or '${' in u.path:
        return None
    path = root / unquote(u.path.lstrip('/')) if u.path.startswith('/') else root / base.parent / unquote(u.path)
    try:
        path = path.resolve().relative_to(root.resolve())
    except ValueError:
        return None
    if path.suffix.lower() in TEXT_EXTENSIONS and (root / path).is_file():
        return path.as_posix()
    return None


def collect(root):
    ignore = root / '.vercelignore'
    rules = DeliveryRules(ignore.read_text('utf-8'))
    pages = sorted(p.relative_to(root).as_posix() for p in root.rglob('*.html')
                   if not any(part in ('.git', 'node_modules') for part in p.relative_to(root).parts)
                   and not rules.ignored(p.relative_to(root).as_posix()))
    if not pages:
        raise ValueError('No delivered HTML found')
    records, char_sources, reasons = {}, defaultdict(set), defaultdict(set)
    queue = deque()
    document_bases = defaultdict(set)
    processed_contexts = {}
    required = set(range(32, 127))
    # These ranges are intersected with upstream cmap during build/check. Do not
    # invent missing glyphs for unassigned or unsupported kana codepoints.
    reserve = set(range(0x3040, 0x3100)) | set(range(0xff61, 0xffa0))

    def add(name, kind, text, visible=''):
        raw = (root / name).read_bytes()
        cps, visible_cps = points(text), points(visible)
        required.update(cps)
        records[name] = {'path': name, 'kind': kind, 'sha256': digest(raw),
                         'bytes': len(raw), 'codepoints': sorted(cps),
                         'visibleCodepoints': sorted(visible_cps)}
        for cp in cps:
            char_sources[cp].add(name)

    def enqueue(base, reference, why, contexts=None):
        name = resolve(root, PurePosixPath(base), reference)
        if name and not rules.ignored(name) and not name.startswith(ASSET_PATH + '/'):
            reasons[name].add(why)
            document_bases[name].update(contexts or ([base] if base.endswith('.html') else []))
            if name not in processed_contexts or processed_contexts[name] != document_bases[name]:
                queue.append(name)

    for name in pages:
        raw = (root / name).read_text('utf-8')
        parser = Page()
        parser.feed(raw)
        visible = '\n'.join(parser.visible)
        inline = '\n'.join(parser.inline + parser.attribute_superset)
        add(name, 'delivered-html', visible + '\n' + decoded(inline), visible)
        for ref in parser.scripts + parser.styles:
            enqueue(name, ref, name)
        for ref in REF_RE.findall(inline):
            enqueue(name, ref, name + ':inline')
    while queue:
        name = queue.popleft()
        contexts = set(document_bases[name])
        if processed_contexts.get(name) == contexts:
            continue
        processed_contexts[name] = contexts
        raw = (root / name).read_text('utf-8')
        text = decoded(raw)
        if name.endswith('.css'):
            # Include all CSS source as conservative superset and decode CSS
            # escapes for generated content, without touching font binaries.
            text += re.sub(r'\\([0-9A-Fa-f]{1,6})(?:\s)?',
                           lambda m: chr(int(m[1], 16)) if int(m[1], 16) <= 0x10ffff else '', raw)
        add(name, 'linked-runtime-superset', text)
        for ref in REF_RE.findall(raw):
            enqueue(name, ref, name, contexts)
            # fetch paths resolve against the document even when a path came
            # from an intermediate JSON manifest rather than the JS source.
            for parent in sorted(contexts):
                enqueue(parent, ref, name + ':document-relative', contexts)
        # Atlas JSON names live in JSON manifests and are transitively resolved
        # by the same quoted-path scanner. Include GeoJSON text, never geometry
        # as pixels or undocumented dataset directories.
    for name in EDITORIAL_INPUTS:
        if not (root / name).is_file():
            raise ValueError('Missing declared editorial source: ' + name)
        add(name, 'explicit-editorial-input-superset', decoded((root / name).read_text('utf-8')))
    for name, record in records.items():
        if name in reasons:
            record['linkedFrom'] = sorted(reasons[name])
    manifest = {'schemaVersion': 1, 'strategy': {
        'html': 'Every .html not excluded by current .vercelignore; decoded text nodes and display/accessibility attributes; inline scripts/style and data-* attributes are a conservative superset.',
        'runtime': 'Transitively linked same-origin JS/JSON/GeoJSON/CSS, plus document-relative referenced data; full decoded source is a conservative superset including choices, errors, comments and identifiers.',
        'editorial': 'Explicit bounded source list for generated work/city/event text; no recursive QA/docs/archive scan.',
        'decoding': 'HTML entities, JS Unicode escapes, surrogate pairs, hex escapes, CSS Unicode escapes. No normalization of Japanese variants.',
        'reserve': 'Printable ASCII plus upstream-supported hiragana, katakana and halfwidth kana.',
        'limits': 'Arbitrary user-entered notes, third-party responses and future text are not enumerable; system fallback remains necessary. External fonts/content are not fetched.'},
        'deliveryRulesSha256': digest(ignore.read_bytes()), 'deliveredHtmlCount': len(pages),
        'deliveredHtml': pages, 'inputs': [records[n] for n in sorted(records)],
        'requiredCodepoints': sorted(required), 'reservedKanaCodepoints': sorted(reserve),
        'requiredJapaneseCount': sum(japanese(cp) for cp in required)}
    return manifest, char_sources


def missing_records(values, char_sources, corpus, root):
    by_path = {r['path']: set(r['visibleCodepoints']) for r in corpus['inputs']}
    def occurrences(cp):
        found = []
        for path in sorted(char_sources.get(cp, [])):
            for number, line in enumerate((root / path).read_text('utf-8').splitlines(), 1):
                line = decoded(line)
                index = line.find(chr(cp))
                if index >= 0:
                    found.append({'path': path, 'line': number, 'excerpt': line[max(0, index - 35):index + 50]})
                    break
        return found
    return [{'codepoint': cp, 'unicode': f'U+{cp:04X}', 'character': chr(cp),
             'name': unicodedata.name(chr(cp), 'UNNAMED'), 'japanese': japanese(cp),
             'sources': sorted(char_sources.get(cp, [])), 'occurrences': occurrences(cp),
             'visibleHtmlSources': sorted(p for p in char_sources.get(cp, []) if cp in by_path[p])}
            for cp in sorted(values)]


def coverage_document(wanted, upstream, unsupported):
    return {'family': FAMILY, 'weights': [400, 700],
            'fonts': [{'weight': f['weight'], 'file': f['output'], 'postscript_name': f['postscriptName']} for f in FONTS],
            'covered_codepoints': sorted(wanted & upstream),
            'upstream_unsupported_codepoints': sorted(wanted - upstream),
            'upstream_unsupported': unsupported,
            'contract': 'Both weights cover every required upstream-supported codepoint. Listed upstream-unsupported characters require system fallback; they are not subset gaps.'}


def renamed(font, style, weight):
    names = {1: FAMILY, 2: style, 3: FAMILY.replace(' ', '') + '-' + style + '-subset-v1',
             4: FAMILY + ' ' + style, 6: FAMILY.replace(' ', '') + '-' + style,
             16: FAMILY, 17: style}
    for ident, value in names.items():
        font['name'].setName(value, ident, 3, 1, 0x409)
        font['name'].setName(value, ident, 1, 0, 0)
    font['OS/2'].usWeightClass = weight


def check(root, output, source_dir=None):
    corpus, locations = collect(root)
    stored = json.loads((output / 'corpus-manifest.json').read_text('utf-8'))
    if stored != corpus:
        raise ValueError('Stale corpus manifest: delivered surface or source content changed; rebuild')
    sources = json.loads((output / 'sources.json').read_text('utf-8'))
    if sources['builderSha256'] != digest(Path(__file__).read_bytes()):
        raise ValueError('Stale builder hash; rebuild')
    if sources['corpusManifestSha256'] != digest(encoded(corpus)):
        raise ValueError('Corpus manifest hash mismatch')
    if digest((output / 'OFL.txt').read_bytes()) != OFL_HASH:
        raise ValueError('OFL license hash mismatch')
    upstream = set(sources['upstreamCodepoints'])
    if cmap_digest(upstream) != SOURCE_CMAP_HASH:
        raise ValueError('Upstream cmap provenance mismatch')
    wanted = set(corpus['requiredCodepoints']) | (set(corpus['reservedKanaCodepoints']) & upstream)
    if (output / 'corpus.txt').read_bytes() != (''.join(map(chr, sorted(wanted))) + '\n').encode('utf-8'):
        raise ValueError('Corpus text mismatch')
    expected_missing = missing_records(wanted - upstream, locations, corpus, root)
    coverage = coverage_document(wanted, upstream, expected_missing)
    if (output / 'coverage.json').read_bytes() != encoded(coverage):
        raise ValueError('Stale coverage document or unsupported-character locations')
    if sources['upstreamUnsupported'] != expected_missing:
        raise ValueError('Unreviewed upstream unsupported character or stale fallback list')
    for fixed, item in zip(FONTS, sources['fonts'], strict=True):
        if any(item.get(k) != v for k, v in fixed.items()):
            raise ValueError('Locked font source or output identity changed')
        target = output / item['output']
        font = TTFont(target)
        actual = set(font.getBestCmap())
        gaps = wanted & upstream - actual
        if gaps:
            raise ValueError('Subset glyph gaps in ' + target.name + ': ' + ', '.join(f'U+{x:04X}' for x in sorted(gaps)))
        if actual != wanted & upstream:
            raise ValueError('Unexpected subset cmap in ' + target.name)
        if digest(target.read_bytes()) != item['outputSha256']:
            raise ValueError('Stale or tampered output hash: ' + target.name)
        if (font['OS/2'].usWeightClass != item['weight'] or font['name'].getDebugName(1) != FAMILY
                or font['name'].getDebugName(6) != item['postscriptName']):
            raise ValueError('Font family/weight mismatch: ' + target.name)
        if source_dir:
            source = source_dir / item['sourceFile']
            if digest(source.read_bytes()) != item['sha256']:
                raise ValueError('Upstream source hash mismatch: ' + source.name)
    visible_jp = [x for x in expected_missing if x['japanese'] and x['visibleHtmlSources']]
    print(f"PASS: {corpus['deliveredHtmlCount']} delivered HTML; {len(corpus['inputs'])} scoped inputs; "
          f"{len(wanted)} required/reserved codepoints; 0 subset-introduced gaps in both weights")
    print(f"UPSTREAM FALLBACK: {len(expected_missing)} unsupported codepoints; "
          f"{sum(x['japanese'] for x in expected_missing)} Japanese; {len(visible_jp)} Japanese in HTML text/attributes")
    return sources


def build(root, output, source_dir):
    corpus, locations = collect(root)
    upstream = None
    for fixed in FONTS:
        path = source_dir / fixed['sourceFile']
        if digest(path.read_bytes()) != fixed['sha256']:
            raise ValueError('Upstream source hash mismatch: ' + path.name)
        cmap = set(TTFont(path).getBestCmap())
        if cmap_digest(cmap) != SOURCE_CMAP_HASH:
            raise ValueError('Upstream cmap hash mismatch')
        if upstream is not None and upstream != cmap:
            raise ValueError('Weights have different coverage')
        upstream = cmap
    license_bytes = (source_dir / 'OFL.txt').read_bytes()
    if digest(license_bytes) != OFL_HASH:
        raise ValueError('Upstream OFL hash mismatch')
    wanted = set(corpus['requiredCodepoints']) | (set(corpus['reservedKanaCodepoints']) & upstream)
    output.mkdir(parents=True, exist_ok=True)
    fonts = []
    for fixed in FONTS:
        font = TTFont(source_dir / fixed['sourceFile'], recalcTimestamp=False)
        options = subset.Options()
        options.flavor = 'woff2'
        options.layout_features = ['*']
        options.name_IDs = ['*']
        options.name_legacy = True
        options.notdef_outline = True
        options.recalc_timestamp = False
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=sorted(wanted & upstream))
        sub.subset(font)
        renamed(font, fixed['style'], fixed['weight'])
        font.flavor = 'woff2'
        target = output / fixed['output']
        font.save(target, reorderTables=True)
        fonts.append(dict(fixed, url='https://raw.githubusercontent.com/google/fonts/main/ofl/zenkakugothicnew/' + fixed['sourceFile'],
                          outputSha256=digest(target.read_bytes()), outputBytes=target.stat().st_size,
                          outputCmapCount=len(font.getBestCmap())))
    sources = {'schemaVersion': 1, 'family': FAMILY, 'upstreamFamily': 'Zen Kaku Gothic New',
        'upstreamRepository': 'https://github.com/googlefonts/zen-kakugothic',
        'sourceProvenance': 'Official Google Fonts files supplied locally, locked by SHA-256; build never downloads.',
        'license': 'SIL Open Font License 1.1', 'licenseFile': 'OFL.txt', 'licenseSha256': OFL_HASH,
        'fontToolsVersion': FONTTOOLS_VERSION, 'builderSha256': digest(Path(__file__).read_bytes()),
        'corpusManifestSha256': digest(encoded(corpus)), 'upstreamCodepoints': sorted(upstream),
        'upstreamCmapSha256': SOURCE_CMAP_HASH,
        'upstreamUnsupported': missing_records(wanted - upstream, locations, corpus, root),
        'fonts': fonts}
    (output / 'OFL.txt').write_bytes(license_bytes)
    (output / 'corpus.txt').write_text(''.join(map(chr, sorted(wanted))) + '\n', encoding='utf-8')
    (output / 'corpus-manifest.json').write_bytes(encoded(corpus))
    (output / 'sources.json').write_bytes(encoded(sources))
    (output / 'coverage.json').write_bytes(encoded(coverage_document(wanted, upstream, sources['upstreamUnsupported'])))
    (output / 'README.md').write_text('''# EB Public Gothic: public-delivery subsets

Derived from the official Zen Kaku Gothic New Regular (400) and Bold (700).
Copyright and SIL Open Font License 1.1 are retained in OFL.txt and font metadata.
Only these new font assets are changed; previous font files remain untouched.

## Reproduce offline

Use /usr/bin/python3 with fontTools + Brotli already installed:

    /usr/bin/python3 tools/build-public-gothic-fonts.py --source-dir /path/to/official/ttfs
    /usr/bin/python3 tools/build-public-gothic-fonts.py --check
    /usr/bin/python3 qa/public_gothic_fonts_check.py

For byte-for-byte second-build verification, pass --source-dir to the QA script.
No Git index, network, browser, package installation, clock or random seed is used.
Source TTF and OFL SHA-256 values are pinned in the builder. Font timestamps are
preserved. The CSS family and internal family are EB Public Gothic, normal 400/700.

## Honest coverage contract

corpus-manifest.json enumerates every delivered HTML under .vercelignore (including
public v3 pages), linked runtime JS/JSON/GeoJSON/CSS and the explicit editorial
source list. HTML entities and JS Unicode escapes are decoded. Runtime/source
text is a conservative superset, not a claim of exact visibility. Each input has
its SHA-256, collected codepoints and HTML-visible codepoints. corpus.txt is the
sorted character set; ASCII and upstream-supported kana are retained.

coverage.json provides numeric covered_codepoints for browser glyph audits.
sources.json records upstream cmap, output hashes, sizes, and every upstream-
unsupported character with exact source paths and HTML-visible occurrences.
Zero subset-introduced gaps does NOT mean zero upstream gaps. System fallback is
required for the recorded rare characters/symbols, arbitrary personal notes and
external/future text. No Japanese variant is silently substituted or normalized.

--check fails for stale input/corpus/builder/font hashes, newly unsupported text,
and missing subset glyphs. Rebuild after editorial/source changes, then review
any change in upstreamUnsupported. QA negative fixtures run only in temporary
copies and do not modify site sources or existing font assets.
''', encoding='utf-8')
    return check(root, output, source_dir)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path)
    parser.add_argument('--repo-root', type=Path, default=ROOT)
    parser.add_argument('--output-dir', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args(argv)
    root = args.repo_root.resolve()
    output = args.output_dir.resolve() if args.output_dir else root / ASSET_PATH
    if args.check:
        check(root, output, args.source_dir)
    else:
        if not args.source_dir:
            parser.error('--source-dir is required for building (not for --check)')
        build(root, output, args.source_dir)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        print('FAIL: ' + str(error), file=sys.stderr)
        sys.exit(1)
