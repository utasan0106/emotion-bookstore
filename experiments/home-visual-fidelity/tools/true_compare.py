#!/usr/bin/env python3
"""TRUE pixel comparison — actual VISUAL_CANONICAL vs actual render.

Review tooling only. Not runtime. Requires Pillow + numpy.

    python3 experiments/home-visual-fidelity/tools/true_compare.py \
        --reference experiments/home-visual-fidelity/reference/HOME_REFERENCE_853.png \
        --current   experiments/home-visual-fidelity/HOME_CURRENT_853.png \
        --out       experiments/home-visual-fidelity

Writes HOME_TRUE_SIDE_BY_SIDE_853.png / HOME_TRUE_OVERLAY_853.png /
HOME_TRUE_PIXEL_DIFF_853.png (optionally with --suffix) and prints per-section MAE (0..255).

If the reference file is absent it prints REFERENCE_FILE_HOLD and exits 2
without writing anything. Nothing is ever synthesised to stand in for the
canonical.
"""
import argparse, os, sys
from PIL import Image, ImageChops, ImageDraw, ImageFont
import numpy as np

SECTIONS = [  # y ranges from HOME_VISUAL_CONTRACT.md §2
    ('HERO', 0, 617), ('街から入る', 617, 1030), ('作品から入る', 1030, 1262),
    ('いま辿れるスレッド', 1262, 1592), ('現実へ出る', 1592, 1844),
]

def same_size(ref, cur, width=853):
    """Scale both to `width` (keeping aspect) and pad the shorter one."""
    def fit(im):
        if im.width != width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        return im.convert('RGB')
    ref, cur = fit(ref), fit(cur)
    h = max(ref.height, cur.height)
    def pad(im):
        if im.height == h: return im
        out = Image.new('RGB', (width, h), (255, 0, 255))  # magenta = no data
        out.paste(im, (0, 0)); return out
    return pad(ref), pad(cur)

def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, im.width, 28], fill=(0, 0, 0))
    d.text((8, 7), text, fill=(255, 255, 255))
    return im

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--reference', required=True)
    ap.add_argument('--current', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--suffix', default='', help="appended before .png, e.g. _R3_FINAL")
    a = ap.parse_args()
    if not os.path.exists(a.reference):
        print('REFERENCE_FILE_HOLD: canonical PNG not on disk at', a.reference)
        print('Lift: place the Founder/HQ canonical bytes there (no reconstruction).')
        return 2
    if not os.path.exists(a.current):
        print('CURRENT_MISSING:', a.current); return 3
    ref, cur = same_size(Image.open(a.reference), Image.open(a.current))
    os.makedirs(a.out, exist_ok=True)

    gap = 20
    sbs = Image.new('RGB', (ref.width * 2 + gap, ref.height + 32), (24, 24, 24))
    sbs.paste(label(ref.copy(), 'VISUAL_CANONICAL'), (0, 32))
    sbs.paste(label(cur.copy(), 'CURRENT'), (ref.width + gap, 32))
    sbs.save(os.path.join(a.out, f'HOME_TRUE_SIDE_BY_SIDE_853{a.suffix}.png'))

    Image.blend(ref, cur, 0.5).save(os.path.join(a.out, f'HOME_TRUE_OVERLAY_853{a.suffix}.png'))

    diff = ImageChops.difference(ref, cur)
    arr = np.asarray(diff).astype(np.float32)
    mae = float(arr.mean())
    amp = np.clip(arr * 3, 0, 255).astype(np.uint8)  # amplify for the eye
    Image.fromarray(amp).save(os.path.join(a.out, f'HOME_TRUE_PIXEL_DIFF_853{a.suffix}.png'))

    print(f'size={ref.width}x{ref.height} overall_MAE={mae:.1f}/255')
    for name, y0, y1 in SECTIONS:
        y1 = min(y1, ref.height)
        if y0 >= ref.height: break
        print(f'  {name:<12} y{y0}-{y1}: MAE={arr[y0:y1].mean():.1f}')
    return 0

if __name__ == '__main__':
    sys.exit(main())
