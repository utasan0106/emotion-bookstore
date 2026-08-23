# P0 / P1 Hold List

## Counts

- P0 MUST FIX BEFORE RELEASE: **8**
- P1 SHOULD FIX BEFORE RELEASE: **5**

## Release disposition

`PRIVACY_RELEASE_ALIGNMENT_HOLD`

The code-grounded transmission audit is complete, but the current root
Privacy/Terms documents are not V3-exact: they mix V2 and future functionality,
describe Google Fonts and public-environment GA4 as active, omit current V3
official-site/Maps truth, and expose no V3 Legal links. Sprint05 is not
authorized to mutate Production/V2 Legal files or start Legal/Metadata work.

The accepted `MEASUREMENT_CONFIG_BLOCKED` state is not itself the HOLD reason.
The HOLD is the unresolved P0 disclosure/alignment list in
`PRIVACY_TERMS_EXACT_REDLINE_MAP.md`.

No P0 item was silently repaired in Product code.
