# PokiGamePage Specification

## Overview

- **Target file:** `src/components/poki/poki-game.tsx`
- **Route:** `src/routes/en/g/pool-club.tsx` (`/en/g/pool-club`)
- **Screenshot:** `docs/design-references/poki.com/game-pool-club-desktop-1440-top.png`
- **Interaction model:** click-driven (search, show more, tile links). Nav is `position: fixed`.

## DOM Structure

Stage is 1304px, left edge at `calc(50% - 652px)` on a 1440 viewport (x=68). Background `#83ffe7` plus `bg-diamante.svg`.

- Fixed nav 94×94, top 16px, radius 16px, white, shadow `rgba(93,107,132,0.2) 0 3px 5px 3px`
- Player iframe box: x=192 y=16, 836×470, parent fill `#002b50`
- Info bar directly under the player: 836×64, white
- Right ad: 300×250 at x=1065 y=38, fill `rgba(255,255,255,0.5)`
- Related tiles absolutely placed on the 94/16 grid (94 and 204 sizes, radius 16px)
- Category banners 204×94 in two rows
- Article below the stage, then developer tiles 247×247, then footer

## Computed Styles

- Body background: `rgb(131, 255, 231)`
- Text: `rgb(0, 43, 80)`
- Font: Proxima Nova / Open Sans, body 16px/400/24px
- H1: 36px/700/40px
- Tile radius: 16px
- Player chrome radius: 0
- Tile hover: scale 1.04

## States & Behaviors

- Search button opens an overlay; typing filters tile titles. Close dismisses it.
- Show more reveals the longer description.
- Nav stays fixed while the mosaic scrolls underneath.

## Text Content (verbatim)

Pool Club / by Ravalmatic / 608.9K Like / 153.6K Dislike / Report a bug

Line up your shot, apply spin and pot balls through a range of pool challenges and modes. Read every angle on the table, plan your next move before you take the current shot and work through it efficiently.

Pool Club is a pool game created by Ravalmatic. Offering a smooth solo player pool game, Pool Club will challenge you to sink as many racks of balls as possible in 90 seconds. With each sunken ball, you'll get some extra seconds allowing you to extend your play limitlessly. The feature of Combos and Super Combos will add even more bonus seconds to the timer so you can impress all of your friends with your streak. Join our club and let time fly while sinking some balls!

How to play: Try to sink as many balls as possible before the timer runs out.

About this game: Desktop, phone and tablet / Ravalmatic / Skill Games / March 2021 / April 2021 / 4.2 (762,474 votes)

## Responsive Behavior

- **Desktop (1440px):** 1304px stage, player 836×470
- **Mobile (390px):** stage scales down with `transform: scale()` so there is no horizontal overflow
