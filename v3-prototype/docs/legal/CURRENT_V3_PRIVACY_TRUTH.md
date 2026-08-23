# Current V3 Privacy Truth

## Browser-local Product state

- Current `session` state covers selected shelf/flow, Plan, and Trace facets.
- `interested-experiences-v1` covers Interested IDs/timestamps.
- Storage is IndexedDB in the current browser; cloud sync is absent.
- Site-data deletion or device/browser change can remove access.
- The operator has no recovery copy.
- Private body, private title, and photo inputs do not exist in current V3.

## Network boundary

- First-paint third-party requests: **0**.
- Same-origin hosting receives ordinary HTTPS delivery metadata.
- V3 does not append private Product state to URLs.
- Fonts are self-hosted.
- Current explicit third-party navigation is limited to `fng.or.jp` and
  `www.google.com`, after the corresponding user action.
- Maps receives a public destination only; no origin/current-location parameter
  and no geolocation acquisition.

## Analytics / Editorial

- GA4 destination/sender/host: absent.
- Runtime analytics state: `MEASUREMENT_CONFIG_BLOCKED`.
- Active Editorial records: 0.
- Current provider requests: 0.
- Future content or measurement is not authorized by these statements; it
  requires separate approval and an update before activation.

## Private transmission result

`PRIVATE USER-AUTHORED CONTENT EXTERNAL TRANSMISSION = 0`
