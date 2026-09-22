# Public Surface & Typography Rules

Status: Canonical for HOME and public catalogue/city/article surfaces
Updated: 2026-09-22

## 1. Surface information rule

The visible surface is for discovery and reading, not for rights administration.

- Show: place/work/event name, short editorial context, date when it changes the user's decision, primary action.
- Do not show directly under imagery: author/photographer credit, license name, source URL, acquisition note, “not a cover/still/thumbnail/exhibition photo” disclaimers.
- Put source, photographer, license, source URL, capture/acquisition date, transformation details and rights notes in Credits / source details.
- A visible image caption is allowed only when it adds content meaning that cannot be understood from the surrounding label. Keep it short (for example, “会場風景” or “清澄庭園”). Do not repeat rights metadata.
- Images used on key public surfaces should be same-origin whenever possible. External source pages are provenance, not runtime image hosts.

## 2. Font families

Two families only on canonical public surfaces.

- Display / editorial headings: `EB Display` (Shippori Mincho 500), with Japanese Mincho fallbacks.
- Body / UI / metadata: `EB Reading` (Zen Kaku Gothic 400/500), with Japanese Gothic/system fallbacks.
- Do not introduce a third font family for ordinary headings, labels, buttons or body text.

## 3. Type scale

Canonical CSS tokens live in `page-nav.css`.

| Role | Token | Size |
|---|---|---|
| Tiny caption only when needed | `--type-xs` | 12px |
| Metadata / eyebrow / dates | `--type-meta` | 13px |
| UI / navigation / text links | `--type-ui` | 14px |
| Action text | `--type-action` | 15px |
| Body | `--type-body` | 16px |
| Long-form lead | `--type-lead` | 17px |
| Card title | `--type-card-title` | 22px |
| Section title | `--type-section-title` | 24px |
| Page title | `--type-page-title` | responsive 28–40px |

Do not create new arbitrary sizes for ordinary public content without a documented reason.

## 4. Line-height

- Tight display: `--leading-tight` = 1.45
- Heading: `--leading-heading` = 1.55
- Body: `--leading-body` = 1.85
- Long-form reading: `--leading-reading` = 1.95

## 5. Hierarchy

1. Page title — Display font / page-title token.
2. Section title — Display font / section-title token.
3. Card title — Display font / card-title token.
4. Body/editorial copy — Reading font / body token.
5. UI/navigation — Reading font / UI token.
6. Metadata/source-status labels — Reading font / metadata token.
7. Rights/source details — Credits/source section, not the main visual surface.

## 6. Exceptions

Specialized shelf compositions and archival/experimental screens may keep their approved visual grammar until they are explicitly migrated. New HOME, city, catalogue, article and event work must follow this rule by default.
