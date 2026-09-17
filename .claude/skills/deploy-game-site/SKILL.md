---
name: deploy-game-site
description: "Prepare and deploy one Game Site Engine site to Cloudflare Workers using a shared D1 database and a site-specific SITE_KEY. Use when the user says deploy a game site, publish a new game site, ship SITE_KEY to Cloudflare, or asks to deploy DriftBoss/Klotski/Tekken from this engine."
argument-hint: "--site-key=X --domain=X [--worker=X --site-name=X --database-id=X --database-name=X --production]"
user-invocable: true
---

# Deploy Game Site — $ARGUMENTS

This skill deploys one logical Game Site Engine site as its own Cloudflare Worker while reusing the shared Game Engine D1 database.

## Architecture contract

Do not turn this into one Worker serving multiple hostnames.

```text
same Git commit
  ├─ Worker A: SITE_KEY=driftbossgame
  ├─ Worker B: SITE_KEY=klotski
  └─ Worker C: SITE_KEY=tekken3
        ↓
     shared D1
```

Every Worker must have a distinct `SITE_KEY` and canonical domain. Multiple Workers may intentionally use the same `database_id`.

## Hard safety rules

1. Never create a new D1 automatically when a shared Game Engine D1 already exists.
2. Never import or migrate production content without explicit confirmation.
3. Never switch `DEPLOY_ENV` to `production` before preview/cutover audit passes.
4. Never echo Cloudflare secrets.
5. Never commit `wrangler.jsonc`; it is a local generated deployment file.
6. `SITE_KEY` must already correspond to a `game_site.key` row before a production cutover.
7. Final `wrangler deploy` requires explicit confirmation because it changes a live deployment.

## Inputs

Required:

- `--site-key`: stable `game_site.key`, e.g. `driftbossgame`
- `--domain`: canonical domain, e.g. `driftbossgame.org`

Optional:

- `--worker`: Worker name; defaults to `site-key`
- `--site-name`: public name; defaults to `site-key`
- `--database-id`: shared D1 id
- `--database-name`: defaults to `game-site-engine-db`
- `--production`: prepare production robots/indexing mode; otherwise default to preview

## Phase 1 — preflight

Check:

```bash
pnpm build
npx wrangler whoami
```

Verify the branch has passing Game Engine CI if GitHub status is available:

- Build and Push Docker Image
- Game Site Engine Smoke
- Game Site Engine Migrations
- Game Site Engine Legacy Migration Smoke

Stop on build/test failure.

## Phase 2 — resolve shared D1

Preferred order:

1. If `--database-id` is supplied, use it.
2. Else if local `wrangler.jsonc` already contains a real Game Engine D1 id, reuse it.
3. Else inspect `npx wrangler d1 list` for `--database-name` / `game-site-engine-db`.
4. Only if no shared DB exists, explain that the first Game Engine D1 needs to be created and ask before creating it.

Do not silently create one database per site.

## Phase 3 — confirm logical site exists

Before deployment, ensure the shared DB contains the site row.

For D1:

```bash
npx wrangler d1 execute <database-name> --remote \
  --command="SELECT id,key,domain,status FROM game_site WHERE key='<site-key>'" --json
```

Expected:

- exactly one row
- `status=active`
- domain matches the intended canonical domain

If absent, use the Admin UI or an approved seed/import flow to create it. Do not synthesize production site content during deployment.

## Phase 4 — materialize Worker config

Default to preview:

```bash
pnpm tsx scripts/configure-game-site-worker.ts \
  --site-key=<site-key> \
  --domain=<domain> \
  --worker=<worker> \
  --site-name="<site-name>" \
  --database-id=<shared-d1-id> \
  --database-name=<shared-d1-name> \
  --deploy-env=preview
```

If `--production` was explicitly requested, use `--deploy-env=production`, but only after a preview audit has already passed for the same site/content revision.

Inspect `wrangler.jsonc` for:

```text
DATABASE_PROVIDER=d1
SITE_KEY=<site-key>
DEPLOY_ENV=preview|production
VITE_APP_URL=https://<domain>
DB binding=<shared D1>
```

## Phase 5 — schema migrations

Shared D1 schema is global. Apply migrations once per schema revision, not once because a new site exists.

Check:

```bash
npx wrangler d1 migrations list <database-name> --remote
```

Then apply missing migrations only:

```bash
npx wrangler d1 migrations apply <database-name> --remote
```

Do not rerun legacy data import unless intentionally migrating content.

## Phase 6 — build preview Worker

Run:

```bash
pnpm cf:build
```

The generated bundle must contain the site-specific `SITE_KEY` configuration.

## Phase 7 — deploy confirmation

Before `wrangler deploy`, summarize:

```text
Worker
SITE_KEY
Canonical domain
DEPLOY_ENV
Shared D1 name/id
Migration status
```

Ask for confirmation only at this irreversible deployment boundary.

Then deploy:

```bash
pnpm cf:deploy
```

## Phase 8 — preview audit

Keep `DEPLOY_ENV=preview` for first deployment so robots blocks indexing.

Run:

```bash
pnpm tsx scripts/audit-game-site-cutover.ts \
  --base=https://<preview-worker-url> \
  --canonical=https://<domain> \
  --game=<representative-game-slug> \
  --expect-indexable=false
```

When known, also pass:

```text
--category=<slug>
--blog=<slug>
--guide=<slug>
--pages=about-us,privacy-policy,terms-of-service
--not-found=<game-slug-known-to-belong-to-another-site>
```

The `--not-found` check is important: it detects a regression of the old shared-catalog cross-site exposure bug.

## Phase 9 — production cutover

Only after preview audit passes:

1. bind/route the intended custom domain;
2. regenerate config with `--deploy-env=production`;
3. deploy again with explicit confirmation;
4. rerun cutover audit with `--expect-indexable=true`;
5. verify sitemap and key URLs in GSC;
6. keep the previous production app/data available for rollback until indexing and traffic look healthy.

## First-site migration note

For DriftBoss legacy migration, follow `docs/driftboss-migration.md` first. The data path is deliberately separate from deployment:

```text
legacy Postgres
  → source audit
  → deterministic SQL exporters
  → local SQLite dry-run
  → target D1 import (confirmed)
  → preview Worker
  → cutover audit
  → production route
```

Do not combine data migration and production DNS cutover into one unreviewed action.
