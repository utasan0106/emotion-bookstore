# User-First Single Bet — 2026-08-27

## Decision

みんなの感情書店 V3が戦う場所を、**「検索前の3分」**に固定する。

東京で何か面白いものに触れたい。しかし検索語、目的地、ジャンルまでは決まっていない。その瞬間に、Human Editorialで選んだ実在物を3つだけ見せる。Real Mediaで指を止め、短いFact-based Hookで開かせ、RevealでPayoffを返し、必要な人だけVerified FactsとOfficial Actionへ進める。

## Primary user

東京圏で暮らす／働く人。旅行前の網羅検索ではなく、帰宅中・週末前・空き時間などの低意図状態。

## Why this position

- GO TOKYO / Time Out / Tokyo Art Beat / Peatix / Fever: breadth, search, event/date/category/transaction are strong.
- UMAME! / Rampo: mood + AI matching is already becoming commodity.
- Atlas Obscura: unusual-place catalog is deep, but it is still a large catalog and travel discovery product.
- Generic AI: can generate candidates, but current operation, exact rights, source truth and accountable selection remain uneven.

Therefore V3 should not become another search/filter/recommendation surface. The wedge is **finite, accountable, surprising editorial selection before intent exists**.

## What to polish

1. Real Media quality: first viewport must be visually understandable without explanation.
2. Hook: one second comprehension, fact-based, no clickbait.
3. Reveal: short, additive payoff; never self-destruct.
4. Current truth: action, hours, location, rights/provenance fail closed.
5. Finite ending: 3 objects, explicit end, no padding.

## What to cut from first session

- emotion-first entrance
- abstract philosophy copy before objects
- filters/search/catalog density
- account/cloud
- save/history/plan
- AI personalization/recommendation
- likes/followers/popularity
- infinite feed
- broad book/film/music expansion

These are not permanently rejected. They are blocked until the first-session discovery value proves itself.

## Pilot success

Primary: first-time user voluntarily opens at least one object without facilitator explanation.
Secondary: user says/behaves as if they would return for another set; or moves to official action.
Kill/Pivot: two external cycles still show low open + low return desire, or users say existing search/social/AI is enough and cannot name a unique reason to return.

## Engineering policy

Production/main remains frozen until behavior evidence exists. Build only an isolated pilot. No storage, analytics, background network APIs, recommendation engine or new data model. Current package uses external rights-cleared media URLs for preview only; production must localize assets before promotion.
