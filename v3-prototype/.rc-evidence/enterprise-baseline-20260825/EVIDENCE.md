# V3 Enterprise Baseline Closure — Evidence (2026-08-25)

Bounded presentation pass on the Visual System branch.
Start HEAD: `4af92c78258140fab2a264c59f41aec0817ca115` (= `codex/v3-visual-system-v1-20260825`)
Branch: `claude/v3-visual-enterprise-baseline-20260825`

## Scope (presentation only)

- Desktop Home recomposed as one static editorial cover (~1 viewport at 1440x900/1000):
  integrated logo, 「感情の先に、世界がある」, current supporting copy, はじめる / 選ばずに見る,
  quiet culture indication (本・映画・音楽・展示・場所・体験, non-navigational), compact Trust strip.
- Home “spec document” sections removed: 4 loop cards / large Trust modules / full 体験の流れ / full FAQ.
- 体験の流れ = independent internal screen (`12-experience-flow`), MENU-launched, History-integrated.
- よくある質問 = independent Help screen (`13-help-faq`), accessible accordion, no search (6 items).
- Header logo: transparent derivative of the approved horizontal lockup
  (`assets/brand/emotion_bookstore_horizontal_lockup_transparent.png`, deterministic background
  un-blend of the approved artwork — no redesign, no AI generation). No plate, optical sizing 36–48px.
- MENU: lighter professional panel (compact rows, divider between Product / guide destinations).
- Emotion Shelf: wizard chrome removed (STEP 1 / 1 / 3 / duplicated headings); 4×2 tiles complete
  within one principal viewport at 1200x800 / 1440x900 / 1440x1000; refined selected state
  (2px aqua keyline + check chip), hover polish.
- Zero state: compact deliberate panel (no giant empty card); copy unchanged.
- Text defects: 「感情の棚へ戻る」 and all stepbar back labels never wrap into multi-line pills.
- Focus: interactive-only `:focus-visible` (2px), no decorative outlines on programmatically
  focused headings; WCAG-visible keyboard focus retained.
- Video (S1B): poster-first stage → explicit click-to-load player in the same mount → same-surface
  editorial context. Activation, CSP, autoplay=0, and no-write semantics unchanged.
- Saved / Discovery / Detail / no-emotion: typography, spacing, density polish only.

## Product / presentation boundary

Unchanged: storage (store.js untouched), Interested schema, entrance-cue-ack-v1, finite 0/1/2/3,
no-force-fill, FIRST PULL, Practical Truth, Context semantics, Calendar/Action Destination,
GA4/analytics (no event changes; flow/faq screens emit no events), CSP, external network behavior
(first paint third-party requests = 0), editorial inventory, data.js, all JS modules other than
bounded app.js presentation/navigation changes.

## QA results

### Authority regression suite (verify/run_visual_system_regressions.js)
9/9 suites PASS — 332 assertions PASS, 0 FAIL (see `qa/authority-regression-enterprise-baseline.*`):
s1b_runtime, s1a_stale_review_regression, s1b_foundation, sprint03_interested,
interested_retrieval_b, action_destination, action_destination_runtime,
security_accessibility_release_hardening, a11y_responsive.

### Enterprise Baseline custom QA (17/17 PASS)
- first-paint third-party requests = 0 (Home and flow/faq navigation)
- mouse navigation paints no heading outline; keyboard focus outline >= 2px visible
- flow/faq History integration (browser back + stepbar back → entrance)
- Detail → back preserves Discovery context (counter/state intact)
- 「感情の棚へ戻る」 single-line
- video poster renders pre-activation with zero provider requests; explicit click loads player
- no horizontal overflow and >=44px touch targets on new screens at 320/390/430

### Viewports covered
Desktop 1200x800, 1440x900, 1440x1000; Mobile 320 sanity, 390x844, 430x932.
Surfaces: Home, MENU, Emotion Shelf, selected shelf, zero state, Discovery 1 (live) and 2/3
(QA fixture), Detail, Saved, 体験の流れ, よくある質問, no-emotion route, plan.

### Historical per-pass verifiers
All pinned per-pass verifiers (canonical_source_contract, ceo_visual_correction_source_contract,
final_ceo_visual_polish_source_contract, final_four_surface_source_contract, m03_w03_source_contract,
m02_m03_w02_final_residual_source_contract, w02_final_leaf_visual_source_contract,
release_muscle_01_regression, legal_metadata_alignment, seo_aio_release_hardening,
founder_visual_closure) already exited non-zero at Start HEAD `4af92c7` (they pin earlier branches /
audited file hashes / baseline git objects). This pass does not change that status and does not edit
any verifier. `release_closure_official_description`: 117/118 at Start HEAD and identical after.
`sprint05_privacy_external_transmission` references baseline commit `5e40791…` which does not exist
in the remote history (unrunnable in any checkout); its network truths are covered by
security_accessibility_release_hardening (source) plus the runtime first-paint = 0 checks above.

## Files

- `1440/` — Home, Emotion Shelf, zero state, Discovery, Detail, Help, Flow, Saved, MENU,
  no-emotion, 1200x800 and 1440x1000 variants, video poster/playing (QA fixture injection).
- `390/` — Home, MENU, Emotion Shelf, Discovery, Detail (+320/430 Home sanity).
- `compare/` — BEFORE (`4af92c7`) vs AFTER: desktop Home, desktop Emotion Shelf, desktop zero state.
- `qa/` — authority regression re-run output for this pass.
