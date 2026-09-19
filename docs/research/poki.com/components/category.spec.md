# PokiCategory Specification

## Overview

- **Target file:** `src/components/poki/poki-category.tsx`
- **Route:** `src/routes/category/$slug.tsx` (`/category/$slug`)
- **Layout data:** `src/data/poki-category.json` (absolute mosaic slots from `/en/car`)
- **Screenshots:** `docs/design-references/poki.com/category-car-desktop-1440-*.png`
- **Interaction model:** click-driven (search, tile links). Nav is `position: fixed`.

## DOM Structure

Stage 1304px wide. Background `#83ffe7` + `/poki/bg-diamante.svg` (`background-size: max(624px, 100%)`).

1. Fixed nav 94×94 — same chrome as `PokiHome` / `PokiGamePage`
2. Title banner — white 424×94 at stage `(110, 0)`, centered H1
3. Absolute mosaic — game tiles + related category banners sharing one 1304×1964 stage
4. Editorial article below stage (CMS `description` / `content`) + optional ad column
5. Footer — same pattern as home

## Computed Styles (from getComputedStyle)

### Page

- backgroundColor: `rgb(131, 255, 231)` (`#83ffe7`)
- color: `rgb(0, 43, 80)` (`#002b50`)
- font: Proxima Nova / Open Sans, 16px/400/24px

### Title banner (`header`)

- display: flex; justify-content: center; align-items: center
- width: 424px; height: 94px; border-radius: 16px
- background: `#fff`
- padding: 10px 16px
- box-shadow: `rgba(93, 107, 132, 0.3) 0px 7px 10px 4px`
- H1: 20px / 700 / 24px, color `#002b50`

### Game tile

- border-radius: 16px
- sizes: 94×94 or 204×204
- hover: scale ~1.04, transition `transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)`

### Related category banner (204×94)

- display: flex; flex-direction: row; align-items: center
- background: `#fff`; border-radius: 16px; overflow: hidden
- box-shadow: `rgba(93, 107, 132, 0.3) 0px 7px 10px 4px`
- img: 94×94, border-radius `16px 0 0 16px`
- label span: 12px / 700 / uppercase, color `#002b50`, padding `0 8px`

### SEO column

- Grid: 926px + 330px, padding 24px
- H2: 36px/700/40px (page title in crumb area); section H2 ~24px
- H3: ~18.72px/700/24px
- p: 16px/400/24px, color `#002b50`

### Nav

- fixed; top 16px; 94×94; white; radius 16px
- shadow: `rgba(93, 107, 132, 0.2) 0 3px 5px 3px`
- left: `max(16px, calc(50% - 652px))`

## States & Behaviors

- Search overlay: click search → dialog; filter game titles; close dismisses.
- Nav fixed while mosaic scrolls.
- Tile hover scale as above.

## Assets

- Background: `public/poki/bg-diamante.svg`
- Category images: `public/poki/categories/{key}.png`
- Icons: `/poki/icons/search.svg`

## Text Content (verbatim from Poki car page — demo only)

H1: Car Games

Article intro (excerpt): “Car games are all about driving fast…” — product uses CMS `category.description` / `category.content`.

## Responsive Behavior

- Desktop 1440: 1304 stage, absolute mosaic
- Mobile: scale stage via `useStageScale` (same as home)
