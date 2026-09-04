# reference/ — VISUAL_CANONICAL bytes

`HOME_REFERENCE_853.png` = the Founder/HQ HOME image `文化のつながりを歩く街案内.png`
(853 × 1844 CSS px). Review artifact only. **Never referenced from runtime**;
this whole `experiments/` tree is excluded by `.vercelignore`.

## Status — present (HOME Asset Round 3, 2026-09-03)

| | |
|---|---|
| sha256 | `cc31aef9666dabf2f9a763f8948b67980860e970dba42df0b01ca0e383936625` |
| bytes | 2,197,522 |
| px | 853 × 1844, 8-bit RGB |
| supplied as | `home_round3_go_and_canonical.zip` with `SUPPLY_CHECKSUMS.json` (sha256 / size verified equal) and `ROUND3_GO_DECLARATION.txt` |

`REFERENCE_FILE_HOLD` (pass 1 / pass 2) is lifted by this file. Nothing was
reconstructed — these are the Founder/HQ bytes as attached.

## Run the true comparison

```sh
python3 experiments/home-visual-fidelity/tools/true_compare.py \
  --reference experiments/home-visual-fidelity/reference/HOME_REFERENCE_853.png \
  --current   experiments/home-visual-fidelity/asset-round-3/HOME_CURRENT_853_R3.png \
  --out       experiments/home-visual-fidelity
```

which writes `HOME_TRUE_SIDE_BY_SIDE_853.png` / `HOME_TRUE_OVERLAY_853.png` /
`HOME_TRUE_PIXEL_DIFF_853.png` and prints MAE per section. The current render
comes from `tools/capture_home_853.js` (853 × 1844, dsf 1, one viewport, platform
fonts verified over CDP).
