# DriftBoss Legacy → Game Site Engine V2 Migration

This migration moves data from the legacy `CoderLim/driftbossgame` PostgreSQL/Supabase schema into the V2 D1-first Game Site Engine without recreating the old cross-site exposure problem.

## Migration policy

The legacy database has a shared `games` catalog and uses `domain` on `seo_games`, `seo_categories`, `blogs`, `game_sites`, and `social_links` to separate sites.

V2 mapping:

| Legacy | V2 |
| --- | --- |
| `games` | `game_catalog` |
| `categories` | `game_category` |
| `game_categories` | `game_category_map` |
| `game_sites` | `game_site` |
| `game_sites.meta_* / seo_content` | `site_locale` |
| `game_sites.about/contact/privacy/terms` | `site_post(type=page)` + `site_post_locale` |
| `seo_games(domain, game_key)` | `site_game` + `site_game_locale` |
| `seo_categories(domain, category)` | `site_category` + `site_category_locale` |
| `game_categories` intersected with site exposure | `site_game_category` |
| `blogs(domain, slug)` | `site_post` + `site_post_locale` |
| `social_links(domain, ...)` | `site_setting.social_links` |

### Important safety rule

A global legacy game is attached to a V2 site **only when that domain has a `seo_games` row for the game**.

The migration intentionally does not map every row in the shared legacy `games` catalog to every site. This prevents URLs such as an unrelated site's `/game/drift-boss` from reappearing after migration.

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

Do not import migration data before the schema containing the Game Domain and Game Content tables has been applied.

## 2. Audit the real legacy source before export

The checked-in `driftbossgame/db/schema.sql` is historical and may not exactly match the current production Supabase database. In particular, runtime databases may have optional columns such as `locale`, `slug`, `meta_title`, `title`, or `updated_at` that are not present in the old schema file.

Always run the read-only source audit against the real legacy database first:

```bash
LEGACY_DATABASE_URL='postgresql://...' \
  pnpm game:migrate:driftboss:audit -- \
  --domain=driftbossgame.org
```

The audit blocks export when it finds:

- orphan game/category references;
- duplicate site+game+locale rows;
- duplicate localized URLs;
- blog slug collisions;
- `SITE_KEY` collisions after domain normalization.

It also prints a **Schema capabilities** section showing which optional legacy columns actually exist. Missing optional columns are not automatically fatal: exporters deliberately fall back to `en`, the global game/category title, the historical key-derived slug, or `created_at` where appropriate. The important point is that this fallback is visible before export rather than silently assumed.

Do not continue to production export if the audit reports blocking issues.

## 3. Export legacy data as V2 SQL

Use a read-only connection string for the old Supabase/Postgres database.

Do not commit the connection string or generated production SQL to Git.

For the first Preview, generate a genuinely filtered three-game sample:

```bash
export LEGACY_DATABASE_URL='postgresql://READ_ONLY_...'

pnpm game:migrate:driftboss -- \
  --domain=driftbossgame.org \
  --games=drift-boss,drive-mad,eggy-car \
  --featured=driftbossgame.org:drift-boss \
  --out=data/migrations/driftboss-v2.sql

pnpm game:migrate:driftboss:extras -- \
  --domain=driftbossgame.org \
  --out=data/migrations/driftboss-v2-extras.sql

pnpm game:migrate:driftboss:reset-stats -- \
  --domain=driftbossgame.org \
  --out=data/migrations/driftboss-v2-reset-stats.sql
```

`--games` filters the global `game_catalog`, related global categories/mappings, and site-owned game/category rows. This is different from `--domain` alone: a full domain export without `--games` still imports the complete global catalog for the shared production engine.

Filtered mode defaults to omitting legacy blog articles. Site-level homepage/legal/social extras are still exported because they are small and useful for Preview validation.

After Preview approval, regenerate `driftboss-v2.sql` without `--games` for the full production migration. Full mode includes legacy blog posts by default.

Multiple featured game pairs can be comma-separated in `--featured`.

All exporters are read-only against the legacy database and generate deterministic/idempotent SQL.

## 4. Inspect the generated SQL

Before applying it, check the exporter summaries and inspect both SQL files.

Expected properties:

- expected domains only;
- global catalog imported once;
- site games sourced only from legacy site-specific SEO rows;
- each site keeps its own slug/meta/body content;
- homepage SEO is site-scoped;
- legal/contact pages are `type=page` records;
- social links are stored only on their matching site;
- no secrets are included;
- generated IDs are stable across repeated exports.

Historical databases may contain runtime columns absent from the checked-in old `schema.sql` (for example `locale`, `meta_title`, or `slug`). The exporter reads `SELECT *` and consumes those fields when present.

## 5. Validate in local SQLite first

Create a clean local database. Never use your normal development database for the migration dry-run.

```bash
rm -f data/migration-test.db
export DATABASE_PROVIDER=sqlite
export DATABASE_URL=file:data/migration-test.db

pnpm db:setup
pnpm db:push
```

Apply the generated files in order:

```bash
pnpm game:migrate:apply -- \
  data/migrations/driftboss-v2.sql \
  data/migrations/driftboss-v2-extras.sql \
  data/migrations/driftboss-v2-reset-stats.sql
```

Validate:

```sql
SELECT key, domain, name FROM game_site;

SELECT s.domain, COUNT(*) AS games
FROM site_game sg
JOIN game_site s ON s.id = sg.site_id
GROUP BY s.domain;

SELECT s.domain, l.locale, l.slug, l.meta_title
FROM site_game_locale l
JOIN game_site s ON s.id = l.site_id
ORDER BY s.domain, l.locale, l.slug;

SELECT s.domain, sl.locale, sl.meta_title
FROM site_locale sl
JOIN game_site s ON s.id = sl.site_id;

SELECT s.domain, p.type, l.slug
FROM site_post p
JOIN site_post_locale l ON l.site_post_id = p.id
JOIN game_site s ON s.id = p.site_id
ORDER BY s.domain, p.type, l.slug;
```

For DriftBoss specifically, verify there are no games attached to the site unless the old database had a corresponding `seo_games` row.

The CI workflow `Game Site Engine Legacy Migration Smoke` automatically tests this full chain using:

```text
temporary legacy PostgreSQL
  → main exporter
  → extras exporter
  → clean V2 SQLite schema
  → SQL import
  → cross-site isolation assertions
```

Its fixture deliberately puts the same `drift-boss` global game on two sites with different slugs and SEO content, so a regression that merges/cross-falls-back content fails CI.

## 6. Import to D1

For the filtered visual Preview, use a dedicated disposable D1:

```bash
npx wrangler d1 create game-site-engine-driftboss-preview
npx wrangler d1 migrations apply game-site-engine-driftboss-preview --remote
```

Import in this order:

```bash
npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/driftboss-v2.sql

npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/driftboss-v2-extras.sql

npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/driftboss-v2-reset-stats.sql
```

The order matters: extras reference `game_site` rows created by the main import, and the mandatory stats reset must happen after site games exist.

For the later full production migration, back up the shared production D1 first, regenerate the full SQL without `--games`, then apply the same three-file order to that shared production database.

## 7. Configure the Worker

Do not hand-edit `wrangler.example.jsonc`. Materialize the local gitignored config with:

```bash
pnpm game:worker:configure -- \
  --site-key=driftbossgame \
  --domain=driftbossgame.org \
  --app-url=https://<preview-worker>.workers.dev \
  --worker=driftboss-v2-preview \
  --site-name="Drift Boss Preview" \
  --database-id=<PREVIEW_D1_ID> \
  --database-name=game-site-engine-driftboss-preview \
  --deploy-env=preview
```

`SITE_KEY` must match the generated `game_site.key`.

`VITE_APP_URL` is the actual Preview origin. Canonical URLs still come from `game_site.domain=driftbossgame.org`.

Keep `DEPLOY_ENV=preview` while validating so robots blocks indexing before cutover.

Set `AUTH_SECRET` as a Worker secret, never a committed var:

```bash
npx wrangler secret put AUTH_SECRET
```

## 8. URL/SEO acceptance checks

Deploy a preview Worker and run the reusable audit while its canonical still points at the intended production domain:

```bash
pnpm game:audit:cutover -- \
  --base=https://<preview-worker>.workers.dev \
  --canonical=https://driftbossgame.org \
  --game=drift-boss \
  --pages=about-us,privacy-policy,terms-of-service \
  --expect-indexable=false
```

The audit checks:

- critical pages return 200;
- canonical points to the intended production domain;
- JSON-LD URL matches game canonical;
- hreflang sets include `x-default` when alternates are emitted;
- preview robots contains `Disallow: /`;
- robots points to the correct canonical sitemap URL;
- sitemap uses the canonical production origin;
- explicitly supplied cross-site game slugs return 404 and never leak into sitemap.

For example, pass known games that should not exist on DriftBoss with:

```bash
--not-found=tekken-3,mahjong-link
```

Also manually compare the old production site and V2 for important:

- `/game/:slug` URLs;
- `/category/:slug` URLs;
- `/blog/:slug`;
- `/guides/:slug`;
- root static pages;
- hreflang;
- title/meta description;
- JSON-LD;
- sitemap membership.

Existing indexed URLs should be preserved whenever possible. V1 has no redirect table; freeze legacy slugs for migration. If a URL must change, create a permanent Cloudflare redirect before cutover.

## 9. Production cutover

Recommended order:

1. audit the real legacy source database;
2. export only `driftbossgame.org`;
3. dry-run both SQL files locally;
4. compare row/page counts;
5. back up target D1;
6. import both files into production D1;
7. deploy a preview Worker with `DEPLOY_ENV=preview`;
8. run `audit-game-site-cutover.ts` against preview;
9. verify important old URLs manually;
10. switch production route/domain;
11. set `DEPLOY_ENV=production`;
12. run audit again with `--expect-indexable=true`;
13. validate GSC, sitemap, canonical and 404 logs;
14. only then migrate Klotski / Tekken3.

Keep the legacy production application/database intact until rollback is no longer needed.

## 10. What is not migrated automatically

The exporters deliberately do not guess ambiguous business intent:

- which game should be `featured` unless provided via `--featured`;
- `hot` status;
- new V2 `sort_weight` strategy;
- custom theme/navigation/footer decisions beyond migrated social links;
- analytics and ad configuration;
- secrets;
- precise per-site historical views when the old view counter was global;
- structured `how_to_play`, `controls`, `features`, and `faq` fields.

Legacy `games.description` maps to V2 `description`; legacy `seo_games.seo_content` maps to V2 `content`. The richer structured fields are intentionally left empty rather than heuristically splitting historical Markdown.

Legacy `games.view` may be present in the main export for compatibility, but the mandatory reset-stats SQL zeros V2 per-site counters before cutover. Treat legacy values only as historical popularity, never precise per-domain analytics.
