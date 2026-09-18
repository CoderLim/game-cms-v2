# Game Site Engine V2 — Handoff

> Updated: 2026-09-18
>
> Repository: `CoderLim/game-cms-v2`
>
> Primary branch: `main`
>
> Purpose: give the next developer/AI enough context to continue without reconstructing the architecture or migration history.

## 1. Current state

The original ShipAny/TanStack starter has been converted into a D1-first, multi-site **Game Site Engine V2**.

The large foundation PR has already been squash-merged into `main`.

- Merged PR: `#1 feat: establish Game Site Engine domain foundation`
- Merge commit: `3b7fda7de9e100f1c82f4f7deb0517e75f8f8f05`
- The implementation was validated before merge with:
  - Docker build
  - Game Site Engine SQLite/domain smoke
  - generated D1 migration verification
  - full legacy Postgres -> V2 SQLite migration smoke

Do not restart the architecture design from scratch. The major decisions below are intentional.

## 2. Product / architecture goal

This repository is not a single game website.

It is a reusable **Game Site Engine** that can power many vertical game sites such as:

- driftbossgame.org
- klotski.org
- tekken3.cc
- future niche game sites

The core model is:

```text
shared code
   +
shared global game catalog
   +
site-scoped selection/content/SEO
   +
one Worker deployment per site
```

The most important rule is:

> Share capabilities and raw game data; isolate site selection, SEO content and business state by `site_id`.

## 3. Database strategy

### V1 production database

**Cloudflare D1 / SQLite is the first-class V1 path.**

PostgreSQL compatibility schemas are maintained so that PostgreSQL can become a second provider later.

Supabase should be treated as a hosted PostgreSQL option, not as a separate application architecture.

Do not make D1 and PostgreSQL equal first-class runtime targets yet. That would double migration/testing complexity before there is demand.

### Provider boundary

Application code should use Drizzle/services instead of direct D1 calls.

Avoid leaking provider-specific SQL into page components or business logic.

The intended layering is:

```text
Route / UI
   ↓
Module Service
   ↓
Drizzle
   ↓
D1 today / PostgreSQL later
```

## 4. Core data model

### Global data

`game_catalog`

Represents the game itself. It is domain-independent.

Typical data:

- key
- title
- embed/source/image URLs
- provider
- embed type
- orientation/aspect ratio
- global status

Do **not** put site SEO content here.

### Sites

`game_site`

Each logical website has its own row.

Deployment identity is a stable `SITE_KEY`, not a numeric database ID.

Example:

```text
SITE_KEY=driftbossgame
        ↓
game_site.key
        ↓
SiteContext
```

### Site ↔ Game

`site_game`

This is the central relationship.

A game only exists publicly on a site if a corresponding `site_game` row exists.

This table owns site-specific state such as:

- published/draft state
- indexable
- featured
- hot
- sort weight
- site-level counters

Never expose every global game automatically on every domain.

### Site-specific localized game content

`site_game_locale`

SEO/page content belongs to:

```text
site + game + locale
```

not merely to a global game.

Important constraints/concepts:

- site-specific content must not fall back to another site's content
- missing non-default locale content must not manufacture an indexable page
- slug uniqueness is scoped by site + locale
- publishing includes a cross-site duplicate-content guard for the same global game

### Categories

The engine separates:

- global game taxonomy
- site-specific category activation
- site-specific category locale/SEO content
- site-specific category ↔ game membership

Do not collapse categories back into a string field on the game.

### Editorial content

Game-engine public editorial content uses:

- `site_post`
- `site_post_locale`
- `site_locale` for homepage/site-level localized SEO

These are deliberately separate from ShipAny's generic global post model.

Supported public content includes:

- articles
- guides
- updates
- static pages

## 5. Deployment model

Use:

> one site = one Cloudflare Worker deployment

All sites use the same code commit. Production sites may share the Game Engine D1; **legacy migration previews should use a dedicated Preview D1** so sample imports, resets and RBAC setup cannot affect production/shared data.

Each deployment gets its own:

- `SITE_KEY`
- canonical app URL/domain
- deploy environment
- Worker cache/environment isolation

Do not switch to a single Worker dynamically resolving every Host unless there is a strong scaling reason later.

Preview/staging deployments should remain non-indexable.

## 6. Public SEO behavior already implemented

The public layer is site-scoped and includes:

- homepage
- `/game/:slug`
- `/category/:slug`
- `/blog`
- `/blog/:slug`
- `/guides`
- `/guides/:slug`
- static `/:slug` pages
- `/embed/:slug`
- `/sitemap.xml`
- `/robots.txt`
- `/llms.txt`

SEO rules:

- canonical URL comes from the current SiteContext
- hreflang is generated only for actually published locale content
- `x-default` points to a real published locale
- sitemap only contains the current site's published/indexable content
- sitemap `lastmod` uses actual content timestamps
- preview/staging robots disallow crawling
- OpenGraph/Twitter metadata and JSON-LD use the same canonical URL source
- related games are same-site and selected in the DB with LIMIT rather than filtering a large global set in JS

The old global `llms-full.txt` route was removed because it could leak non-site-scoped content.

## 7. Read/write behavior

Reads must be side-effect free.

Do not restore the old pattern where reading a game increments its view counter.

Views/ratings use explicit POST mutations.

Site counters use site-scoped atomic database updates.

## 8. Admin / security state

The existing Better Auth + RBAC shell is reused.

Game Engine admin currently covers:

- Sites
- Game Catalog
- Site Games
- localized game SEO/content
- global categories
- site categories
- category ↔ game assignments
- homepage/site locale content
- Posts / Guides / Updates / Pages
- Site Settings

New Game Engine write APIs were hardened before merge:

```text
Auth
 ↓
RBAC
 ↓
Zod validation
 ↓
Service
 ↓
DB
```

The image upload endpoint is admin-only and accepts uploaded image files rather than server-side arbitrary URL fetching.

It validates:

- supported image MIME
- maximum size
- file signature

This intentionally avoids the SSRF pattern that existed in older game CMS implementations.

## 9. Site settings

Public site settings are stored in site-scoped configuration, not hardcoded into layouts.

Allowed public configuration groups include items such as:

- analytics
- ads
- navigation
- footer
- game player
- social links

Secrets must remain in Worker/CI environment secrets, never in `site_setting`.

## 10. Key implementation files

Start here before changing architecture:

### Design / operations

- `docs/game-site-engine-v2.md`
- `docs/game-site-engine-v2-runbook.md`
- `docs/driftboss-migration.md`
- `docs/driftboss-v2-migration-runbook.md`
- `docs/game-site-settings.md`

### Schema

- `src/config/db/game-schema.sqlite.ts`
- `src/config/db/game-schema.postgres.ts`
- `src/config/db/game-content-schema.sqlite.ts`
- `src/config/db/game-content-schema.postgres.ts`
- `scripts/db-setup.mjs`

ShipAny base schemas and Game Domain schemas are intentionally separated to reduce upstream conflicts.

### Core domain services

- `src/modules/sites/`
- `src/modules/games/`
- `src/modules/site-games/`
- `src/modules/categories/`
- `src/modules/site-posts/`
- `src/modules/site-settings/`

### Public routes

- `src/routes/index.tsx`
- `src/routes/game/`
- `src/routes/category/`
- `src/routes/blog/`
- `src/routes/guides/`
- `src/routes/embed/`
- `src/routes/sitemap[.]xml.ts`
- `src/routes/robots[.]txt.ts`
- `src/routes/llms[.]txt.ts`

### Migration / verification scripts

- `scripts/audit-legacy-driftboss-source.ts`
- `scripts/export-driftboss-v2-sql.ts`
- `scripts/export-driftboss-v2-extras-sql.ts`
- `scripts/export-driftboss-v2-reset-stats-sql.ts`
- `scripts/apply-sql-files.ts`
- `scripts/audit-game-site-cutover.ts`
- `scripts/smoke-site-isolation.ts`
- `scripts/seed-game-engine.ts`

## 11. Important package commands

Useful commands already wired in `package.json`:

```bash
pnpm db:setup
pnpm db:push
pnpm db:generate
pnpm db:migrate

pnpm game:seed

pnpm game:migrate:driftboss:audit
pnpm game:migrate:driftboss
pnpm game:migrate:driftboss:extras
pnpm game:migrate:driftboss:reset-stats
pnpm game:migrate:apply

pnpm game:audit:cutover
pnpm game:worker:configure

pnpm cf:build
pnpm cf:deploy
```

## 12. DriftBoss legacy source

The current legacy source is the old **game-cms** Supabase/Postgres database.

Observed legacy tables include:

- `games`
- `categories`
- `game_categories`
- `game_sites`
- `seo_games`
- `seo_categories`
- `blogs`
- `social_links`

At handoff time the legacy DB had roughly:

- ~3.9k games
- 6 sites
- ~88+ site-game SEO rows

The V2 migration scripts are designed to export this old domain/content model into the new site-scoped engine.

### Important stats rule

Legacy `games.view` is global and cannot reliably be decomposed into historical per-site views.

Do not pretend it is accurate site-level history.

V2 per-site counters should restart cleanly (or legacy counts should be retained only as explicitly labeled legacy/reference data).

The migration smoke test already verifies the reset behavior.

## 13. Temporary legacy DB test data added on 2026-09-18

A few intentionally small test changes were made in the old DriftBoss database so the migration can be validated against real data without creating fake games.

### Existing English rows updated

For `domain = driftbossgame.org`:

`drift-boss / en`

```text
Drift Boss - Play Online Free | DriftBossGame.org
```

`drive-mad / en`

```text
Drive Mad - Play Online Free | DriftBossGame.org
```

`eggy-car / en`

```text
Eggy Car - Play Online Free | DriftBossGame.org
```

These rows originally had `meta_title = NULL`.

### One Chinese Drift Boss row added

A new `seo_games` row was added for:

```text
domain   = driftbossgame.org
game_key = drift-boss
locale   = zh
```

Its title is:

```text
Drift Boss 在线玩 - 免费漂移游戏 | DriftBossGame.org
```

It contains a small Chinese Drift Boss page body specifically intended to validate:

- site + game + locale migration
- locale routing
- hreflang generation
- sitemap locale coverage

At creation time this row received legacy DB id `98`.

### Optional rollback of only these test edits

Only run this if intentionally reverting the test fixture.

```sql
UPDATE public.seo_games
SET meta_title = NULL
WHERE domain = 'driftbossgame.org'
  AND game_key = 'drift-boss'
  AND COALESCE(locale, 'en') = 'en'
  AND meta_title = 'Drift Boss - Play Online Free | DriftBossGame.org';

UPDATE public.seo_games
SET meta_title = NULL
WHERE domain = 'driftbossgame.org'
  AND game_key = 'drive-mad'
  AND COALESCE(locale, 'en') = 'en'
  AND meta_title = 'Drive Mad - Play Online Free | DriftBossGame.org';

UPDATE public.seo_games
SET meta_title = NULL
WHERE domain = 'driftbossgame.org'
  AND game_key = 'eggy-car'
  AND COALESCE(locale, 'en') = 'en'
  AND meta_title = 'Eggy Car - Play Online Free | DriftBossGame.org';

DELETE FROM public.seo_games
WHERE id = 98
  AND domain = 'driftbossgame.org'
  AND game_key = 'drift-boss'
  AND locale = 'zh';
```

Do not run this rollback unless the test data needs to be removed.

## 14. Known legacy database security debt

The old Supabase database currently has RLS disabled on at least:

- `blogs`
- `seo_games`
- `seo_categories`
- `social_links`

Do **not** blindly enable RLS on the legacy production DB.

Enabling RLS without compatible policies can immediately break the old site's reads/writes.

Treat this as legacy security debt and address it either:

1. after the old site has been cut over to V2, or
2. in a separately reviewed legacy-hardening change with explicit policies.

## 15. Repository/license warning

This project originated from ShipAny proprietary source.

The repository was observed as public during development.

Before distributing the source or commercializing it as a downloadable template:

- verify the ShipAny license
- keep the repository private unless redistribution is explicitly allowed
- obtain an OEM/reseller/redistribution license if selling ShipAny-derived source
- alternatively replace the proprietary platform layer before source-template resale

Using the code to operate your own sites/SaaS and redistributing the underlying boilerplate source are different licensing questions.

This is a business/legal boundary, not just a technical detail.

## 16. Immediate next task

Goal: migrate a deliberately small DriftBoss preview dataset into a **dedicated Preview D1** and deploy a non-indexed Preview Worker for owner visual inspection.

### 16.1 Prerequisites

- [ ] Work from `main`.
- [ ] Cloudflare account is available and `npx wrangler whoami` succeeds.
- [ ] Put a **read-only** legacy PostgreSQL/Supabase connection in the shell as `LEGACY_DATABASE_URL`. Never commit it.
- [ ] Confirm Game Engine CI is green: Docker Build, Game Site Engine Smoke, Game Site Engine Migrations, Legacy Migration Smoke.
- [ ] Create a dedicated Preview D1 (recommended name: `game-site-engine-driftboss-preview`). Production sites may later use a shared D1; this migration Preview intentionally does not.

### 16.2 Audit and export the small sample

First audit the real source:

```bash
LEGACY_DATABASE_URL='postgresql://...' \
  pnpm game:migrate:driftboss:audit -- \
  --domain=driftbossgame.org
```

Export exactly the three real sample games plus their category graph. `--games` filters the global catalog as well as site-game rows, so the Preview D1 does **not** receive the full ~3.9k catalog. `--include-posts=false` keeps editorial posts out of this first visual sample.

```bash
LEGACY_DATABASE_URL='postgresql://...' \
  pnpm game:migrate:driftboss -- \
  --domain=driftbossgame.org \
  --games=drift-boss,drive-mad,eggy-car \
  --include-posts=false \
  --featured=driftbossgame.org:drift-boss \
  --out=data/migrations/driftboss-v2.sql
```

Export site-level homepage/legal/social settings:

```bash
LEGACY_DATABASE_URL='postgresql://...' \
  pnpm game:migrate:driftboss:extras -- \
  --domain=driftbossgame.org \
  --out=data/migrations/driftboss-v2-extras.sql
```

Generate the mandatory per-site counter reset:

```bash
LEGACY_DATABASE_URL='postgresql://...' \
  pnpm game:migrate:driftboss:reset-stats -- \
  --domain=driftbossgame.org \
  --out=data/migrations/driftboss-v2-reset-stats.sql
```

Review all generated files under `data/migrations/` before applying them. These files are local/generated and should remain gitignored.

**Important:** `--domain=driftbossgame.org` by itself does **not** filter the global catalog. Use `--games=...` when a physically small catalog is required.

### 16.3 Preview database and import

Create the isolated Preview D1:

```bash
npx wrangler d1 create game-site-engine-driftboss-preview
```

Record the returned database id locally; do not commit it.

Generate/apply the V2 schema to that Preview D1:

```bash
pnpm db:setup
pnpm db:generate
npx wrangler d1 migrations apply game-site-engine-driftboss-preview --remote
```

Apply migration data in this order:

```bash
npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/driftboss-v2.sql

npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/driftboss-v2-extras.sql

npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/driftboss-v2-reset-stats.sql
```

Alternatively, for a local SQLite dry-run, use `pnpm game:migrate:apply` as documented in the migration runbook.

Initialize minimal RBAC directly for the remote Preview D1:

```bash
pnpm game:rbac:bootstrap-d1 -- \
  --out=data/migrations/game-engine-d1-rbac-bootstrap.sql

npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/game-engine-d1-rbac-bootstrap.sql
```

This creates the `super_admin` role and wildcard `*` permission. The existing `pnpm rbac:init` script is for local/libSQL or TCP databases and should not be treated as a direct remote-D1 command.

After the intended administrator user has signed in/registered on Preview, generate an assignment SQL file:

```bash
pnpm game:rbac:bootstrap-d1 -- \
  --admin-email=<admin-email> \
  --out=data/migrations/game-engine-d1-rbac-admin.sql

npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/game-engine-d1-rbac-admin.sql
```

The user must already exist in the Preview D1 `user` table. Do not put passwords or secrets into generated SQL or Git.

### 16.4 Preview Worker

Use the checked-in template and the official configure command:

```bash
pnpm game:worker:configure -- \
  --site-key=driftbossgame \
  --domain=driftbossgame.org \
  --app-url=https://<preview-worker-url> \
  --worker=driftbossgame-preview \
  --site-name="Drift Boss Preview" \
  --database-id=<preview-d1-id> \
  --database-name=game-site-engine-driftboss-preview \
  --deploy-env=preview
```

This materializes local/gitignored `wrangler.jsonc` from `wrangler.example.jsonc`. See `.claude/skills/deploy-game-site/SKILL.md`.

Required Preview runtime configuration:

```env
DATABASE_PROVIDER=d1
SITE_KEY=driftbossgame
DEPLOY_ENV=preview
VITE_APP_URL=https://<preview-worker-url>
VITE_APP_NAME=Drift Boss Preview
AUTH_SECRET=<secret>
```

`VITE_APP_URL` is the actual Preview hostname used by auth/runtime callbacks. The canonical SEO origin remains `game_site.domain = driftbossgame.org`. These values are intentionally allowed to differ.

Set secrets through Wrangler/Cloudflare secrets, not `site_setting` or Git.

Build/deploy:

```bash
pnpm cf:build
pnpm cf:deploy
```

Preview must remain `DEPLOY_ENV=preview`; `robots.txt` must return `Disallow: /`.

### 16.5 Verify

Manual checks:

- [ ] homepage
- [ ] Drift Boss / Drive Mad / Eggy Car pages
- [ ] game player/embed
- [ ] category pages
- [ ] Drift Boss Chinese locale fixture
- [ ] canonical points to `https://driftbossgame.org`, never the Preview host
- [ ] hreflang only contains actually published locales
- [ ] sitemap is site-scoped
- [ ] robots blocks indexing
- [ ] an unrelated global game returns 404 because it is not attached to this site
- [ ] no content leaks from another site
- [ ] Admin can edit the imported content

Run the cutover audit:

```bash
pnpm game:audit:cutover -- \
  --base=https://<preview-worker-url> \
  --canonical=https://driftbossgame.org \
  --game=drift-boss \
  --expect-indexable=false
```

When available, also pass representative `--category`, `--pages`, and `--not-found` values as described in `docs/driftboss-v2-migration-runbook.md`.

Owner visual sign-off is required before proceeding.

### 16.6 After approval only

Only after the Preview is accepted:

- export/import the full DriftBoss dataset
- decide whether production uses the shared production Game Engine D1 or a dedicated production D1
- configure the production Worker with `DEPLOY_ENV=production`
- run the final cutover audit with `--expect-indexable=true`
- switch the real domain/DNS
- keep the old production app/data available for rollback until traffic/indexing is healthy

### 16.7 Migration field scope

The first legacy migration intentionally maps the legacy long-form `seo_content` into `site_game_locale.content`.

V2 fields such as `how_to_play`, `controls`, `features`, and `faq` are **not lost legacy columns**; the old DB does not provide structured sources for them. They remain empty on first migration and may be populated later through Admin/content enrichment.

### 16.8 URL/redirect rule for V1

V1 does not yet have a database-backed redirect subsystem.

Therefore, during the DriftBoss cutover:

- preserve existing public slugs/URL shapes whenever they already have traffic/indexing;
- do not change a legacy indexed slug unless a permanent redirect is configured first;
- if a redirect is unavoidable, use Cloudflare Redirect Rules (or an explicitly reviewed Worker redirect) as the temporary V1 mechanism.

A generalized redirect table/router can be added later; it is not required for the first cutover.

### 16.9 Known non-blocking UI debt

- Game Engine Admin labels are currently largely English/hardcoded. Treat full Admin i18n as backlog, not a migration blocker.
- `site_setting` consumption status is documented in `docs/game-site-settings.md`; do not assume every validated setting is already wired into every theme component.

## 17. Explicit approval boundaries

Do not silently perform these actions:

- production DNS cutover for driftbossgame.org
- destructive cleanup of the legacy database
- enabling legacy RLS without reviewed policies
- publishing preview/staging pages to search engines
- source-template redistribution under the current ShipAny-derived license

Everything before these boundaries can continue autonomously if it is reversible and preview-only.

## 18. Architectural invariants

If future work conflicts with one of these, stop and reconsider before changing it.

1. Every public game query is scoped by `site_id`.
2. Global `game_catalog` does not own site SEO.
3. Site-specific SEO/content never falls back to another site's content.
4. Missing locale content does not create an indexable fake translation.
5. A game is publicly routable on a site only through `site_game`.
6. Server pages call services directly; they do not HTTP-fetch their own API routes.
7. GET/read operations have no write side effects.
8. View/rating counters are atomic and site-scoped.
9. Sitemap/hreflang only expose truly published site content.
10. Game Domain code should stay separable from the ShipAny platform layer.
11. V1 is D1-first; PostgreSQL compatibility is preserved without doubling all runtime complexity.
12. One site per Worker remains the default deployment model.

## 19. Definition of “ready to cut DriftBoss over”

Do not cut the real domain merely because the app builds.

The Preview should prove all of the following:

- migrated Drift Boss page content matches expectations
- game iframe/player works on desktop and mobile
- canonical points to the intended production URL shape
- no preview hostname is canonicalized/indexed
- only real published translations produce hreflang
- sitemap is site-scoped
- unrelated global games return 404 unless attached
- admin can edit game/site/category/editorial content without SQL
- upload is admin-restricted
- no cross-site SEO/content leakage
- cutover audit passes
- owner has visually accepted the preview

Once those are true, the next meaningful decision is the production DriftBoss cutover.
