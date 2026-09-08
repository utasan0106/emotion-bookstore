#!/usr/bin/env python3
"""Build same-origin WOFF2 subsets from the licensed, hash-locked upstream fonts.

Usage: python3 tools/build-webfonts.py --source-dir ../font-source
       python3 tools/build-webfonts.py --check
Requires fontTools[woff]. Unknown text in personal notes uses the system fallback.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets/fonts'
EXCLUDE = ('qa/', 'tools/', 'docs/', 'experiments/', 'archive/', 'v3-prototype/', 'visual-refit-v2-prototype/')

def characters():
    chars = set(chr(i) for i in range(32, 127))
    chars.update(chr(i) for i in range(0x3000, 0x3100))
    for name in subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT, text=True).split('\0'):
        p = ROOT / name
        if p.suffix not in ('.html', '.js', '.json') or name.startswith(EXCLUDE):
            continue
        text = p.read_text(encoding='utf-8')
        chars.update(text)
        chars.update(chr(int(x, 16)) for x in re.findall(r'\\u([0-9a-fA-F]{4})', text))
    return {ord(c) for c in chars if ord(c) >= 32}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source-dir', type=Path)
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    manifest = json.loads((DEST / 'sources.json').read_text())
    wanted = characters()
    for item in manifest['fonts']:
        output = DEST / item['output']
        if not args.check:
            if not args.source_dir:
                ap.error('--source-dir is required to build')
            source = args.source_dir / item['sourceFile']
            assert hashlib.sha256(source.read_bytes()).hexdigest() == item['sha256'], 'Upstream font changed'
            font = TTFont(source)
            item['upstreamMissing'] = sorted(wanted - set(font.getBestCmap()))
            options = subset.Options()
            options.flavor = 'woff2'
            options.layout_features = ['palt', 'kern', 'liga', 'locl']
            options.name_IDs = ['*']
            options.name_legacy = True
            sub = subset.Subsetter(options=options)
            sub.populate(unicodes=wanted)
            sub.subset(font)
            font.flavor = 'woff2'
            font.save(output)
        font = TTFont(output)
        missing = wanted - set(font.getBestCmap())
        # Emoji, icons and historic/non-Japanese characters may use system fallback.
        missing_ja = sorted(c for c in missing - set(item.get('upstreamMissing', [])) if 0x3041 <= c <= 0x3096 or 0x30A1 <= c <= 0x30FA or 0x4E00 <= c <= 0x9FFF)
        assert not missing_ja, f'{output.name}: rebuild for missing Japanese glyphs {missing_ja}'
        print(f'{output.name}: {output.stat().st_size:,} bytes; no newly missing Japanese glyphs; upstream-only gaps use the system fallback')
    if not args.check:
        (DEST / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
