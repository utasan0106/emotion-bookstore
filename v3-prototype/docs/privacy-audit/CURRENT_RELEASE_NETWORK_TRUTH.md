# Current V3 Release Network Truth

## Current first paint

The browser requests the V3 document and relative static resources from the
same deployment origin. CSS, JavaScript, images, and Noto JP fonts are served
from local `v3-prototype/**` paths. V3 adds no third-party script, font, iframe,
preconnect, prefetch, API call, analytics request, external AI request, or
geolocation call on first paint.

The hosting provider can receive ordinary transport metadata needed to serve
the site, such as IP address, requested path, User-Agent, timing, and other HTTP
headers. Product state is not written to the URL. A caller-supplied query string
would be part of the initial hosting request, but V3 does not put private state
in a query string or History URL.

V3 does not register a service worker. The repository still contains a legacy
root-scope `sw.js`; if a browser already has that worker installed from another
same-origin page, it may handle the browser's existing same-origin request with
a network-first `fetch(event.request)` and cache fallback. This is conditional
same-origin hosting/cache behavior, not a V3 third-party sender. The worker adds
no external host and no V3 Product identifier or private content.

## Current explicit external actions

Each of the eight reachable real Outings can open its record-specific verified
official HTTPS page and a Google Maps directions URL containing only the
approved public destination address. Both are explicit new-tab actions with
`noopener,noreferrer`. Maps has no `origin` parameter and V3 never requests the
user's geolocation.

After the user has saved a local Plan, an additional explicit
`Googleカレンダーに追加` action can open `calendar.google.com` with an event
creation URL. V3 builds that URL locally from the public Experience title,
user-selected date/time, approved public address, official URL, and a bounded
public description. It does not open automatically, make a background request,
connect an account, or sync. Private body/title/photo content does not exist in
V3 and is not transmitted.

Destinations receive normal navigation metadata under their own policies.
EXP_001 has an approved `e-comi.shogakukan.co.jp` destination in the Registry,
but it is not in the current reachable Outing deck and causes no current runtime
transmission.

## Current analytics

Sprint04's adapter has no measurement destination or sender. All runtime event
calls fail closed with `MEASUREMENT_CONFIG_BLOCKED`; analytics outbound hosts
and requests are zero. Historical V2 configuration is not V3 authority.

## Current local storage boundary

`v3-prototype-db` stores Product state in the `state` object store under the
existing `session` and `interested-experiences-v1` keys. Selected shelf/deck,
Interested IDs/timestamps, Plan data, and predefined Trace facets stay in
IndexedDB. The Interested schema is unchanged. A standalone versioned
`entrance-cue-ack-v1` localStorage marker contains only `version` and
`acknowledgedSavedAt`, so the latest save can appear on the next Entrance once.
The retired `v3-interested-entrance-cue-v1` marker is discarded without reading
or migrating its data. The current marker contains no item identity, title,
description, URL, or private text and has no sender. There is no free-text,
private title, or photo input in V3.

## Future shell, not current traffic

The public Editorial registry is empty. No Editorial card, link, media request,
or iframe can be active now. A later human-approved READY record may open a
verified official link after click. An approved embed may request only a strict
YouTube privacy-enhanced or Vimeo player host/path after click. Unknown rights,
unknown embed status, invalid host/path, or missing approval fail closed.

No current V3 runtime path implements X/share, weather, book/music search APIs,
external AI, geolocation, login, cloud sync, Creator Support, Marketplace,
advertising, payment, or Memory Print.
