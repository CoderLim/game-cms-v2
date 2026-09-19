# CgHeader Specification

## Overview

- **Target file:** `src/components/crazygames/cg-header.tsx`
- **Screenshot:** `docs/design-references/crazygames-desktop-top.png`
- **Interaction model:** click-driven (search focus, login button)

## DOM Structure

```
header#czyHeader.cg-header (fixed, top 0, z-12)
  left: logo link > img (white logo, h=36px)
  center: form.search (w=460px, h=40px)
    input[placeholder="Search games and categories"]
    search icon button
  right: icon buttons (profile, bookmark, bell+badge) + Log in button
```

## Computed Styles

### Container

- position: fixed; top: 0; left: 0; z-index: 12
- height: 60px; width: 100%
- backgroundColor: rgb(26, 27, 40)
- display: flex; align-items: center
- border-bottom: 1px solid rgb(26, 27, 40)

### Search input

- width: 460px; height: 40px
- background: rgb(55, 57, 82); border-radius: 30px
- color: rgb(170, 173, 190); font-size: 16px; font-family: Nunito
- padding: 1px 16px

### Log in button

- height: 40px; padding: 8px 16px
- background: rgb(104, 66, 255); border-radius: 30px
- color: rgb(249, 250, 255); font-size: 16px; font-weight: 800

### Logo image

- height: 36px; width: ~103px
- src: `/crazygames/logo/logo-master-white.svg`

## States & Behaviors

- Scroll: no visual change
- Mobile: show hamburger (48×48) left of logo; hide/shrink search

## Assets

- Logo: `public/crazygames/logo/logo-master-white.svg`

## Text Content

- Placeholder: `Search games and categories`
- Button: `Log in`

## Responsive

- Desktop 1440: full search 460px
- Mobile 390: hamburger visible; search may collapse or full-width below
