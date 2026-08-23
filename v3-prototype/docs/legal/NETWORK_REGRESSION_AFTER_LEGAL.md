# Network Regression after V3 Legal Alignment

## Current counts

- First-paint third-party requests: **0**
- Private user-authored content external transmissions: **0**
- Analytics outbound hosts: **0**
- GA4 destination: absent (`MEASUREMENT_CONFIG_BLOCKED`)
- Active public Editorial records: **0**
- Editorial provider first-paint requests: **0**

## Legal-surface behavior

- `privacy.html` and `terms.html` load only `./css/v3.css`.
- CSS fonts, paper texture, and all other referenced assets are same-origin.
- Legal pages contain no script, iframe, preconnect, prefetch, analytics, or
  provider embed.
- Legal navigation uses relative same-origin URLs with no query string.

## Protected behavior

- Action Destination, Registry, Interested, Plan, Outing, Editorial shell,
  analytics adapter, and storage schema are unchanged.
- No external AI, geolocation, login, cloud sync, tracking, or dependency was
  added.
