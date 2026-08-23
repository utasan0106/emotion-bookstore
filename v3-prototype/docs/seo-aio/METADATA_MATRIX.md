# V3 SEO / AIO Metadata Matrix

Authority: `V3_SEO_AIO_RELEASE_HARDENING_INSTRUCTION_READY_20260823`

Canonical origin authority: existing Production root `sitemap.xml` and `guide.html` use `https://emotion-bookstore.vercel.app/`. V3 stays at its existing repository path, `/v3-prototype/`. Preview deployment URLs are not canonicalized.

| Page | Title | Description | Canonical | Robots | OGP / Twitter |
|---|---|---|---|---|---|
| V3 entrance | `みんなの感情書店 V3｜感情の棚から、次に触れるものへ` | Current brand line, Human Editorial, finite 0–3 and real-world action; explicitly no diagnosis/personalized recommendation | `https://emotion-bookstore.vercel.app/v3-prototype/` | `index, follow, max-image-preview:large` | Page-specific title/description, `website`, `ja_JP`, approved local V3 world visual, `summary_large_image` |
| V3 Privacy | `プライバシーポリシー \| みんなの感情書店 V3` | Current local-storage/network/measurement truth | `https://emotion-bookstore.vercel.app/v3-prototype/privacy.html` | `noindex, follow` | Page-specific title/description, `website`, `ja_JP`, `summary` |
| V3 Terms | `利用規約 \| みんなの感情書店 V3` | Current V3 experience/storage/external-service terms | `https://emotion-bookstore.vercel.app/v3-prototype/terms.html` | `noindex, follow` | Page-specific title/description, `website`, `ja_JP`, `summary` |

## Indexability decision

- The V3 entrance is the public search entry and is indexable.
- Privacy and Terms remain discoverable through same-origin links and followable by crawlers, but are `noindex` to avoid treating legal utility pages as search landing pages.
- No root V2 sitemap, robots, Legal page or Production configuration is changed.

## Semantic landmark decision

- Existing `header`, `nav`, dynamic `main`, and `footer` landmarks remain.
- The rendered entrance already exposes the visible brand line as its `h1`.
- Legal pages retain one visible `h1` and numbered `h2` sections.
- No hidden SEO text, keyword block or duplicate heading is added.
