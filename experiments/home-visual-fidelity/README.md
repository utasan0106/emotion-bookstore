# HOME VISUAL FIDELITY — 853px first pass

Review artifacts only. **Not runtime.** Excluded from the delivery surface via
`/experiments/` in `.vercelignore`.

| File | What it is |
|---|---|
| `HOME_VISUAL_CONTRACT.md` | Every value measured off the VISUAL_CANONICAL, split OBSERVED / INFERRED / UNKNOWN |
| `HOME_DIFFERENCE_INVENTORY.md` | BLOCKER / MAJOR / MINOR classification, the 3 correction cycles, and the holds |
| `HOME_ASSET_INVENTORY.md` | Provenance and rights for every file in `assets/`, and which canonical slot each can serve |
| `HOME_BASELINE_853.png` | `origin/main` HOME at 853 px — 853 × 3788 |
| `HOME_CURRENT_853.png` | This branch at 853 px — 853 × 1844 |
| `HOME_SIDE_BY_SIDE_853.png` | Baseline and current, same scale, same width |
| `HOME_OVERLAY_DIFF_853.png` | Current render with the Visual Contract's target rectangles drawn on it |

## `HOME_REFERENCE_853.png` is deliberately absent

The VISUAL_CANONICAL was supplied as a **conversation attachment**. It is not in
the repository and not on the capture host, so there are no pixel bytes to write
out. Nothing was generated, reconstructed, or approximated to stand in for it —
a fabricated reference would make every downstream comparison a lie.

Two required artifacts are affected:

- `HOME_REFERENCE_853.png` — cannot be written.
- `HOME_OVERLAY_DIFF_853.png` — cannot be a true reference image-diff. What is here
  instead is the render with the contract's measured target rectangles overlaid, so
  a human can put it beside the canonical and check each target by eye.

**To lift this hold:** commit the canonical PNG to this folder as
`HOME_REFERENCE_853.png` and re-run the loop; the pixel overlay becomes possible
immediately.

## How to reproduce the capture

```sh
python3 -m http.server 8899 --bind 127.0.0.1     # from the repo root
```

Then render at viewport 853 × 1844, `deviceScaleFactor: 1`, in a single viewport —
**not** a scrolling full-page capture. Chromium's full-page stitching intermittently
drops decoded images from the lower part of a long page; two photographs in
現実へ出る came back blank that way and were fine on re-capture. Size the viewport to
`document.documentElement.scrollHeight` first, then screenshot.

## Font gate

The product ships a system font stack targeting macOS / iOS / Windows / Android and
loads no webfont. A stock Linux capture host has no Japanese Mincho, so
`document.fonts.check` lies (it returns `true` for any resolvable generic) and
Chromium silently rendered every Japanese glyph in **WenQuanYi Zen Hei**, a Chinese
sans.

Verified instead with CDP `CSS.getPlatformFontsForNode`, which reports the family
actually used to rasterise. `/etc/fonts/local.conf` on the capture host maps the
stack's declared families onto the packaged Noto CJK faces and rejects WenQuanYi
for Japanese. This changes the **capture host only** — no product CSS was touched.

Result: `--serif` elements rasterise as **Noto Serif CJK JP** and `--sans` as
**Noto Sans CJK JP**. Both are named members of the shipped stacks (Google
publishes them as "Noto Serif JP" / "Noto Sans JP"), so this is a stack member, not
a fallback.

## Static gate

```sh
node qa/home_canonical_check.js
```

Verifies the new canonical contract: 5 sections in order, exact core copy, the 4
`.shelf-entry` links GA4 depends on, the site-menu hooks, no dead anchors, every
`ROUTE_HOLD` element non-navigating, zero external hosts, zero iframes, every asset
present on disk, and the HOME CSS block fully scoped inside `.home-canonical`.

It does **not** replace `qa/release_check.js`. That gate encodes the previous HOME
and now reports 15 failures against it — which of those the canonical supersedes is
a Founder/HQ decision, so it was left untouched rather than rewritten to match this
implementation.
