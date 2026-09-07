# PARKS: watch → context → watch again

Isolated second culture-experience prototype. Not connected to Production navigation; `/experiments/` remains excluded from Vercel delivery.

- Open `experiments/parks-screen-r1/index.html` only through an authorized HTTP preview of the repository root. Relative assets, the unchanged public video loader, Shelf and Thread links rely on the repository root.
- Do not remove `.vercelignore` exclusions or deploy to Production to make this testable.
- Two selectable official videos (PARKS trailer and a record of the park's centenary broadcast), one player at a time, three voluntary context disclosures, explicit stop, official film/park exits. Selecting never connects to the provider; opening the selected player requires an explicit click. No accounts, maps, storage, telemetry, video extraction or new player API.
- QA: `node qa/parks_screen_contract_check.js`. This is a DOM-host simulation, not visual/audio/network verification.
- Source trace, visual contract, limits and remaining gates: `../../docs/culture-experience-r2/parks-screen-r1.md` and `parks-media-provenance.json` in the same docs directory.

Public readiness remains HOLD pending real browser / playback / accessibility checks. User-confirmed context value is also a separate gate.
