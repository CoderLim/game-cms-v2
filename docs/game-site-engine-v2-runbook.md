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

The same rule applies to site categories.

Do not publish a locale until real localized content exists. Missing locale content must not fall back to another site's content or automatically create an indexable page.

## Admin workflow

Typical workflow for a new site:

1. `/admin/game-sites` — create the logical site.
2. `/admin/game-catalog` — add/import reusable global game assets.
3. `/admin/site-games` — attach games to the site.
4. `/admin/site-games` — create unique localized slug/SEO/content and publish it.
5. `/admin/game-categories` — create global category identities, attach them to the site, publish localized category content, and assign site games.
6. Verify `/sitemap.xml` before production launch.

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

## First production site initialization

After migrations and RBAC/admin initialization:

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
- no site content was copied implicitly from another site's `site_game_locale`.
- homepage loads only current-site games/categories.
- `/game/:slug` cannot resolve a game attached only to another site.
- hreflang contains only actually published locale rows.
- sitemap contains only published/indexable current-site rows.
- `robots.txt` points to the correct site sitemap.
- embed pages are `noindex,nofollow`.
- admin APIs require Better Auth + `admin.*`.
- secrets are in Worker secrets/env, not Git or `site_setting`.
