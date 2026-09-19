# CgGameThumb + CgCarousel Specification

## Overview

- **Target files:**
  - `src/components/crazygames/cg-game-thumb.tsx`
  - `src/components/crazygames/cg-carousel.tsx`
- **Screenshot:** `docs/design-references/crazygames-desktop-top.png`
- **Interaction model:** click-to-navigate + horizontal arrow scroll

## Variants (thumb)

| Variant     | Size (approx) | Border radius | Use             |
| ----------- | ------------- | ------------- | --------------- |
| highlighted | 440×249       | 16px          | Top games today |
| standard    | 218×124       | 16px          | Most rows       |
| portrait    | 218×325       | 16px          | Originals       |

### Thumb link styles

- background: rgba(255,255,255,0.07)
- border: 2px solid transparent
- border-radius: 16px
- overflow: visible on link; media wrapper overflow hidden + radius 16px
- Image: object-fit cover, absolute fill

## Carousel section

```
section
  .title-row (flex, gap 8px, padding 0 16px 3px 8px)
    h2 title (20px / 700 / white)
    optional chevron
  .track-wrap (relative)
    button.arrow.left / button.arrow.right
    ul.track (overflow-x auto, hide scrollbar, flex/inline list)
      li > CgGameThumb
```

### Title

- font-size: 20px; font-weight: 700; color: #fff; font-family: Nunito
- Highlighted title may include flag/star glyph before “today”

### Intent variant extras

- Title + subtitle under it (muted, ~14px)
- padding: 0 0 6px 8px on section

### Arrow buttons

- Absolute vertical center; circular/dark glass
- Background SVG chevron (white `#EFF0F7`)

## Gap / spacing

- Home page column gap: 8px
- Track item gap: ~8–10px (measure visually ~8px)

## States

### Hover thumb

- Slight brightness / border lighten
- Optional overlay with title (if easy; not required if overlay DOM empty on extract)

### Arrow click

- `scrollBy({ left: ±track.clientWidth * 0.8, behavior: 'smooth' })`

## Assets

- Game images under `public/crazygames/games/*.jpg`
- Data: `src/data/crazygames-home.json` sections

## Responsive

- Thumbs scale down; highlighted may become ~full width cards
- Arrows remain on tablet/desktop; touch-scroll on mobile
