import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import postgres from 'postgres';
import { v5 as uuidv5 } from 'uuid';

/**
 * Export the legacy driftbossgame PostgreSQL/Supabase database into an
 * idempotent D1/SQLite-compatible SQL file for Game Site Engine V2.
 *
 * Usage:
 *   LEGACY_DATABASE_URL='postgresql://...' \
 *     pnpm tsx scripts/export-driftboss-v2-sql.ts \
 *       --out=data/migrations/driftboss-v2.sql
 *
 * Optional:
 *   --domain=driftbossgame.org     Export only one legacy domain.
 *   --games=drift-boss,drive-mad   Export only these global games and the
 *                                 categories/mappings needed by them.
 *   --include-posts=true|false      Defaults to false when --games is set,
 *                                 otherwise true.
 *   --featured=driftbossgame.org:drift-boss
 *                                 Mark a site/game pair as featured.
 *
 * Safety rules:
 * - Reads the legacy DB only; it never mutates it.
 * - A global game becomes a site_game only when that domain has a seo_games
 *   row. We intentionally do NOT attach the entire global catalog to every site.
 * - The SQL uses deterministic UUIDv5 IDs and INSERT ... ON CONFLICT updates,
 *   so the generated import is repeatable.
 */

const NAMESPACE = 'f4c48c70-99cb-4cbb-85dc-8f66dbaf7657';
const legacyUrl = process.env.LEGACY_DATABASE_URL;
if (!legacyUrl) {
  throw new Error('LEGACY_DATABASE_URL is required');
}

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const index = arg.indexOf('=');
    return index === -1 ? [arg.replace(/^--/, ''), 'true'] : [arg.slice(2, index), arg.slice(index + 1)];
  })
);

const outputPath = resolve(args.get('out') || 'data/migrations/driftboss-v2.sql');
const onlyDomain = normalizeDomain(args.get('domain') || '');
const onlyGameKeys = new Set(
  (args.get('games') || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);
const includePosts = args.has('include-posts')
  ? String(args.get('include-posts')).toLowerCase() !== 'false'
  : onlyGameKeys.size === 0;
const featuredPairs = new Set(
  (args.get('featured') || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

function siteKey(domain: string) {
  return normalizeDomain(domain)
    .replace(/\.[a-z0-9-]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function id(scope: string, value: string) {
  return uuidv5(`${scope}:${value}`, NAMESPACE);
}

function q(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  const dateValue = value instanceof Date ? value.getTime() : undefined;
  if (dateValue !== undefined) return String(dateValue);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function timestamp(value: unknown) {
  if (!value) return Date.now();
  const parsed = new Date(value as any).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function localeOf(row: any) {
  return String(row.locale || 'en').trim().toLowerCase() || 'en';
}

function sqlInsert(table: string, columns: string[], values: unknown[], conflict: string, updateColumns: string[]) {
  const update = updateColumns.map((column) => `${column}=excluded.${column}`).join(', ');
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.map(q).join(', ')}) ON CONFLICT ${conflict} DO UPDATE SET ${update};`;
}

const client = postgres(legacyUrl, { prepare: false, max: 1, idle_timeout: 10 });

async function rows(table: string) {
  try {
    return await client.unsafe(`SELECT * FROM ${table}`);
  } catch (error) {
    console.warn(`Skipping unavailable legacy table ${table}:`, (error as Error).message);
    return [] as any[];
  }
}

try {
  const [legacyGames, legacyCategories, legacyGameCategories, legacySites, legacySeoGames, legacySeoCategories, legacyBlogs] =
    await Promise.all([
      rows('games'),
      rows('categories'),
      rows('game_categories'),
      rows('game_sites'),
      rows('seo_games'),
      rows('seo_categories'),
      rows('blogs'),
    ]);

  const requestedMissingGames = [...onlyGameKeys].filter(
    (key) => !legacyGames.some((row: any) => String(row.game_key || '').trim().toLowerCase() === key)
  );
  if (requestedMissingGames.length > 0) {
    throw new Error(`Requested --games entries not found in legacy games: ${requestedMissingGames.join(', ')}`);
  }

  const selectedGames = onlyGameKeys.size
    ? legacyGames.filter((row: any) =>
        onlyGameKeys.has(String(row.game_key || '').trim().toLowerCase())
      )
    : legacyGames;
  const selectedGameKeys = new Set(
    selectedGames.map((row: any) => String(row.game_key || '').trim())
  );
  const selectedGameCategories = legacyGameCategories.filter((row: any) =>
    selectedGameKeys.has(String(row.game_key || '').trim())
  );
  const selectedCategoryKeys = new Set(
    selectedGameCategories.map((row: any) => String(row.category || '').trim())
  );
  const selectedCategories = onlyGameKeys.size
    ? legacyCategories.filter((row: any) =>
        selectedCategoryKeys.has(String(row.category || '').trim())
      )
    : legacyCategories;
  const selectedSeoGames = legacySeoGames.filter((row: any) => {
    const domain = normalizeDomain(row.domain || '');
    const gameKey = String(row.game_key || '').trim();
    return (!onlyDomain || domain === onlyDomain) && selectedGameKeys.has(gameKey);
  });
  const selectedSeoCategories = legacySeoCategories.filter((row: any) => {
    const domain = normalizeDomain(row.domain || '');
    const categoryKey = String(row.category || '').trim();
    return (
      (!onlyDomain || domain === onlyDomain) &&
      (!onlyGameKeys.size || selectedCategoryKeys.has(categoryKey))
    );
  });
  const selectedBlogs = includePosts
    ? legacyBlogs.filter((row: any) => {
        const domain = normalizeDomain(row.domain || '');
        return !onlyDomain || domain === onlyDomain;
      })
    : [];

  const sitesByDomain = new Map<string, any>();
  for (const row of legacySites) {
    const domain = normalizeDomain(row.domain || '');
    if (!domain || (onlyDomain && domain !== onlyDomain)) continue;
    sitesByDomain.set(domain, row);
  }

  // Some historical databases may have domain-scoped SEO rows without a
  // matching game_sites row. Preserve them by synthesizing a minimal site.
  for (const row of [...selectedSeoGames, ...selectedSeoCategories, ...selectedBlogs]) {
    const domain = normalizeDomain(row.domain || '');
    if (!domain || (onlyDomain && domain !== onlyDomain)) continue;
    if (!sitesByDomain.has(domain)) sitesByDomain.set(domain, { domain, site_name: domain });
  }

  const gameByKey = new Map(legacyGames.map((row: any) => [String(row.game_key), row]));
  const categoryByKey = new Map(legacyCategories.map((row: any) => [String(row.category), row]));
  const output: string[] = [
    '-- Generated by scripts/export-driftboss-v2-sql.ts',
    `-- Generated at ${new Date().toISOString()}`,
    '-- Safe to re-run: deterministic IDs + ON CONFLICT upserts.',
    'PRAGMA foreign_keys = ON;',
    'BEGIN TRANSACTION;',
  ];

  for (const [domain, row] of sitesByDomain) {
    const siteId = id('site', domain);
    const locales = new Set<string>(['en']);
    for (const item of selectedSeoGames) if (normalizeDomain(item.domain || '') === domain) locales.add(localeOf(item));
    for (const item of selectedSeoCategories) if (normalizeDomain(item.domain || '') === domain) locales.add(localeOf(item));
    for (const item of selectedBlogs) if (normalizeDomain(item.domain || '') === domain) locales.add(localeOf(item));

    output.push(
      sqlInsert(
        'game_site',
        ['id', 'key', 'domain', 'name', 'status', 'default_locale', 'enabled_locales', 'logo_url', 'favicon_url', 'created_at', 'updated_at'],
        [siteId, siteKey(domain), domain, row.site_name || domain, 'active', 'en', JSON.stringify([...locales]), row.logo_url, row.favicon_url, timestamp(row.created_at), timestamp(row.updated_at || row.created_at)],
        '(id)',
        ['key', 'domain', 'name', 'status', 'default_locale', 'enabled_locales', 'logo_url', 'favicon_url', 'updated_at']
      )
    );
  }

  // Global catalog is imported once. Site exposure is created separately below.
  for (const row of selectedGames) {
    const key = String(row.game_key || '').trim();
    if (!key) continue;
    output.push(
      sqlInsert(
        'game_catalog',
        ['id', 'key', 'title', 'description', 'embed_url', 'source_url', 'image_url', 'provider', 'embed_type', 'status', 'created_at', 'updated_at'],
        [id('game', key), key, row.title || key, row.description, row.url, row.url, row.image, 'legacy', 'iframe', 'active', timestamp(row.created_at), timestamp(row.created_at)],
        '(id)',
        ['key', 'title', 'description', 'embed_url', 'source_url', 'image_url', 'provider', 'embed_type', 'status', 'updated_at']
      )
    );
  }

  for (const row of selectedCategories) {
    const key = String(row.category || '').trim();
    if (!key) continue;
    output.push(
      sqlInsert('game_category', ['id', 'key', 'created_at', 'updated_at'], [id('category', key), slugify(key), timestamp(row.created_at), timestamp(row.created_at)], '(id)', ['key', 'updated_at'])
    );
  }

  for (const row of selectedGameCategories) {
    const gameKey = String(row.game_key || '').trim();
    const categoryKey = String(row.category || '').trim();
    if (!gameByKey.has(gameKey) || !categoryByKey.has(categoryKey)) continue;
    output.push(
      `INSERT INTO game_category_map (id, game_id, category_id, created_at) VALUES (${q(id('game-category', `${gameKey}:${categoryKey}`))}, ${q(id('game', gameKey))}, ${q(id('category', categoryKey))}, ${q(timestamp(row.created_at))}) ON CONFLICT (game_id, category_id) DO NOTHING;`
    );
  }

  // Attach only games that already had site-specific SEO/content in legacy DB.
  for (const row of selectedSeoGames) {
    const domain = normalizeDomain(row.domain || '');
    const gameKey = String(row.game_key || '').trim();
    if (!sitesByDomain.has(domain) || !gameByKey.has(gameKey)) continue;
    const siteId = id('site', domain);
    const siteGameId = id('site-game', `${domain}:${gameKey}`);
    const locale = localeOf(row);
    const gameRow = gameByKey.get(gameKey)!;
    const featured = featuredPairs.has(`${domain}:${gameKey}`);
    const slug = String(row.slug || gameKey).trim().toLowerCase();

    output.push(
      sqlInsert(
        'site_game',
        ['id', 'site_id', 'game_id', 'status', 'indexable', 'featured', 'hot', 'sort_weight', 'view_count', 'like_count', 'dislike_count', 'published_at', 'created_at', 'updated_at'],
        [siteGameId, siteId, id('game', gameKey), 'published', 1, featured ? 1 : 0, 0, featured ? 1000 : 0, Number(gameRow.view || 0), 0, 0, timestamp(row.created_at), timestamp(row.created_at), timestamp(row.updated_at || row.created_at)],
        '(id)',
        ['status', 'indexable', 'featured', 'sort_weight', 'view_count', 'updated_at']
      )
    );
    output.push(
      sqlInsert(
        'site_game_locale',
        ['id', 'site_id', 'site_game_id', 'locale', 'slug', 'status', 'title', 'meta_title', 'meta_description', 'description', 'content', 'created_at', 'updated_at'],
        [id('site-game-locale', `${domain}:${gameKey}:${locale}`), siteId, siteGameId, locale, slug, 'published', row.title || gameRow.title || gameKey, row.meta_title || null, row.meta_desc || null, gameRow.description || null, row.seo_content || null, timestamp(row.created_at), timestamp(row.updated_at || row.created_at)],
        '(site_game_id, locale)',
        ['site_id', 'slug', 'status', 'title', 'meta_title', 'meta_description', 'description', 'content', 'updated_at']
      )
    );
  }

  for (const row of selectedSeoCategories) {
    const domain = normalizeDomain(row.domain || '');
    const categoryKey = String(row.category || '').trim();
    if (!sitesByDomain.has(domain) || !categoryByKey.has(categoryKey)) continue;
    const siteId = id('site', domain);
    const siteCategoryId = id('site-category', `${domain}:${categoryKey}`);
    const locale = localeOf(row);
    const categoryRow = categoryByKey.get(categoryKey)!;
    output.push(
      sqlInsert(
        'site_category',
        ['id', 'site_id', 'category_id', 'status', 'indexable', 'sort_weight', 'created_at', 'updated_at'],
        [siteCategoryId, siteId, id('category', categoryKey), 'published', 1, 0, timestamp(row.created_at), timestamp(row.updated_at || row.created_at)],
        '(id)',
        ['status', 'indexable', 'updated_at']
      )
    );
    output.push(
      sqlInsert(
        'site_category_locale',
        ['id', 'site_id', 'site_category_id', 'locale', 'slug', 'status', 'title', 'meta_title', 'meta_description', 'description', 'content', 'created_at', 'updated_at'],
        [id('site-category-locale', `${domain}:${categoryKey}:${locale}`), siteId, siteCategoryId, locale, String(row.slug || slugify(categoryKey)), 'published', row.title || categoryRow.title || categoryKey, row.meta_title || null, row.meta_desc || null, categoryRow.description || null, row.seo_content || null, timestamp(row.created_at), timestamp(row.updated_at || row.created_at)],
        '(site_category_id, locale)',
        ['site_id', 'slug', 'status', 'title', 'meta_title', 'meta_description', 'description', 'content', 'updated_at']
      )
    );
  }

  // Site-specific category assignments are only created when both sides are
  // explicitly exposed by that site. This prevents cross-domain leakage.
  for (const domain of sitesByDomain.keys()) {
    const attachedGames = new Set(
      selectedSeoGames.filter((r: any) => normalizeDomain(r.domain || '') === domain).map((r: any) => String(r.game_key))
    );
    const attachedCategories = new Set(
      selectedSeoCategories.filter((r: any) => normalizeDomain(r.domain || '') === domain).map((r: any) => String(r.category))
    );
    for (const mapping of selectedGameCategories) {
      const gameKey = String(mapping.game_key || '');
      const categoryKey = String(mapping.category || '');
      if (!attachedGames.has(gameKey) || !attachedCategories.has(categoryKey)) continue;
      output.push(
        `INSERT INTO site_game_category (id, site_game_id, site_category_id, created_at) VALUES (${q(id('site-game-category', `${domain}:${gameKey}:${categoryKey}`))}, ${q(id('site-game', `${domain}:${gameKey}`))}, ${q(id('site-category', `${domain}:${categoryKey}`))}, ${q(timestamp(mapping.created_at))}) ON CONFLICT (site_game_id, site_category_id) DO NOTHING;`
      );
    }
  }

  for (const row of selectedBlogs) {
    const domain = normalizeDomain(row.domain || '');
    if (!sitesByDomain.has(domain)) continue;
    const locale = localeOf(row);
    const slug = String(row.slug || slugify(row.title || 'article'));
    const postId = id('site-post', `${domain}:${slug}`);
    const published = row.published !== false;
    output.push(
      sqlInsert(
        'site_post',
        ['id', 'site_id', 'type', 'status', 'indexable', 'featured', 'published_at', 'created_at', 'updated_at'],
        [postId, id('site', domain), 'article', published ? 'published' : 'draft', published ? 1 : 0, 0, published ? timestamp(row.created_at) : null, timestamp(row.created_at), timestamp(row.updated_at || row.created_at)],
        '(id)',
        ['status', 'indexable', 'published_at', 'updated_at']
      )
    );
    output.push(
      sqlInsert(
        'site_post_locale',
        ['id', 'site_id', 'site_post_id', 'locale', 'slug', 'status', 'title', 'meta_title', 'meta_description', 'description', 'image_url', 'content', 'created_at', 'updated_at'],
        [id('site-post-locale', `${domain}:${slug}:${locale}`), id('site', domain), postId, locale, slug, published ? 'published' : 'draft', row.title || slug, row.meta_title || null, row.meta_description || null, row.summary || null, row.cover_image || null, row.content || null, timestamp(row.created_at), timestamp(row.updated_at || row.created_at)],
        '(site_post_id, locale)',
        ['site_id', 'slug', 'status', 'title', 'meta_title', 'meta_description', 'description', 'image_url', 'content', 'updated_at']
      )
    );
  }

  output.push('COMMIT;');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${output.join('\n')}\n`, 'utf8');

  console.log(`Migration SQL written: ${outputPath}`);
  console.log(`Sites: ${sitesByDomain.size}`);
  console.log(`Catalog games: ${selectedGames.length}`);
  console.log(`Catalog categories: ${selectedCategories.length}`);
  console.log(`Site game SEO rows: ${selectedSeoGames.length}`);
  console.log(`Site category SEO rows: ${selectedSeoCategories.length}`);
  console.log(`Posts: ${selectedBlogs.length} (include-posts=${includePosts})`);
  if (onlyGameKeys.size > 0) {
    console.log(`Game filter: ${[...onlyGameKeys].join(', ')}`);
  }
} finally {
  await client.end();
}
