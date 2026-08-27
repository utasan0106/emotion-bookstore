# Media Localization Gate — HUMAN TEST ASSETS READY

Status: **GO for isolated Human Test media gate / NOT Production-approved**

On 2026-08-27, the exact source URLs were fetched by Google Slides and exported as same-origin Pilot assets because the local runtime cannot directly download external hosts. The export applies a max-2048px proportional derivative to the two large Commons JPEGs. This is intentional for the Human Test: it keeps the full frame, removes runtime hotlinks, reduces mobile payload, and preserves the actual object shown.

## Frozen runtime assets

- `assets/manuscript-cafe.png` — 640×905, 368,960 bytes
- `assets/hachiko.jpg` — 2048×1536, 353,928 bytes
- `assets/meguro-tapeworm.jpg` — 1363×2048, 258,119 bytes

See `MEDIA_LOCALIZATION_EVIDENCE.json` for SHA-256, exact source URLs/pages, rights basis, oldid where applicable, modification notes, and scope.

## Gate behavior

- `mediaPolicy='same-origin-localized'`.
- Participant mode may now render Objects only because all three local assets and evidence records exist.
- `pilot_check.js` and `media_validate.py` must both pass.
- A fresh browser QA must prove all 3 images decode, no overflow/spoiler/internal-note leak, dialog/focus behavior, and all six order permutations.
- A fresh official-operation check is still required immediately before each external Human Test cycle.

## Scope boundary

These runtime files are **Human Test derivatives, not Production media approval**. Do not copy them into main/Production without the later Production media/legal/quality gate.

The older `localize_media.py` remains a fail-closed direct-source build helper for a network-capable environment; it is not required for the current Human Test derivative set and should not be rerun blindly over the frozen assets.
