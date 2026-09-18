# Game Site Engine V2 Runbook

This document is the operational companion to `docs/game-site-engine-v2.md`.

## Local development

Game Site Engine V1 uses SQLite locally and D1 in production.

Create local env:

```bash
cp .env.example .env.development
```

Minimum values:

```env
VITE_APP_URL=http://localhost:3000
VITE_APP_NAME=Game Site Dev
SITE_KEY=local-dev
DEPLOY_ENV=development
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:data/local.db
AUTH_SECRET=<local-secret>
```

Initialize the generated schema files and local database:

```bash
pnpm install
pnpm db:setup
pnpm db:push
pnpm game:seed
pnpm dev
```

`pnpm game:seed` is development-only. It creates:

- one active `game_site` matching `SITE_KEY`
- one demo game in the global catalog
- one published `site_game`
- one published localized game page
- one published/indexable site category
- the category/game relation

Optional seed values:

```env
SEED_SITE_DOMAIN=localhost:3000
SEED_SITE_NAME=Game Site Dev
SEED_GAME_EMBED_URL=https://example.com/game
```

After seeding, verify:

```text
/
/game/demo-game
/category/demo-games
/sitemap.xml
/robots.txt
/admin/game-sites
/admin/game-catalog
/admin/site-games
/admin/game-categories
```

Non-production `robots.txt` intentionally returns `Disallow: /`.

## Content publishing rule

A game appears publicly only when all required layers exist:

```text
game_catalog.status = active
site_game.status = published
site_game_locale.status = published
```

It appears in the sitemap only when the above are true and:

```text
site_game.indexable = true
```

The same rule applies to site categories and site posts/pages.

Do not publish a locale until real localized content exists. Missing locale content must not fall back to another site's content or automatically create an indexable page.

## Admin workflow

Typical workflow for a new site:

1. `/admin/game-sites` — create the logical site.
2. `/admin/site-content` — set homepage SEO/content per locale.
3. `/admin/game-catalog` — add/import reusable global game assets.
4. `/admin/site-games` — attach games to the site.
5. `/admin/site-games` — create unique localized slug/SEO/content and publish it.
6. `/admin/game-categories` — create global category identities, attach them to the site, publish localized category content, and assign site games.
7. `/admin/site-posts` — create guides, articles, updates and static pages.
8. `/admin/site-settings` — configure public analytics/ads/navigation/footer/social settings.
9. Verify `/sitemap.xml` before production launch.

## Cloudflare D1 production model

One shared D1 database may serve many logical sites. Each public site gets its own Worker deployment and points at the same D1 `database_id`.

Example:

```text
Worker: driftbossgame
SITE_KEY=driftbossgame
VITE_APP_URL=https://driftbossgame.org
                 \
                  -> shared D1 DB
                 /
Worker: klotski
SITE_KEY=klotski
VITE_APP_URL=https://klotski.org
```

Each Worker must set:

```jsonc
"vars": {
  "DATABASE_PROVIDER": "d1",
  "SITE_KEY": "driftbossgame",
  "DEPLOY_ENV": "production",
  "VITE_APP_URL": "https://driftbossgame.org",
  "VITE_APP_NAME": "Drift Boss"
}
```

and bind D1 as:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "game-site-engine-db",
    "database_id": "...",
    "migrations_dir": "drizzle"
  }
]
```

The runtime D1 adapter expects the binding name to be exactly `DB`.

## D1 schema deployment

Before applying a new Game Engine schema:

```bash
DATABASE_PROVIDER=d1 pnpm db:setup
DATABASE_PROVIDER=d1 pnpm db:generate
```

Review the generated migration before applying it.

Then apply to the configured remote D1 database using the existing Cloudflare deployment workflow/skill:

```bash
npx wrangler d1 migrations apply <database-name> --remote
```

Do not use `db:push` against production D1.

## Legacy DriftBoss migration

The legacy `driftbossgame` database is treated as a read-only migration source. Never transform the production legacy database in-place.

The migration is split into two generated SQL files:

```text
driftboss-v2.sql
  games/categories/site_games/site_game_locales/
  site_categories/site_category_locales/blogs

driftboss-v2-extras.sql
  homepage SEO/site_locale
  about/contact/privacy/terms pages
  social links
```

Both exporters use deterministic UUIDv5 identifiers and idempotent UPSERT statements, so the same export can be applied repeatedly during testing.

### 1. Export the legacy data

Set the old Supabase/PostgreSQL connection string only in your shell/private env; never commit it:

```bash
export LEGACY_DATABASE_URL='postgresql://...'
```

Export the main dataset:

```bash
pnpm game:migrate:driftboss \
  --out=data/migrations/driftboss-v2.sql \
  --domain=driftbossgame.org \
  --featured=driftbossgame.org:drift-boss
```

Export site-level extras:

```bash
pnpm game:migrate:driftboss:extras -- \
  --out=data/migrations/driftboss-v2-extras.sql \
  --domain=driftbossgame.org
```

`--domain` is optional. Omit it when intentionally migrating every historical domain found in the legacy database.

Important mapping rule:

```text
legacy games                    -> global game_catalog
legacy seo_games(domain, game)  -> site_game + site_game_locale
```

The importer deliberately does **not** attach every global game to every site. A game is exposed by a site only when the legacy data contains site-specific SEO/content for that domain/game pair.

### 2. Review the generated SQL

Before importing anywhere, inspect counts printed by the exporter and review the SQL files for:

- expected domains only;
- expected featured game;
- no secret values;
- no unexpected site/game attachment;
- unique site-specific SEO copy.

Generated SQL files under `data/migrations/` should normally stay local and should not be committed when they contain real production content unless that is explicitly intended.

### 3. Dry-run into a fresh local SQLite database

Create a separate test database. Do not reuse your normal local development DB:

```bash
export DATABASE_PROVIDER=sqlite
export DATABASE_URL=file:data/driftboss-migration-check.db

pnpm db:setup
rm -f data/driftboss-migration-check.db
pnpm db:push
```

Apply the generated SQL with a SQLite/libSQL client, then verify at minimum:

```text
1 global Drift Boss game
1 site_game for driftbossgame.org
site_game_locale slug/content matches legacy DriftBoss data
homepage site_locale exists
about/contact/privacy/terms pages exist where legacy content existed
social_links setting is scoped only to the matching site
no other site's slug/content resolves under the DriftBoss site_id
```

CI performs the same class of test in `Game Site Engine Legacy Migration Smoke` using a temporary PostgreSQL legacy fixture and a fresh SQLite V2 database.

### 4. Apply schema migrations to D1 first

The target D1 must already contain the V2 schema before importing content:

```bash
npx wrangler d1 migrations apply <database-name> --remote
```

Verify the new tables exist before continuing.

### 5. Production D1 import — explicit confirmation boundary

Importing real legacy content into the shared production D1 is an irreversible production mutation. Do **not** automate this step without explicit confirmation.

After local validation and a backup/export of the target D1, apply in this order:

```bash
npx wrangler d1 execute <database-name> --remote \
  --file=data/migrations/driftboss-v2.sql

npx wrangler d1 execute <database-name> --remote \
  --file=data/migrations/driftboss-v2-extras.sql
```

The order matters because extras reference the `game_site` rows created by the main import.

### 6. Post-import validation

Before pointing the production domain at V2, verify:

```text
SITE_KEY=driftbossgame resolves exactly one active site
/
/game/drift-boss
/category/<expected-category>
/blog/<expected-post>
/about-us
/privacy-policy
/sitemap.xml
/robots.txt
```

Also compare old versus V2 URLs. Preserve existing indexed URLs whenever possible. Any intentional URL change requires a permanent redirect before cutover.

Keep the old production application/database untouched until the new Worker has passed this validation and the cutover can be rolled back safely.

## First production site initialization

For a brand-new site with no migration source, after migrations and RBAC/admin initialization:

1. log into Admin;
2. create the logical site with a `key` equal to the Worker's `SITE_KEY`;
3. add catalog games;
4. attach games to the site;
5. publish site-specific content;
6. publish/index categories;
7. verify sitemap/canonical/hreflang;
8. only then switch `DEPLOY_ENV=production` if the deployment was previously a preview/staging environment.

## Creating additional site Workers

Additional sites normally reuse:

- the same Git commit;
- the same D1 database;
- the same R2/storage infrastructure where appropriate;
- the same Game Catalog.

They change:

- Worker name;
- custom domain;
- `SITE_KEY`;
- `VITE_APP_URL` / site name;
- site-level settings/content/analytics/ads.

Do not create a new set of game tables per site.

## PostgreSQL / Supabase later

PostgreSQL is not a V1 production-support promise for the Game Domain. A parallel PostgreSQL schema is maintained to keep migration cost bounded.

When PostgreSQL becomes first-class, Supabase is treated as hosted PostgreSQL, not as a separate application data-access layer. Game modules should continue to use Drizzle services instead of Supabase SDK queries.

## Pre-launch checklist

Before making a Worker indexable:

- `SITE_KEY` resolves exactly one active `game_site`.
- domain in `game_site.domain` matches the production canonical domain.
- no site content was copied implicitly from another site's `site_game_locale` or `site_post_locale`.
- homepage loads only current-site games/categories/content.
- `/game/:slug` cannot resolve a game attached only to another site.
- static pages cannot resolve another site's `site_post` content.
- hreflang contains only actually published locale rows.
- sitemap contains only published/indexable current-site rows.
- `robots.txt` points to the correct site sitemap.
- embed pages are `noindex,nofollow`.
- admin APIs require Better Auth + `admin.*`.
- secrets are in Worker secrets/env, not Git or `site_setting`.


### Preview migration database policy

Production Game Site Workers may share the production Game Engine D1.

A **legacy data migration Preview** is different: use a dedicated Preview D1 so schema/import experiments, counter resets, RBAC initialization and sample data cannot affect shared production data.

For DriftBoss, use the authoritative checklist in `docs/HANDOFF.md §16`. The first sample export uses `--games=drift-boss,drive-mad,eggy-car`; `--domain` alone does not physically filter the global catalog.
