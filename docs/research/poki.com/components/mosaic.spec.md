# Poki homepage mosaic

Source: https://poki.com/ at 1440×900.

- Background: `#83ffe7` + `public/poki/bg-diamante.svg` (`background-size: max(624px, 100%)`)
- Text: `#002b50`
- Font stack: Proxima Nova, Open Sans (Open Sans shipped)
- Grid: 12 × 94px columns, 16px gap, width 1304px, radius 16px
- Tile sizes: 94, 204 (2×2), 314 (3×3), absolutely placed from measured offsets
- Nav: 94×94 white card, radius 16px, fixed top 16px, aligned to grid left, shadow `0 3px 5px 3px rgba(93,107,132,0.2)`
- Search: click opens “What are you playing today?”
- Interaction: hover scale on tiles. No smooth-scroll library.
