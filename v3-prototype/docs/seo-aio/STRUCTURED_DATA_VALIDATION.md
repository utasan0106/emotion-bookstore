# V3 Structured Data Validation

## Active graph

The V3 entrance contains one inline `application/ld+json` object:

- `@type`: `WebSite`
- canonical `@id` and `url`
- factual `name` / `alternateName`
- `inLanguage`: `ja`
- concise current description of Human Editorial, finite 0–3 and real-world action

## Explicitly absent

- `Organization`
- `Person`
- `Review` / `AggregateRating`
- `FAQPage`
- `Product` / `Offer`
- popularity or ranking
- commerce or future-feature data
- recommendation/personalization action schema
- private content, selected shelf, Experience ID or external destination URL

The JSON parses deterministically and uses no runtime request. Legal pages do not add unnecessary structured data.
