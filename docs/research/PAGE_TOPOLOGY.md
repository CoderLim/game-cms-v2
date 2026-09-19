# CrazyGames Homepage — Page Topology

Source: https://www.crazygames.com/  
Viewports extracted: 1440×900 (desktop), 390×844 (mobile)  
Font: Nunito (body + UI)

## Overall Layout

```
┌─────────────────────────────────────────────────────────────┐
│ #czyHeader (fixed, z=12, h=60px, bg #1a1b28)                │
│  [logo] ………… [search 460×40] ………… [icons] [Log in]          │
├──────┬──────────────────────────────────────────────────────┤
│#main │ #layoutMain (margin-left: 60px; padding-left: 60px)  │
│Nav   │   Layout_backgroundContainer (fixed, z=-1)           │
│fixed │   background image: /images/background2.jpg          │
│z=5   │                                                      │
│60px  │   .HomePage_root (flex column, gap 8px,             │
│→200  │    padding: 0 0 20px 8px)                            │
│hover │                                                      │
│      │   [sections top → bottom]                            │
└──────┴──────────────────────────────────────────────────────┘
```

- **No Lenis / smooth-scroll library** (`hasLenis: false`)
- Sidebar sits below header (`top: 60px`)
- Background is a fixed full-bleed photo behind main content

## Sections (top → bottom)

| #     | Name                 | Class / kind                          | Interaction                 | Notes                        |
| ----- | -------------------- | ------------------------------------- | --------------------------- | ---------------------------- |
| 0     | Intent CTA strip     | `TopPromotionalRecentBanner`          | click + horizontal carousel | 8 tiles 230×120, radius 16px |
| 1     | Spacer               | `HomePage_space`                      | static                      | 0 height desktop             |
| 2     | Top games today      | `CrazyCarousel` + `isHighlightedMode` | horizontal scroll / arrows  | Large thumbs ~440×249        |
| 3     | Featured games       | `CrazyCarousel`                       | scroll / arrows             | Standard 16:9 ~218×124       |
| 4     | New games            | `CrazyCarousel`                       | scroll / arrows             | Standard                     |
| 5     | CrazyGames Originals | `CrazyCarousel` + `isPortrait`        | scroll / arrows             | Portrait ~218×325            |
| 6     | Can’t stop playing   | `CrazyCarousel`                       | scroll / arrows             | Standard                     |
| 7     | Leaderboards         | `LeaderboardsCarousel`                | scroll / arrows             | Promo panel + game row       |
| 8     | Premium Perks        | `CrazyCarousel`                       | scroll / arrows             | Standard                     |
| 9–16  | Intent carousels (8) | `IntentCarousel`                      | scroll / arrows             | Title + subtitle + games     |
| 17–29 | Genre carousels      | `CrazyCarousel`                       | scroll / arrows             | Driving…Strategy etc.        |
| —     | SEO categories       | `SEOCategoriesBlock`                  | click links                 | Tag / popular games grid     |
| —     | SEO copy             | bottom article                        | static                      | H1 + paragraphs              |
| —     | Lazy observer        | `LazyCarouselsSection`                | scroll-driven lazy load     | Loads remaining rows         |

## Fixed / Sticky Overlays

1. **Header** `#czyHeader` — fixed top, full width, z-index 12
2. **Sidebar** `#mainNav` — fixed left, top 60px, z-index 5; collapsed 60px → expanded 200px on hover
3. **Background** `Layout_backgroundContainer` — fixed, z-index -1
4. **Controller notification** (bottom toast) — out of scope for clone chrome

## Dependencies

- Header height drives sidebar `top` and main offset
- Sidebar width drives main `margin-left` / `padding-left` (60px collapsed)
- Carousels share GameThumb + arrow controls
- Intent CTA strip and IntentCarousel sections share the same 8 intent themes

## Interaction Model Summary

| Region                 | Model                                        |
| ---------------------- | -------------------------------------------- |
| Sidebar                | hover-expand (desktop); click labels         |
| Header search / Log in | click                                        |
| Intent CTA tiles       | click (navigate / scroll to intent)          |
| All game carousels     | click-to-play + horizontal drag/arrow scroll |
| Lazy genre rows        | scroll-driven mount                          |
| Header on scroll       | no shrink (stays 60px solid `#1a1b28`)       |
