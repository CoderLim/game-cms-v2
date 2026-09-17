# DriftBoss Legacy → Game Site Engine V2 Migration

This migration moves data from the legacy `CoderLim/driftbossgame` PostgreSQL/Supabase schema into the V2 D1-first Game Site Engine without recreating the old cross-site exposure problem.

## Migration policy

The legacy database has a shared `games` catalog and uses `domain` on `seo_games`, `seo_categories`, `blogs`, and `game_sites` to separate sites.

V2 mapping:

| Legacy | V2 |
| --- | --- |
| `games` | `game_catalog` |
| `categories` | `game_category` |
| `game_categories` | `game_category_map` |
| `game_sites` | `game_site` |
| `seo_games(domain, game_key)` | `site_game` + `site_game_locale` |
| `seo_categories(domain, category)` | `site_category` + `site_category_locale` |
| `game_categories` intersected with site exposure | `site_game_category` |
| `blogs(domain, slug)` | `site_post` + `site_post_locale` |

### Important safety rule

A global legacy game is attached to a V2 site **only when that domain has a `seo_games` row for the game**.

The migration intentionally does not map every row in the shared legacy `games` catalog to every site. This is what prevents URLs such as an unrelated site's `/game/drift-boss` from reappearing after migration.

## 1. Prepare the V2 database

Generate/apply the current V2 schema first.

Local SQLite:

```bash
pnpm db:setup
pnpm db:push
```

Remote D1:

```bash
pnpm db:generate
npx wrangler d1 migrations apply <database-name> --remote
```

Do not import migration data before the schema containing `game_site`, `game_catalog`, `site_game`, `site_game_locale`, category tables, and `site_post` tables has been applied.

## 2. Export legacy data as V2 SQL

Use a read-capable connection string for the old Supabase/Postgres database.

Do not commit the connection string or generated SQL to Git.

```bash
LEGACY_DATABASE_URL='postgresql://...' \
  pnpm game:migrate:driftboss -- \
  --out=data/migrations/driftboss-v2.sql
```

Export only one domain during initial validation:

```bash
LEGACY_DATABASE_URL='postgresql://...' \
  pnpm game:migrate:driftboss -- \
  --domain=driftbossgame.org \
  --out=data/migrations/driftbossgame-v2.sql
```

Mark a known primary game as featured during export:

```bash
LEGACY_DATABASE_URL='postgresql://...' \
  pnpm game:migrate:driftboss -- \
  --domain=driftbossgame.org \
  --featured=driftbossgame.org:drift-boss \
  --out=data/migrations/driftbossgame-v2.sql
```

Multiple featured pairs can be comma separated when exporting several sites.

The exporter is read-only against the legacy database.

## 3. Inspect the generated SQL

Before applying it, check the summary printed by the exporter and inspect counts in the SQL.

Expected properties:

- deterministic UUIDv5 identifiers
- `ON CONFLICT` upserts so the import can be repeated
- global catalog imported once
- site games sourced from legacy site-specific SEO rows
- site categories sourced from legacy site-specific category SEO rows
- blog rows converted to site-scoped posts
- locale defaults to `en` when the old row has no locale column/value

Historical databases may contain runtime columns that are absent from the checked-in old `schema.sql` (for example `locale` or `meta_title`). The exporter reads `SELECT *` and consumes those fields when present.

## 4. Validate in local SQLite first

Create a clean local database, then import the SQL.

```bash
rm -f data/migration-test.db
DATABASE_PROVIDER=sqlite DATABASE_URL=file:data/migration-test.db pnpm db:push
sqlite3 data/migration-test.db < data/migrations/driftbossgame-v2.sql
```

Run these checks:

```sql
SELECT key, domain, name FROM game_site;

SELECT s.domain, COUNT(*) AS games
FROM site_game sg
JOIN game_site s ON s.id = sg.site_id
GROUP BY s.domain;

SELECT s.domain, l.locale, COUNT(*) AS localized_games
FROM site_game_locale l
JOIN game_site s ON s.id = l.site_id
GROUP BY s.domain, l.locale;

SELECT s.domain, COUNT(*) AS posts
FROM site_post p
JOIN game_site s ON s.id = p.site_id
GROUP BY s.domain;
```

For the first DriftBoss validation, also verify there are no games attached to the site unless the old database had a corresponding `seo_games` row.

## 5. Import to D1

After local validation:

```bash
npx wrangler d1 execute <database-name> \
  --remote \
  --file=data/migrations/driftbossgame-v2.sql
```

The generated file is transactional and idempotent, so it can be re-run after fixing data mapping issues.

## 6. Configure the Worker

For the DriftBoss Worker:

```jsonc
{
  "vars": {
    "DATABASE_PROVIDER": "d1",
    "SITE_KEY": "driftbossgame",
    "DEPLOY_ENV": "production"
  }
}
```

`SITE_KEY` must match the generated `game_site.key`.

## 7. URL/SEO acceptance checks

Before switching the production domain, compare the old production site and V2 for:

- `/`
- important `/game/:slug` URLs
- important `/category/:slug` URLs
- `/blog/:slug`
- `/guides/:slug` where applicable
- canonical URL
- hreflang
- title / meta description
- JSON-LD
- sitemap membership
- robots behavior

Existing indexed URLs should be preserved whenever possible. Any intentionally changed URL requires a permanent redirect.

## 8. What is not migrated automatically

The exporter deliberately does not guess ambiguous business intent:

- which game should be `featured` unless provided via `--featured`
- `hot` status
- new V2 `sort_weight`
- site navigation/footer/theme settings
- analytics and ad configuration
- secrets
- precise per-site historical views when the old view counter was global

Legacy `games.view` is copied only as an initial `site_game.view_count` for a migrated site-game row. Treat this as legacy popularity, not precise per-domain analytics.

## 9. Production cutover strategy

Migrate one site first, preferably `driftbossgame.org`.

Recommended order:

1. export only `driftbossgame.org`
2. import into a test/local database
3. verify page counts and critical URLs
4. import into production D1
5. deploy a preview Worker with `DEPLOY_ENV=preview`
6. crawl preview pages while robots remains blocked
7. switch the production route/domain
8. set `DEPLOY_ENV=production`
9. validate GSC, sitemap, canonical and 404 logs
10. only then migrate Klotski / Tekken3

Do not migrate every site in one cutover.