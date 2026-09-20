# Canonical Game Category Taxonomy

This project uses a deliberately small, stable set of top-level browser-game
categories. Narrower concepts should be modeled as tags or SEO landing pages
rather than creating more top-level categories.

## Canonical categories

| Key | Title | Main navigation |
| --- | --- | --- |
| `action-games` | Action & Fighting Games | yes |
| `driving-racing-games` | Driving & Racing Games | yes |
| `shooting-games` | Shooting Games | yes |
| `puzzle-games` | Puzzle & Brain Games | yes |
| `skill-games` | Skill & Precision Games | yes |
| `sports-games` | Sports Games | yes |
| `adventure-games` | Adventure & RPG Games | yes |
| `arcade-games` | Arcade & Classic Games | yes |
| `multiplayer-games` | Multiplayer Games | yes |
| `casual-games` | Casual Games | yes |
| `strategy-games` | Strategy & Defense Games | yes |
| `simulation-games` | Simulation & Management Games | yes |
| `two-player-games` | 2 Player Games | no |
| `io-games` | .IO Games | no |
| `idle-clicker-games` | Idle & Clicker Games | no |
| `board-card-games` | Board & Card Games | no |
| `kids-educational-games` | Kids & Educational Games | no |
| `dress-up-games` | Dress Up & Lifestyle Games | no |

The code source of truth is
`src/modules/categories/taxonomy.ts`.

## Legacy category mapping

The following legacy categories have direct canonical replacements:

| Legacy | Canonical |
| --- | --- |
| `car-games` | `driving-racing-games` |
| `racing-games` | `driving-racing-games` |
| `clicker-games` | `idle-clicker-games` |
| `girls-games` | `dress-up-games` |
| `hypercasual-games` | `casual-games` |
| `kids-games` | `kids-educational-games` |
| `mahjong-games` | `board-card-games` |
| `soccer-games` | `sports-games` |

`3d-games`, `stickman-games`, and `boys-games` are no longer top-level
categories. They remain historical data only and should eventually become tags
where useful.

The category route issues 301 redirects for legacy category URLs that have an
unambiguous canonical replacement.

## Admin behavior

The admin category catalog is locked to the canonical taxonomy:

- use **Sync 18 standard categories** to create any missing global category rows;
- arbitrary new top-level category keys are rejected by the service;
- legacy rows remain visible as **Legacy** so they can be cleaned up safely;
- site-specific image, SEO Markdown, publish state and game assignments still
  work as before.

## Existing V2 data migration

Generate an idempotent D1/SQLite migration:

```bash
pnpm game:taxonomy:export
```

Default output:

```text
data/migrations/canonical-game-taxonomy.sql
```

The generated SQL:

1. ensures all 18 global canonical categories exist;
2. copies game/category mappings from mergeable legacy categories;
3. creates canonical site-category rows where needed;
4. copies locale SEO/content and site-game assignments without overwriting
   existing canonical rows;
5. archives old top-level site categories instead of deleting them;
6. keeps legacy rows for rollback/history.

Apply to a target D1 only after backing it up and reviewing the generated SQL.

## Future imports

`scripts/export-driftboss-v2-sql.ts` and the UI preview seed normalize legacy
category names into this taxonomy. New migrations should not recreate the old
top-level categories.
