# Game Site Engine V2

## 1. Goal

`game-cms-v2` evolves from a generic ShipAny-based SaaS starter into a reusable **multi-site HTML5 Game CMS / Game Site Engine**.

The same codebase should power many independent game websites while keeping SEO content, indexing scope, branding, settings, analytics, and deployment isolated per site.

Core operating model:

```text
Shared code + shared game catalog + site-scoped content + one Worker deployment per site
```

The first production database is **Cloudflare D1**. PostgreSQL remains a future provider through Drizzle-compatible domain boundaries; Supabase is treated as one possible hosted PostgreSQL provider rather than a separate application platform.

## 2. Product principles

1. **One codebase, many sites.**
2. **Global game assets are shared; SEO content is never shared implicitly across sites.**
3. **Every public game lookup is site-scoped.**
4. **Read APIs have no side effects.** Views and votes use explicit mutation endpoints.
5. **Missing locale content does not create indexable fallback pages.**
6. **Sitemaps only contain pages that are published and indexable for the current site.**
7. **Game-domain code must not depend deeply on ShipAny internals.**
8. **D1 is the only first-class database in V1, but schema/query design should stay portable to PostgreSQL where practical.**
9. **One site = one Worker deployment** using the same Git commit and a different `SITE_KEY`.
10. **Do not rebuild infrastructure already solved well by the base project**: auth, RBAC, storage abstraction, i18n plumbing, admin shell, table/form primitives, Cloudflare deployment.

## 3. High-level architecture

```text
                         game-cms-v2
                              |
            +-----------------+------------------+
            |                                    |
      Platform / Core                       Game Domain
            |                                    |
   auth / rbac / db                         sites
   i18n / storage                           games
   admin primitives                         categories
   cloudflare                               site-games
                                            site-content
                                            site-settings
                                            posts
                                            stats
            |                                    |
            +-----------------+------------------+
                              |
                        TanStack Start
                              |
          +-------------------+-------------------+
          |                   |                   |
   DriftBoss Worker     Klotski Worker      Tekken3 Worker
   SITE_KEY=...         SITE_KEY=...        SITE_KEY=...
          |                   |                   |
          +-------------------+-------------------+
                              |
                         Shared D1 DB
```

## 4. Database strategy

### 4.1 V1 support

Officially supported runtime database:

```text
Cloudflare D1
```

SQLite is used for local development because it shares the same Drizzle dialect family.

### 4.2 Future provider

Future first-class provider:

```text
PostgreSQL
```

Examples:

- Supabase Postgres
- Neon
- Railway
- self-hosted PostgreSQL

V1 does **not** promise full PostgreSQL runtime compatibility. We keep a PostgreSQL game schema template and avoid unnecessary D1-specific SQL so adding official PostgreSQL support later is a contained task.

### 4.3 Avoid provider lock-in

Game-domain services must not call `env.DB.prepare()` directly. They go through Drizzle and module services.

Prefer portable features:

- primary/foreign keys
- unique constraints
- normal indexes
- joins
- where/order/limit
- insert/update/delete

Avoid making the domain dependent on:

- PostgreSQL arrays / JSONB operators
- database-specific triggers
- database-specific full-text search
- D1-only SQL features

## 5. Domain schema

The game domain lives in separate schema files from ShipAny's base schema:

```text
src/config/db/game-schema.sqlite.ts
src/config/db/game-schema.postgres.ts
src/config/db/game-schema.ts        # generated, gitignored
```

`db:setup` generates both `schema.ts` and `game-schema.ts` for the selected provider. Keeping the schemas separate reduces conflicts when syncing upstream ShipAny changes.

### 5.1 `game_site` (logical: sites)

Represents a logical website.

Important fields:

- `id`
- `key` — stable deployment identifier, e.g. `driftbossgame`
- `domain`
- `name`
- `status`
- `default_locale`
- `enabled_locales` — JSON text in V1 for D1/Postgres portability
- `logo_url`
- `favicon_url`
- timestamps

Cloudflare deployments use `SITE_KEY`, not a database ID.

### 5.2 `game_catalog` (logical: games)

Global game catalog. It describes the game itself, not its presentation on any site.

Fields include:

- `id`
- `key`
- `title`
- `description`
- `embed_url`
- `source_url`
- `image_url`
- `provider`
- `embed_type`
- `orientation`
- `aspect_ratio`
- `status`
- timestamps

SEO copy, indexability, site views, and site ordering do not belong here.

### 5.3 `site_game`

Core multi-site boundary.

A public game page can exist only when a `site_game` row connects the active site and the game.

Fields:

- `id`
- `site_id`
- `game_id`
- `status`
- `indexable`
- `featured`
- `hot`
- `sort_weight`
- `view_count`
- `like_count`
- `dislike_count`
- `published_at`
- timestamps

Constraint:

```text
UNIQUE(site_id, game_id)
```

### 5.4 `site_game_locale`

Complete site-specific localized page content for a game.

Fields:

- `site_game_id`
- `locale`
- `slug`
- `status`
- `title`
- `meta_title`
- `meta_description`
- `intro`
- `description`
- `content`
- `how_to_play`
- `controls`
- `features`
- `faq`
- timestamps

Constraints:

```text
UNIQUE(site_game_id, locale)
UNIQUE(site_id, locale, slug)   # enforced through service/schema design where practical
```

A different site using the same global game gets its own `site_game` and therefore its own SEO/content rows.

### 5.5 `game_category` (logical: categories)

Global taxonomy identity, e.g. `racing`, `drift`, `retro`.

### 5.6 `game_category_map`

Global factual classification of games.

### 5.7 `site_category`

Which categories a site exposes, their status, indexability, and order.

### 5.8 `site_category_locale`

Localized site-specific category title, slug and SEO content.

### 5.9 `site_game_category`

Final site-specific relationship used for navigation and related-game discovery.

### 5.10 `site_setting`

Key/value configuration rather than a PostgreSQL-only JSONB design.

```text
site_id | key                  | value
--------+----------------------+-----------------
...     | analytics.ga_id      | G-...
...     | ads.adsense_client   | ca-pub-...
...     | navigation           | JSON string
```

Secrets must stay in Cloudflare secrets/environment configuration, not `site_setting`.

## 6. Site Context

Each deployment has:

```env
SITE_KEY=driftbossgame
```

Request/server code resolves once:

```text
SITE_KEY -> game_site.key -> SiteContext
```

Example:

```ts
interface SiteContext {
  id: string;
  key: string;
  domain: string;
  name: string;
  defaultLocale: string;
  enabledLocales: string[];
}
```

Game-domain public services always receive `siteId` or SiteContext.

Allowed:

```ts
getPublishedSiteGame({ siteId, locale, slug })
```

Avoid:

```ts
getGame(slug)
```

## 7. Module boundaries

Target modules:

```text
src/modules/sites/
src/modules/games/
src/modules/site-games/
src/modules/categories/
src/modules/site-content/
src/modules/site-settings/
src/modules/stats/
```

Server route / loader flow:

```text
Route or loader
  -> module service
    -> Drizzle
      -> D1
```

UI components never query the database directly.

## 8. Public routing

Stable public routes:

```text
/
/game/:slug
/category/:slug
/blog/:slug
/guides/:slug
/embed/:slug
```

Locale prefixes continue to be handled by Paraglide/TanStack routing, with the default locale unprefixed and non-default locales prefixed.

Existing production URLs should be retained during migration wherever possible.

V1 intentionally does **not** ship a redirect table/router. Migration should therefore freeze existing indexed slugs. If a URL absolutely must change, create the permanent redirect at the Cloudflare edge (Redirect Rules or equivalent) before cutover and record it in the migration checklist. Do not cut over a changed slug first and "add redirects later".

## 9. SEO rules

Every indexable page generates from one canonical URL builder:

- title
- description
- canonical
- hreflang
- OpenGraph
- Twitter metadata
- JSON-LD

No cross-site SEO fallback is allowed.

Locale rules:

- default locale missing published content: page is unavailable or noindex based on state
- non-default locale missing content: do not generate the localized URL
- do not emit hreflang for missing/unpublished translations

Sitemap data sources are always current-site scoped and require both `published` and `indexable`.

Target sitemap layout:

```text
/sitemap.xml
/sitemap-pages.xml
/sitemap-games-1.xml
/sitemap-categories.xml
/sitemap-posts.xml
```

`lastmod` uses actual content `updated_at`, never build time.

## 10. Read/write behavior

GET/read functions are side-effect free.

Views:

```text
Client game loaded -> POST /api/game-view -> atomic view_count increment
```

Ratings:

```text
POST /api/game-rating -> atomic like/dislike update
```

Do not implement read-current-value + write-current+1 patterns.

## 11. Caching

Game sites are read-heavy and write-light.

Initial strategy uses HTTP/Cloudflare caching rather than building a custom distributed cache.

Suggested TTLs:

- SiteContext: 5–30 min
- Game detail: 5–30 min
- Category: 5–30 min
- Homepage: ~5 min
- Sitemap: 30–60 min

Use stale-while-revalidate where appropriate.

## 12. Deployment

Recommended model:

```text
one logical site = one Cloudflare Worker deployment
```

All deployments run the same code revision; configuration differs by `SITE_KEY`, public URL and secrets.

Do not use one Worker dynamically dispatching many hostnames in V1. Separate Workers give clearer rollback, caching, logs, configuration and failure isolation.

## 13. Admin plan

Reuse the existing ShipAny admin/RBAC/form/table primitives.

New admin areas:

- Sites
- Game Catalog
- Site Games
- Categories
- Game Content / SEO
- Posts / Guides
- Site Settings
- Analytics (later)

Game content editor selection hierarchy:

```text
Site -> Game -> Locale -> Content
```

## 14. Security

Admin mutation pipeline:

```text
Auth -> RBAC -> Zod validation -> module service -> DB
```

Rules:

- never pass arbitrary request JSON directly into Drizzle `.set()`
- URL-based asset import must block localhost/private/metadata IPs, restrict protocol, redirects, size, timeout and content type
- secrets never live in Git or `site_setting`
- production and preview robots rules differ; preview deployments should be noindex

## 15. ShipAny isolation and future template sale

The current base contains proprietary ShipAny code. Game-domain implementation should be kept as independent as possible.

Do not scatter ShipAny-specific APIs through Game Domain modules. Prefer narrow adapters around infrastructure such as auth, storage and configuration.

Commercial options after the engine is proven:

1. obtain an explicit redistribution/OEM/reseller license from ShipAny; or
2. replace the proprietary platform layer while retaining the independently developed Game Domain.

Until redistribution rights are confirmed, the repository should remain private and the code should not be resold as a source template.

## 16. Delivery phases

### Phase 0 — Foundation

- keep repository private
- document licensing boundary
- add `SITE_KEY`
- split Game Domain schema from base ShipAny schema
- D1 as official V1 provider
- keep PostgreSQL schema compatibility path

### Phase 1 — Domain model

Implement the physical tables (module names may stay plural/domain-oriented):

- `game_site`
- `game_catalog`
- `game_category`
- `game_category_map`
- `site_game`
- `site_game_locale`
- `site_category`
- `site_category_locale`
- `site_game_category`
- `site_setting`

Add services for Sites, Games and Site Games first.

### Phase 2 — Public MVP

- homepage
- game page
- category page
- embed page
- canonical/hreflang/JSON-LD
- current-site sitemap and robots

### Phase 3 — Admin

- Sites CRUD
- Catalog CRUD
- attach/detach games
- localized SEO/content editing
- categories/settings

### Phase 4 — DriftBoss migration

- import global games/categories
- map legacy domain+game_key to site/site_game
- migrate `seo_games` into localized site content
- retain URLs
- validate GSC/indexing/404/canonical behavior

### Phase 5 — Automation

Agent skills:

- `/new-game-site`
- `/import-games`
- `/generate-game-seo`
- `/deploy-game-site`
- `/site-seo-audit`

### Phase 6 — Commercialization

After multiple real sites run successfully, decide between hosted SaaS and source-template sales, then formalize licensing and PostgreSQL as a second first-class database provider.

## 17. Architecture acceptance rules

A change is inconsistent with V2 if it violates any of these rules:

1. Public game data is not scoped by site.
2. SEO content is stored globally on `games`.
3. A site can read another site's localized content through fallback.
4. Server pages call their own HTTP API instead of module services.
5. GET requests mutate views or votes.
6. Missing translations automatically become indexable fallback pages.
7. Sitemap includes global catalog rows not attached to the active site.
8. Business modules call D1 bindings directly.
9. Game Domain becomes tightly coupled to proprietary ShipAny internals.
10. Site-specific configuration is hardcoded throughout page components.
