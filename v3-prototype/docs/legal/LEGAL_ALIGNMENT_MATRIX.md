# V3 Legal Alignment Matrix

Authority: Sprint05 `PRIVACY_TERMS_EXACT_REDLINE_MAP.md`
Implementation base: `01673bfbf931ede971e5205b54149248346094e0`

| Item | File / surface | Exact implementation | Verification |
| --- | --- | --- | --- |
| P0-01 | `privacy.html`, `terms.html` | V3 Release applicability and V2/future boundary stated | Dedicated verifier checks both pages |
| P0-02 | `privacy.html` §5, `terms.html` §6 | GA4 inactive; destination unset; events not externally sent | Adapter remains `MEASUREMENT_CONFIG_BLOCKED` |
| P0-03 | `privacy.html` §3 | Self-hosted fonts; no request to Google Fonts hosts | All first-paint references are relative |
| P0-04 | `privacy.html` §6 | Books/iTunes/weather/geolocation/external AI/external-search recommendation absent | Runtime forbidden-primitive scan |
| P0-05 | `privacy.html` §4 | Exact current rows: hosting, `fng.or.jp`, `www.google.com`, blocked GA4, inactive Editorial video | Matrix row/host assertions |
| P0-06 | `terms.html` §2 | Human-approved finite 0–3 Outing semantics; no diagnosis or external API fill | Product Semantics A regression |
| P0-07 | `terms.html` §5 | Same-origin delivery is constant; official/Maps only after click; inactive services named accurately | Legal verifier and Sprint05 network verifier |
| P0-08 | `index.html` | Quiet same-origin `プライバシー` / `利用規約` footer links | Link, focus, 44px, responsive runtime checks |
| P1-01 | Entrance Trust | Bounded headings: `登録不要・記録は非公開`, `記録を外部AIへ送りません` | Exact-copy verifier |
| P1-02 | Existing FAQ | Current V3 local-record, destination-policy, external-AI, no-geolocation wording | Exact-copy verifier; no FAQ added |
| P1-03 | Both Legal pages | Current session/Interested/Plan/Trace storage, deletion/device loss, no recovery/cloud sync | Legal content assertions |
| P1-04 | Both Legal pages | Destination policy after explicit action; future video remains inactive and separately gated | Legal content assertions |
| P1-05 | `privacy.html` §3 | Ordinary delivery metadata separated from analytics; private state not appended to URLs | Legal content + runtime scan |

## Closure

- P0 closed: **8 / 8**
- P0 remaining: **0**
- P1 closed: **5 / 5**
- P1 N/A: **0**
- P1 remaining: **0**

Root V2 `privacy.html` and `terms.html` remain byte-identical to the base.
