# V3 Analytics Measurement Foundation

## Boundary

The measurement thesis is aggregate and behavioral:

`Unexpected Discovery → Editorial Reason → Real Action`

The event name is the complete Product payload. V3 event calls accept an empty
object only. Shelf, emotion, Experience, Editorial, creator, place, URL, private
content, user identity, geolocation, and profile data are rejected fail-closed.
No user properties or content-identifying custom dimensions are defined.

## Event contract

| Event | Bounded trigger |
| --- | --- |
| `v3_entrance_view` | A new Entrance navigation view |
| `v3_emotion_select` | Explicit shelf-selection action |
| `v3_discovery_view` | A new Discovery navigation view |
| `v3_experience_select` | Explicit opening of an Experience Detail |
| `v3_experience_save` | Only after `interested-experiences-v1` durable transaction success |
| `v3_external_open` | Successful approved Action Destination open attempt |
| `v3_return_view` | A new Return view |
| `v3_trace_start` | A new Trace view |
| `v3_trace_complete` | Explicit valid Trace completion |
| `v3_trace_skip` | Explicit Trace skip |
| `v3_editorial_open` | Opening a currently active, validated public Editorial surface |
| `v3_editorial_media_intent` | Explicit Editorial media play/open action |
| `v3_editorial_action` | Explicit Editorial Primary Action intent |

View/action dedupe is local to a rendered navigation/action instance. The
adapter marks an event before transport and never retries automatically.
Measurement failure cannot prevent the Product action.

## Destination and privacy configuration

This source snapshot contains no GA4 measurement ID or network sender. Runtime
status is `MEASUREMENT_CONFIG_BLOCKED` until HQ verifies a dedicated destination.
Historical V2 identifiers are not V3 authority and Preview traffic must not be
sent to a Production property.

The Production candidate privacy configuration is:

- `allow_google_signals = false`
- `allow_ad_personalization_signals = false`
- user properties disabled
- content parameters disabled
- data-retention candidate: 2 months

The two-month retention setting and the actual GA4 Property configuration must
be verified in GA4 Admin before Privacy publication; source code cannot prove
that external configuration.

## Creator Support boundary

Sprint04 adds no Creator Support UI or event. A future path must remain:

`Human Editorial Selection → optional Creator Support action`

Creator payment/support must never determine Editorial exposure. Aggregate
measurement must not require creator, seller, sponsor, or commerce identity.
