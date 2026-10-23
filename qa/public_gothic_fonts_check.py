#!/usr/bin/python3
"""Offline coverage/hash negative fixtures; optional deterministic second build.

/usr/bin/python3 qa/public_gothic_fonts_check.py
/usr/bin/python3 qa/public_gothic_fonts_check.py --source-dir /path/to/official/ttfs
All mutations happen in disposable temporary copies, never site source files.
"""
import argparse
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import sys
sys.dont_write_bytecode = True
import tempfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('public_fonts', ROOT / 'tools/build-public-gothic-fonts.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def expect_failure(label, function, expected):
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            function()
    except (ValueError, OSError) as exc:
        if expected not in str(exc):
            raise AssertionError(f'{label}: wrong failure: {exc}') from exc
        print('PASS negative: ' + label)
    else:
        raise AssertionError(label + ': invalid fixture passed')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path)
    args = parser.parse_args()
    assets = ROOT / builder.ASSET_PATH
    sources = builder.check(ROOT, assets, args.source_dir)
    corpus = json.loads((assets / 'corpus-manifest.json').read_text('utf-8'))
    assert corpus['deliveredHtmlCount'] == len(corpus['deliveredHtml'])
    assert all(not p.startswith(('qa/', 'archive/', 'docs/', 'experiments/')) for p in corpus['deliveredHtml'])
    assert 'v3-prototype/tokyo-pilot-01/index.html' in corpus['deliveredHtml']
    assert 'v3-prototype/index.html' not in corpus['deliveredHtml']
    assert len([p for p in corpus['deliveredHtml'] if p.startswith('v3-prototype/')]) == 6
    runtime = {r['path'] for r in corpus['inputs'] if r['kind'] == 'linked-runtime-superset'}
    for name in ('release.js', 'release_content.js', 'outings/events-data.js',
                 'atlas/data/runtime-spatial.json', 'atlas/data/koenji-thread.json'):
        assert name in runtime, name + ' absent from actual runtime corpus'
    assert any(name.endswith('.geojson') for name in runtime)
    assert builder.decoded(r'&#x65E5;\u672c\u{8A9E}\uD83D\uDE00\x41') == '日本語😀A'
    print('PASS: delivery exclusions, 6 public v3 pages, runtime JSON closure, entity/Unicode decoding')

    with tempfile.TemporaryDirectory(prefix='public-gothic-font-qa-') as temp:
        fixture = Path(temp) / 'repo'
        fixture.mkdir()
        for record in corpus['inputs']:
            relative = record['path']
            (fixture / relative).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / relative, fixture / relative)
        shutil.copyfile(ROOT / '.vercelignore', fixture / '.vercelignore')
        dest = fixture / builder.ASSET_PATH
        shutil.copytree(assets, dest)
        with contextlib.redirect_stdout(io.StringIO()):
            builder.check(fixture, dest)
        print('PASS: fixture without .git reproduces exact corpus and audit')

        target = fixture / 'works.html'
        original = target.read_bytes()
        target.write_bytes(original + b'\n<!-- stale source hash fixture -->\n')
        expect_failure('stale source hash (even unchanged visible text)', lambda: builder.check(fixture, dest), 'Stale corpus manifest')
        target.write_bytes(original)

        target.write_text(original.decode() + '\n<p>\U0001f9ea</p>\n', encoding='utf-8')
        expect_failure('new upstream-unsupported visible character', lambda: builder.check(fixture, dest), 'Stale corpus manifest')
        target.write_bytes(original)

        new_page = fixture / 'font-fixture-new-page.html'
        new_page.write_text('<!doctype html><p>新しい公開ページ</p>', encoding='utf-8')
        expect_failure('new delivered page cannot bypass corpus', lambda: builder.check(fixture, dest), 'Stale corpus manifest')
        new_page.unlink()

        manifest = dest / 'sources.json'
        original_manifest = manifest.read_bytes()
        bad_hash = json.loads(original_manifest)
        bad_hash['fonts'][0]['outputSha256'] = '0' * 64
        manifest.write_bytes(builder.encoded(bad_hash))
        expect_failure('stale output hash', lambda: builder.check(fixture, dest), 'output hash')
        manifest.write_bytes(original_manifest)

        # Delete a supported Japanese cmap entry while updating its output hash.
        # Coverage must detect the missing glyph independently of hash checking.
        font_path = dest / sources['fonts'][0]['output']
        font_bytes = font_path.read_bytes()
        font = builder.TTFont(font_path, recalcTimestamp=False)
        victim = ord('日')
        assert victim in font.getBestCmap()
        for table in font['cmap'].tables:
            table.cmap.pop(victim, None)
        font.save(font_path)
        changed = json.loads(original_manifest)
        changed['fonts'][0]['outputSha256'] = builder.digest(font_path.read_bytes())
        manifest.write_bytes(builder.encoded(changed))
        expect_failure('missing Japanese glyph despite refreshed output hash', lambda: builder.check(fixture, dest), 'Subset glyph gaps')
        font_path.write_bytes(font_bytes)
        manifest.write_bytes(original_manifest)

        # A stale unsupported allowlist cannot silently excuse new text, even
        # if somebody refreshes the corpus hashes without rebuilding the fonts.
        target.write_text(original.decode() + '\n<p>\U0001f9ea</p>\n', encoding='utf-8')
        refreshed, _ = builder.collect(fixture)
        (dest / 'corpus-manifest.json').write_bytes(builder.encoded(refreshed))
        wanted = set(refreshed['requiredCodepoints']) | (set(refreshed['reservedKanaCodepoints']) & set(sources['upstreamCodepoints']))
        (dest / 'corpus.txt').write_text(''.join(map(chr, sorted(wanted))) + '\n', encoding='utf-8')
        changed = json.loads(original_manifest)
        changed['corpusManifestSha256'] = builder.digest(builder.encoded(refreshed))
        manifest.write_bytes(builder.encoded(changed))
        expect_failure('new unsupported character with manually refreshed corpus hashes', lambda: builder.check(fixture, dest), 'coverage document')

        if args.source_dir:
            second = Path(temp) / 'second-build'
            with contextlib.redirect_stdout(io.StringIO()):
                builder.build(ROOT, second, args.source_dir)
            names = sorted(p.name for p in assets.iterdir() if p.is_file())
            assert names == sorted(p.name for p in second.iterdir() if p.is_file())
            for name in names:
                assert (assets / name).read_bytes() == (second / name).read_bytes(), 'Non-deterministic second build: ' + name
            print('PASS: independent offline second build is byte-identical for all ' + str(len(names)) + ' assets')
            for item in sources['fonts']:
                print(item['output'] + ' SHA-256 ' + item['outputSha256'])
        else:
            print('NOTE: second-build comparison requires --source-dir; coverage and all negative fixtures ran')
    print('PASS: public Gothic font QA complete')


if __name__ == '__main__':
    main()
