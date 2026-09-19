# Poki footer + fixed background

Measured on https://poki.com/ (desktop 1440, 2026-09-19).

## Fixed background

- Full-viewport `position: fixed; inset: 0` layer behind content
- `background-color: #83ffe7`
- `background-image: url(bg-diamante.svg)`
- `background-size: max(624px, 100%)`
- `background-position: center`
- Does not scroll with page content

## Footer chrome

- White panel via `::before` / absolute fill with
  `clip-path: polygon(0 8%, 30.6% 0, 33.5% 8%, 100% 0, 100% 100%, 0 100%)`
- Inner grid: `450px 1fr`, gap 32px, padding `56px 32px`
- Left: brand + slogan, locale pill (`2px solid #009cff`, radius 24, height 36), circular social icons 36×36 `#002b50`
- Right: 3 columns (200px × 3, gap 48px)
  - Heading: 12px / 700 / uppercase / `#bac9de` / letter-spacing 0.3px
  - Links: 14px / 700 / `#002b50` / line-height 22px

## Clone mapping

- Shared: `src/components/poki/poki-chrome.tsx` (`PokiFrame`, `PokiFooter`)
- Popular links: CMS `navigation` when set, else page category links
- Locale: `LocaleSelector variant="poki"`
- No ShipAny attribution badge
