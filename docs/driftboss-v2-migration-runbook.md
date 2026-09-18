# DriftBoss / Legacy Game CMS → Game Site Engine V2 Migration Runbook

This runbook migrates the existing `driftbossgame` PostgreSQL/Supabase data into the V2 Game Site Engine model without changing the legacy database.

## 1. Principles

- The legacy database is read-only during migration.
- A global legacy game is **not** automatically exposed on every site.
- `seo_games` is the authoritative legacy signal that a game belongs to a site.
- `seo_categories` is the authoritative legacy signal that a category belongs to a site.
- Site-specific SEO/content becomes `site_game_locale`, `site_category_locale`, `site_locale`, and `site_post_locale`.
- Legacy global view/like/dislike values are not considered valid per-site analytics. After import, V2 site counters are reset to zero.
- Generated SQL uses deterministic IDs and upserts so it can be regenerated and re-applied safely.

## 2. Required environment

```bash
export LEGACY_DATABASE_URL='postgresql://...'
```

Do not commit this value.

The source URL must point to the existing DriftBoss/Game CMS PostgreSQL database.

## 3. Audit the source first

For all domains:

```bash
pnpm game:migrate:driftboss:audit
```

For one site only:

```bash
pnpm game:migrate:driftboss:audit -- --domain=driftbossgame.org
```

The audit blocks migration when it finds conditions that would violate V2 uniqueness or isolation, including:

- duplicate `site + game + locale` rows;
- duplicate localized slugs;
- orphan game/category references;
- colliding generated site keys;
- malformed blog slugs.

It also reports whether optional legacy columns such as `locale`, `slug`, `meta_title`, and `updated_at` actually exist. Older databases without them fall back to English/default values.

Do not continue until the audit prints `PASS`.

## 4. Generate core migration SQL

### Filtered Preview sample

For the first visual Preview, export only the three selected games:

```bash
pnpm game:migrate:driftboss -- \
  --domain=driftbossgame.org \
  --games=drift-boss,drive-mad,eggy-car \
  --featured=driftbossgame.org:drift-boss \
  --out=data/migrations/driftboss-v2.sql
```

With `--games`, the exporter filters the global catalog and game-category mappings as well as site attachment rows. It also defaults to `--include-posts=false`, so legacy blog articles do not make the small Preview unexpectedly large.

The selected Drift Boss `zh` locale fixture is still exported because it belongs to `drift-boss`.

### Full production export

After Preview approval, regenerate the same filename **without `--games`**:

```bash
pnpm game:migrate:driftboss -- \
  --domain=driftbossgame.org \
  --featured=driftbossgame.org:drift-boss \
  --out=data/migrations/driftboss-v2.sql
```

A full domain export attaches only that site's `seo_games`, but imports the complete global catalog for reuse by the shared production Game Engine D1.

This exports:

- `game_site`;
- `game_catalog`;
- `game_category`;
- `game_category_map`;
- `site_game`;
- `site_game_locale`;
- `site_category`;
- `site_category_locale`;
- `site_game_category`;
- legacy blogs into site-scoped posts.

Important: only games with a matching legacy `seo_games` row become `site_game` records. This intentionally prevents the old shared global catalog from leaking unrelated games into a vertical site.

Legacy content mapping is deliberately conservative: `games.description` maps to `site_game_locale.description`, and `seo_games.seo_content` maps to `site_game_locale.content`. V2 fields `how_to_play`, `controls`, `features`, and `faq` remain empty during first migration unless an explicit trustworthy source exists. Enrich them after cutover rather than heuristically splitting old Markdown.

## 5. Generate site-level extras

```bash
pnpm game:migrate:driftboss:extras -- \
  --domain=driftbossgame.org \
  --out=data/migrations/driftboss-v2-extras.sql
```

This exports:

- homepage/site SEO → `site_locale`;
- About Us / Contact Us / Privacy Policy / Terms → `site_post` + `site_post_locale` pages;
- social links → `site_setting.social_links`.

## 6. Generate the stats reset

```bash
pnpm game:migrate:driftboss:reset-stats -- \
  --domain=driftbossgame.org \
  --out=data/migrations/driftboss-v2-reset-stats.sql
```

Why this step is mandatory:

Legacy `games.view` is a global value shared across domains. V2 stores counters on `site_game`, where they represent traffic for one site. Copying the same legacy number into several sites would create fake site-level analytics.

The reset SQL sets:

```text
view_count = 0
like_count = 0
dislike_count = 0
```

for the migrated site's `site_game` rows. Real V2 counters start accumulating after cutover.

## 7. Review generated SQL before applying

At minimum inspect:

```bash
wc -l data/migrations/driftboss-v2*.sql

grep -n "INSERT INTO game_site" data/migrations/driftboss-v2.sql
grep -n "INSERT INTO site_game " data/migrations/driftboss-v2.sql | head
grep -n "INSERT INTO site_game_locale" data/migrations/driftboss-v2.sql | head
grep -n "INSERT INTO site_post" data/migrations/driftboss-v2*.sql | head
```

Check that:

- the domain is correct;
- only intended games are attached to the site;
- `drift-boss` is featured if requested;
- URLs/slugs match the legacy public URLs you need to preserve;
- no unrelated game's `site_game` row appears for this site.

## 8. Test against local SQLite first

Create a fresh local DB:

```bash
DATABASE_PROVIDER=sqlite \
DATABASE_URL=file:data/migration-test.db \
pnpm db:push
```

Apply the three generated files in this order:

```bash
DATABASE_URL=file:data/migration-test.db \
pnpm game:migrate:apply -- \
  data/migrations/driftboss-v2.sql \
  data/migrations/driftboss-v2-extras.sql \
  data/migrations/driftboss-v2-reset-stats.sql
```

Then inspect with Drizzle Studio or SQLite tooling.

Useful checks:

```sql
SELECT key, domain, name FROM game_site;

SELECT sg.id, g.key, sg.status, sg.indexable, sg.featured
FROM site_game sg
JOIN game_catalog g ON g.id = sg.game_id;

SELECT locale, slug, title, status
FROM site_game_locale
ORDER BY slug, locale;

SELECT type, status, indexable
FROM site_post;
```

## 9. Apply to D1

### Preview target

Use a **dedicated disposable Preview D1** for the filtered sample. Do not import sample data into the shared production D1.

Example:

```bash
npx wrangler d1 create game-site-engine-driftboss-preview
npx wrangler d1 migrations apply game-site-engine-driftboss-preview --remote
```

### Import order

Apply the generated SQL:

```bash
npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/driftboss-v2.sql

npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/driftboss-v2-extras.sql

npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/driftboss-v2-reset-stats.sql
```

The generated SQL is idempotent. A disposable Preview D1 can be recreated instead of manually cleaned.

For the later full production migration, switch the commands to the shared production Game Engine D1 and back it up/export it first.

## 10. Bootstrap Admin and deploy a Preview Worker

Use the same production `SITE_KEY`, but deploy to a Preview Worker/domain backed by the dedicated Preview D1.

If Admin UI validation is needed, bootstrap a fresh Preview admin first:

```bash
export GAME_ADMIN_EMAIL='admin@example.com'
export GAME_ADMIN_PASSWORD='<strong-local-secret>'

pnpm game:admin:bootstrap:sql -- \
  --out=data/migrations/d1-preview-admin-bootstrap.sql

npx wrangler d1 execute game-site-engine-driftboss-preview --remote \
  --file=data/migrations/d1-preview-admin-bootstrap.sql

rm -f data/migrations/d1-preview-admin-bootstrap.sql
unset GAME_ADMIN_PASSWORD
```

Do not use `pnpm rbac:init` against remote D1; that script is for directly connectable SQLite/libSQL/Postgres/MySQL databases.

Materialize the Worker config:

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

Then set secrets and build/deploy:

```bash
npx wrangler secret put AUTH_SECRET
pnpm cf:build
pnpm cf:deploy
```

The site row still contains the canonical production domain `driftbossgame.org`, while `VITE_APP_URL` is the Preview origin. That allows you to test the Preview Worker while verifying production canonical URLs.

Preview `robots.txt` must remain `Disallow: /`.

## 11. Run the cutover audit

Example:

```bash
pnpm game:audit:cutover -- \
  --base=https://preview-worker.example.workers.dev \
  --canonical=https://driftbossgame.org \
  --game=drift-boss \
  --category=drift-games \
  --blog=example-blog-slug \
  --pages=about-us,privacy-policy,terms-of-service \
  --not-found=tekken-3,mahjong-link \
  --expect-indexable=false
```

The audit checks:

- HTTP status;
- canonical URL;
- hreflang/x-default behavior;
- Game JSON-LD URL alignment;
- sitemap inclusion;
- robots mode;
- explicit 404s for games that belong to another site.

The `--not-found` checks are especially important: they are a direct regression test for the old architecture's shared-catalog exposure problem.

## 12. Production cutover

Only after preview audit passes:

1. switch/deploy the production Worker;
2. set `DEPLOY_ENV=production`;
3. bind the production domain;
4. re-run the cutover audit against the real domain with `--expect-indexable=true`;
5. verify `/robots.txt` and `/sitemap.xml` manually;
6. check Google Search Console for 404/canonical/indexing regressions.

## 13. Do not delete the legacy database immediately

Keep the old database read-only for at least one rollback window after cutover.

Recommended sequence:

```text
legacy production remains live
        ↓
V2 preview + migrated copy
        ↓
cutover audit passes
        ↓
DNS / Worker cutover
        ↓
monitor logs + GSC
        ↓
legacy becomes read-only rollback source
        ↓
retire later
```

## 14. Migration acceptance criteria

A site is ready to cut over only when all are true:

- `SITE_KEY` resolves to exactly one active site;
- expected game URLs return 200;
- unrelated site games return 404;
- legacy public URLs are preserved or intentionally redirected;
- canonical and JSON-LD URLs match;
- sitemap contains only current-site published/indexable content;
- missing translations are absent rather than silently falling back;
- legal pages and blog content render;
- preview robots are noindex/disallow;
- production robots are indexable;
- per-site counters start from zero after migration.
