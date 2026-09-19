# Poki Category Page Behaviors — `/en/car`

Source: https://poki.com/en/car

## Scroll

- Native scroll only — no Lenis / Locomotive.
- Fixed nav stays at `top: 16px`, `left: 68` (desktop 1440). Appearance does not change on scroll.
- Mosaic scrolls underneath the nav.

## Click

- Logo → home.
- Profile button → profile UI (out of scope for clone shell; map to home or omit).
- Search → opens “What are you playing today?” style overlay; typing filters games.
- Game tiles → `/en/g/{slug}` (product: `/game/{slug}`).
- Related category banners → `/en/{key}` (product: `/category/{slug}`).

## Hover

- Game tiles: `transition: transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)`; scale ≈ 1.04; elevate `z-index`.
- Category banners: same shadow family `rgba(93,107,132,0.3) 0 7px 10px 4px` at rest on banners; tiles use similar shadow language.
- Title banner: static white card, no scale required.

## Responsive

- Desktop 1440: 12-col × 94px + 16px gap = 1304 stage.
- Mobile 390: Poki reflows to 6-col grid (644px). Our shell matches home/game and **scales the 1304 stage** with `transform: scale()` (known parity gap vs real Poki reflow).

## Time-driven

- None observed on category page.
