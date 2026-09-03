# reference/ — where the VISUAL_CANONICAL bytes go

`HOME_REFERENCE_853.png` = the Founder/HQ HOME image `文化のつながりを歩く街案内.png`
(853 × 1844 CSS px). Review artifact only. **Never referenced from runtime**;
this whole `experiments/` tree is excluded by `.vercelignore`.

It is not in this folder because the canonical reached the implementer only as
an inline conversation image, which has no file bytes on the session host or in
the user's Drive. Nothing was reconstructed to stand in for it.

To lift `REFERENCE_FILE_HOLD`: commit the PNG here under that exact name, then

```sh
python3 experiments/home-visual-fidelity/tools/true_compare.py \
  --reference experiments/home-visual-fidelity/reference/HOME_REFERENCE_853.png \
  --current   experiments/home-visual-fidelity/HOME_CURRENT_853.png \
  --out       experiments/home-visual-fidelity
```

which writes the true side-by-side / overlay / pixel diff and prints MAE per section.
