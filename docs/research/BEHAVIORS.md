# CrazyGames Homepage — Behaviors

## Scroll sweep

| Behavior          | Trigger            | Result                                                                                      |
| ----------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| Header appearance | any scroll         | **No change** — stays `height: 60px`, `background: rgb(26, 27, 40)`, solid, no shadow morph |
| Sidebar           | scroll             | Stays fixed under header; independent of scroll                                             |
| Background        | scroll             | Fixed image (`background2.jpg`); does not parallax                                          |
| Lazy carousels    | scroll near bottom | `LazyCarouselsSection_observer` mounts additional genre rows                                |
| Smooth scroll lib | n/a                | None (native scroll)                                                                        |

## Click sweep

| Target                                   | Result                                             |
| ---------------------------------------- | -------------------------------------------------- |
| Logo                                     | Navigate `/`                                       |
| Search input                             | Focus; typeahead (out of scope — keep visual only) |
| Log in                                   | Opens auth modal (clone: button only)              |
| Header icons (profile / bookmark / bell) | Menus / panels (clone: visual only)                |
| Sidebar links                            | Navigate category / listing URLs                   |
| Intent CTA tile                          | Jump / filter to intent theme                      |
| Game thumb                               | Navigate `/game/<slug>`                            |
| Carousel arrows                          | Horizontal scroll of sibling track                 |
| Section title chevron                    | Navigate to listing page                           |

## Hover sweep

| Target               | Before → After                                                   | Transition                        |
| -------------------- | ---------------------------------------------------------------- | --------------------------------- |
| Sidebar (`#mainNav`) | width `60px` → `200px`; labels opacity 0→1                       | expand ~0.15–0.2s; labels fade in |
| Sidebar active item  | purple/lavender tint on icon+label                               | —                                 |
| Game thumb           | border transparent → subtle light; optional overlay (title/play) | `transition: all`                 |
| Carousel arrow       | opacity low → full; bg dark pill                                 | —                                 |
| Log in button        | purple `#6842ff` slight brighten                                 | —                                 |
| Intent CTA           | scale / brightness lift                                          | short ease                        |

## Responsive sweep

| Width  | Layout changes                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1440px | Collapsed sidebar 60px (expand on hover); header search 460px; highlighted cards ~440px wide                                    |
| 768px  | Sidebar may overlay / hamburger; search shrinks; fewer visible cards per row                                                    |
| 390px  | Hamburger in header (`HeaderSidebarButton` visible); sidebar off-canvas; single-column carousels; intent tiles smaller / scroll |

**Breakpoint heuristic:** desktop chrome (always-visible rail) ≈ `≥1024px`; mobile header hamburger uses `hideWhenDesktopDevice` class (~below desktop).

## Carousel interaction model

**INTERACTION MODEL: click-arrows + horizontal overflow scroll** (not scroll-snap page sections).

- Track: horizontal `ul` of `li` thumbs
- Arrows: absolute left/right buttons with SVG chevron background-image
- Highlighted row: larger first tiles (~440×249) mixed with smaller
- Portrait row: ~218×325 thumbs
- Standard: ~218×124 (16:9)
