# CgSidebar Specification

## Overview

- **Target file:** `src/components/crazygames/cg-sidebar.tsx`
- **Screenshot:** `docs/design-references/crazygames-desktop-top.png`
- **Interaction model:** hover-expand (desktop) + click navigation

## DOM Structure

```
nav#mainNav (fixed, left 0, top 60px, z-5)
  #sidebarContainer (flex column, padding 16px 0 30px)
    primary links (Home, Recently played, New, Hot, Updated, Originals, Multiplayer, Leaderboards)
    divider
    category links (Action … Word)
    divider
    Tags link
```

Each link: icon img 22–24px in 60px-wide icon column + label (hidden when collapsed)

## Computed Styles

### Nav collapsed

- width: 60px; background: rgb(12, 13, 20); position: fixed; top: 60px; height: calc(100vh - 60px); overflow-y: auto

### Nav expanded (hover)

- width: 200px
- labels visible (opacity 1)

### Link row

- height: 34px; display: flex; align-items: center
- Active (Home): purple/lavender accent on icon + label
- Disabled (Recently played): reduced opacity
- Label font: Nunito, ~14px, white / muted

### Divider

- width: 27px; height: 1px; centered in collapsed rail

## States & Behaviors

### Hover expand

- Trigger: mouse enter `#mainNav`
- State A: width 60px, labels hidden/clipped
- State B: width 200px, labels shown
- Transition: width ~0.15s ease; overflow visible when expanded
- Implementation: CSS `:hover` on nav + `overflow: hidden` when collapsed

## Assets

- Icons: `public/crazygames/icons/{Home,Recent,New,Trending,Updated,Originals,Multiplayer,Leaderboards,Action,…}.svg`

## Text Content

See `src/data/crazygames-home.json` → `sidebar`

## Responsive

- Desktop: rail always visible, hover expand
- Mobile: off-canvas; toggled by header hamburger
