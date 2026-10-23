#!/usr/bin/python3
"""Offline static checks for the integrated C3 culture routes.

No browser, server, network, installation or source-file modification.
Uses the same checkout only; writes a local QA report, not product source.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote, parse_qs
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
OVERLAY = C3 = BASE = ROOT
REPORT = ROOT / 'qa/artifacts/editorial-c3-culture-static.json'
DIRECTORY = Path('qa/editorial-study-c3')
PAGES = ['film-and-books.html', 'outings.html']
HTML = PAGES + ['home-culture-section.html']
CSS = ['culture-routes.css', 'home-culture-section.css']
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())

class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.text = []
        self.stack = []
        self.errors = []
        self.ids = set()
        self.feed(text)
        self.close()
        if self.stack:
            self.errors.append('unclosed elements: ' + repr(self.stack))

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        self.tags.append((tag, data))
        if data.get('id'):
            if data['id'] in self.ids:
                self.errors.append('duplicate id: ' + data['id'])
            self.ids.add(data['id'])
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            self.errors.append('closing void element: ' + tag)
        elif not self.stack or self.stack[-1] != tag:
            self.errors.append('mismatched element: ' + tag)
        else:
            self.stack.pop()

    def handle_data(self, data):
        self.text.append(data)

    def corpus(self):
        strings = list(self.text)
        for tag, attrs in self.tags:
            strings += [attrs[k] for k in ('alt', 'aria-label', 'title') if attrs.get(k)]
        return ''.join(strings)

def resolve(path):
    relative = Path(path.lstrip('/'))
    for source in (OVERLAY, C3, BASE):
        candidate = source / relative
        if candidate.is_dir():
            candidate = candidate / 'index.html'
        if candidate.is_file():
            return candidate
    return None

errors = []
links = []
images = []
corpus = ''
existing_sources = '\n'.join((BASE / name).read_text() for name in (
    'works.html', 'work-film.html', 'thread_content.js',
    'qa/editorial-preview-v4/outings.html', 'discover/index.html'
))
for filename in HTML:
    relpath = DIRECTORY / filename
    text = (OVERLAY / relpath).read_text()
    doc = Document(text)
    errors += [filename + ': ' + problem for problem in doc.errors]
    corpus += doc.corpus()
    if filename in PAGES:
        assert sum(tag == 'h1' for tag, _ in doc.tags) == 1
        assert sum(tag == 'main' for tag, _ in doc.tags) == 1
        assert ('html', {'lang': 'ja'}) in doc.tags
        assert any(tag == 'meta' and attrs.get('name') == 'robots' and attrs.get('content') == 'noindex,nofollow' for tag, attrs in doc.tags)
        assert any(tag == 'a' and attrs.get('href') == '/discover/' for tag, attrs in doc.tags)
        assert any(tag == 'a' and attrs.get('href') == '/outings/' for tag, attrs in doc.tags)
        assert not any(tag in ('script', 'iframe', 'form', 'input', 'textarea', 'button') for tag, _ in doc.tags)
    for tag, attrs in doc.tags:
        for key in ('href', 'src'):
            if key not in attrs:
                continue
            value = attrs[key]
            url = urlsplit(value)
            if url.scheme or url.netloc:
                links.append({'page': filename, 'url': value, 'kind': 'external-existing-source'})
                if value not in existing_sources:
                    errors.append(filename + ': external URL not present in supplied sources: ' + value)
                if tag in ('img', 'iframe', 'script', 'link'):
                    errors.append(filename + ': external eager resource: ' + value)
                continue
            dest = unquote(url.path)
            if not dest:
                dest = '/' + str(relpath)
            elif not dest.startswith('/'):
                dest = '/' + str(DIRECTORY / dest)
            target = resolve(dest)
            links.append({'page': filename, 'url': value, 'kind': 'local', 'resolved': str(target) if target else None})
            if not target:
                errors.append(filename + ': missing local target: ' + value)
            elif url.fragment and target.suffix == '.html':
                target_doc = Document(target.read_text())
                if url.fragment not in target_doc.ids:
                    errors.append(filename + ': missing fragment: ' + value)
            if url.path == '/thread.html':
                thread = parse_qs(url.query).get('thread', [None])[0]
                if thread not in ('morisaki-book', 'morisaki-film'):
                    errors.append(filename + ': unknown thread: ' + value)
                elif "threadId: '" + thread + "'" not in (BASE / 'thread_content.js').read_text():
                    errors.append(filename + ': missing source thread: ' + thread)
        if tag == 'img':
            for attr in ('alt', 'width', 'height'):
                if attr not in attrs:
                    errors.append(filename + ': image missing ' + attr)
            path = resolve(attrs['src'])
            images.append({'page': filename, 'src': attrs['src'], 'sha256': hashlib.sha256(path.read_bytes()).hexdigest() if path else None})

# Conservative CSS delimiter/whitespace checks, not a browser CSS-computation test.
for filename in CSS:
    text = (OVERLAY / DIRECTORY / filename).read_text()
    stripped = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    if stripped.count('{') != stripped.count('}'):
        errors.append(filename + ': unbalanced CSS braces')
    if re.search(r'https?://|url\(', stripped):
        errors.append(filename + ': unexpected resource URL')
    if 'font-family' in stripped or 'font-weight: 600' in stripped:
        errors.append(filename + ': unexpected font override')

for filename in HTML + CSS:
    text = (OVERLAY / DIRECTORY / filename).read_text()
    for no, line in enumerate(text.splitlines(), 1):
        if line.rstrip() != line:
            errors.append(f'{filename}:{no}: trailing whitespace')

before = json.loads((ROOT / 'qa/editorial-c3-culture-source.json').read_text())
snapshots = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest for name, digest in before.items()}
errors += [name + ': frozen source hash changed' for name, unchanged in snapshots.items() if not unchanged]

# Both actual same-origin union faces must cover all culture content and metadata.
from fontTools.ttLib import TTFont
characters = {c for c in corpus if not c.isspace()}
fonts = {}
missing = {}
for weight in (400, 700):
    path = C3 / DIRECTORY / f'assets/deep-zen-kaku-gothic-{weight}.woff2'
    font = TTFont(path)
    coverage = set(font.getBestCmap())
    fonts[str(weight)] = {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'codepoints': len(coverage)}
    missing[str(weight)] = ''.join(sorted((c for c in characters if ord(c) not in coverage), key=ord))
    if missing[str(weight)]:
        errors.append(f'Zen {weight}: missing characters: ' + missing[str(weight)])

home = (ROOT / DIRECTORY / 'index.html').read_text()
fragment = (ROOT / DIRECTORY / 'home-culture-section.html').read_text().strip()
fragment = re.sub(r'<!--.*?-->', '', fragment, flags=re.S).strip()
if re.sub(r'>\s+<', '><', fragment) not in re.sub(r'>\s+<', '><', home):
    errors.append('Homepage culture fragment is missing or diverged')
report = {
    'static_pass': not errors,
    'html_files': HTML,
    'css_files': CSS,
    'errors': errors,
    'link_count': len(links),
    'external_links_live_checked': False,
    'links': links,
    'images': images,
    'source_snapshot_unchanged': snapshots,
    'font_union_rebuild_required': any(missing.values()),
    'fonts': fonts,
    'missing_characters': missing,
    'browser_or_localhost_run': False,
    'browser_note': 'Not attempted. Native Chromium/localhost execution was denied earlier. No workaround used.',
    'nonimplemented': ['No in-page film playback', 'No route map or location request', 'No reservations', 'No current screening, stock, seat, or opening-hour verification', 'No rotating-city scheduler or personalisation'],
}
REPORT.parent.mkdir(parents=True, exist_ok=True)
REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'static_pass': not errors, 'errors': errors, 'link_count': len(links), 'source_snapshot_unchanged': all(snapshots.values()), 'missing_characters': {weight: len(chars) for weight, chars in missing.items()}, 'browser_verified': False}, ensure_ascii=False, indent=2))
sys.exit(bool(errors))
