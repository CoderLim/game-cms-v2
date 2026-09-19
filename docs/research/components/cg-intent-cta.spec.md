# CgIntentCta Specification

## Overview

- **Target file:** `src/components/crazygames/cg-intent-cta.tsx`
- **Screenshot:** `docs/design-references/crazygames-desktop-top.png`
- **Interaction model:** click-driven + horizontal scroll

## Tile styles (each)

- width: 230px; height: 120px; border-radius: 16px
- background: CSS var `--intent-background-image` (linear-gradient)
- accent: `--intent-accent` for title color hint
- icon: 60×60 absolute (top-right area)
- title: absolute bottom-left, white, bold ~14px

## Accents (verbatim)

| Title             | Accent  | Gradient                     |
| ----------------- | ------- | ---------------------------- |
| Train your brain  | #47d7ff | 285deg #171d2e 20% → #154a6f |
| Adrenaline rush   | #f154ac | → #68294d                    |
| With friends      | #86ffcf | → #1f645c                    |
| 5-minute fun      | #ffdf40 | → #58522c                    |
| Meme & bloxy      | #b4f54e | → #2e6136                    |
| Timeless classics | #b464ff | → #3d2f73                    |
| Just relax        | #5cffab | → #1d5657                    |
| Deep progress     | #5f97ff | → #191e5d                    |

## Assets

`public/crazygames/promo/*.png`
