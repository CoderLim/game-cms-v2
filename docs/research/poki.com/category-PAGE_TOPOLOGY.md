# Poki Category Page Topology — `/en/car`

Source: https://poki.com/en/car at 1440×900 (2026-09-19).

## Visual order (top → bottom)

1. **Fixed nav** — 94×94 white card, `top: 16px`, stage-left aligned (`x=68`). Logo + profile + search. Overlay, not in mosaic flow.
2. **Mosaic stage** — 1304×1964 CSS grid, 12×94px columns, 16px gap, origin `(68,16)`.
   - **Title banner** — white 424×94 at stage `(110,0)`, H1 “Car Games” 20px/700 centered.
   - **Related category chips** (204×94 white flex banners) mixed into the mosaic:
     - Driving `(990,0)`, Drifting `(1100,110)`, Truck `(1100,220)`, Racing `(1100,330)`
     - Bottom row: 3D, Boys, Action, Monster Truck, Parking, Skill
   - **Game tiles** — 94×94 and 204×204, radius 16px, absolute mosaic fill (~157 slots).
3. **SEO / editorial block** — second 1304-wide grid at `y≈2004`, columns `926px | 330px`, padding 24px.
   - Left: breadcrumb “GAMES / CAR GAMES” + H2 title 36px + longform article + FAQ.
   - Right: 300×250-ish ad slot.
4. **Footer** — “Let the world play” + Popular / Help / About columns.

## Interaction model

| Section               | Model                               |
| --------------------- | ----------------------------------- |
| Nav search            | click → overlay                     |
| Game / category tiles | click → navigate; hover scale       |
| Mosaic                | static layout (not scroll-driven)   |
| SEO                   | static prose                        |
| Page scroll           | native; nav stays `position: fixed` |

## Dependencies

- Same design tokens as homepage / game detail (`#83ffe7`, `#002b50`, Open Sans, diamante bg).
- Product route: `/category/$slug` (locale-free); do not ship `/en/car`.
