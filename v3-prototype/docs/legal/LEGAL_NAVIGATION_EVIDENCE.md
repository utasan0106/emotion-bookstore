# Legal Navigation Evidence

## Implementation

`v3-prototype/index.html` contains a quiet persistent footer with relative,
same-origin links:

- `./privacy.html` — プライバシー
- `./terms.html` — 利用規約

Each Legal page links back to `./index.html` and cross-links to the other Legal
page. No link adds tracking parameters or opens a third-party destination.

## Accessibility / responsive contract

- Native anchors remain keyboard accessible.
- Global `:focus-visible` provides a 2px outline with 3px offset.
- Footer/back links have `min-width: 44px` and `min-height: 44px`.
- Footer links wrap rather than overflow.
- Legal page content width is `min(100% - 32px, 820px)`.
- Mobile tables become block cards below 600px; no horizontal scrolling is
  required at 390px or 430px.
- Desktop table minimum width (640px) fits the 820px bounded content surface.

## Deterministic responsive geometry

| Viewport | Legal content width | Table mode | Link target | Horizontal overflow |
| ---: | ---: | --- | --- | --- |
| 390 | 358px | mobile block cards, `min-width: 0` | at least 44×44px | 0 |
| 430 | 398px | mobile block cards, `min-width: 0` | at least 44×44px | 0 |
| 1440 | 820px | 100% table, 640px minimum | at least 44×44px | 0 |

The available browser transport rejected local-file navigation, and the sandbox
rejected a loopback server bind. No screenshot was fabricated and no dependency
was installed. Responsive closure therefore uses the isolated CSS diff proof,
exact geometry above, HTML parsing, focus/touch contracts, and selected Product
regression. This is an evidence-transport limitation, not a Product mutation.
