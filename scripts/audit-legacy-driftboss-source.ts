import postgres from 'postgres';

/**
 * Read-only preflight for the legacy driftbossgame PostgreSQL database.
 *
 * It catches source-data conditions that can make an otherwise valid V2 SQL
 * export fail late when applied to D1 (duplicate localized URLs, ambiguous
 * site keys, duplicate SEO rows, or orphan references).
 *
 * Usage:
 *   LEGACY_DATABASE_URL='postgresql://...' \
 *     pnpm tsx scripts/audit-legacy-driftboss-source.ts \
 *       --domain=driftbossgame.org
 */

const legacyUrl = process.env.LEGACY_DATABASE_URL;
if (!legacyUrl) throw new Error('LEGACY_DATABASE_URL is required');

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const index = arg.indexOf('=');
    return index === -1
      ? [arg.replace(/^--/, ''), 'true']
      : [arg.slice(2, index), arg.slice(index + 1)];
  })
);

function normalizeDomain(value: unknown) {
  return String(value || '')
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

function slugify(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function localeOf(row: any) {
  return String(row?.locale || 'en').trim().toLowerCase() || 'en';
}

const onlyDomain = normalizeDomain(args.get('domain') || '');
const client = postgres(legacyUrl, {
  prepare: false,
  max: 1,
  idle_timeout: 10,
});

async function rows(table: string) {
  try {
    return await client.unsafe(`SELECT * FROM ${table}`);
  } catch (error) {
    console.warn(`WARN: unable to read legacy table ${table}: ${(error as Error).message}`);
    return [] as any[];
  }
}

function filteredByDomain(items: any[]) {
  if (!onlyDomain) return items;
  return items.filter((row) => normalizeDomain(row.domain) === onlyDomain);
}

function duplicates<T>(items: T[], keyOf: (item: T) => string) {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const bucket = buckets.get(key) || [];
    bucket.push(item);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].filter(([, bucket]) => bucket.length > 1);
}

const errors: string[] = [];
const warnings: string[] = [];

try {
  const [games, categories, gameCategories, sites, seoGamesRaw, seoCategoriesRaw, blogsRaw] =
    await Promise.all([
      rows('games'),
      rows('categories'),
      rows('game_categories'),
      rows('game_sites'),
      rows('seo_games'),
      rows('seo_categories'),
      rows('blogs'),
    ]);

  const seoGames = filteredByDomain(seoGamesRaw);
  const seoCategories = filteredByDomain(seoCategoriesRaw);
  const blogs = filteredByDomain(blogsRaw);
  const selectedSites = onlyDomain
    ? sites.filter((row: any) => normalizeDomain(row.domain) === onlyDomain)
    : sites;

  const domains = new Set<string>();
  for (const row of [...selectedSites, ...seoGames, ...seoCategories, ...blogs]) {
    const domain = normalizeDomain(row.domain);
    if (domain) domains.add(domain);
  }

  if (onlyDomain && !domains.has(onlyDomain)) {
    errors.push(`requested domain ${onlyDomain} has no site-scoped legacy rows`);
  }

  // `game_site.key` is globally unique. The current exporter intentionally
  // preserves the short historical key (domain without TLD), so detect a
  // collision before SQL generation rather than failing during D1 import.
  for (const [key, matchingDomains] of duplicates([...domains], (domain) => siteKey(domain))) {
    errors.push(
      `SITE_KEY collision "${key}": ${matchingDomains.join(', ')}. Export these domains separately or choose explicit V2 site keys.`
    );
  }

  const gameKeys = new Set(games.map((row: any) => String(row.game_key || '').trim()).filter(Boolean));
  const categoryKeys = new Set(
    categories.map((row: any) => String(row.category || '').trim()).filter(Boolean)
  );

  for (const [normalized, sourceRows] of duplicates(
    [...categoryKeys],
    (value) => slugify(value)
  )) {
    errors.push(
      `category key collision after normalization "${normalized}": ${sourceRows.join(', ')}`
    );
  }

  for (const row of seoGames) {
    const domain = normalizeDomain(row.domain);
    const gameKey = String(row.game_key || '').trim();
    if (!gameKeys.has(gameKey)) {
      errors.push(`orphan seo_games row: ${domain} / ${gameKey || '<empty game_key>'}`);
    }
  }

  for (const row of seoCategories) {
    const domain = normalizeDomain(row.domain);
    const categoryKey = String(row.category || '').trim();
    if (!categoryKeys.has(categoryKey)) {
      errors.push(
        `orphan seo_categories row: ${domain} / ${categoryKey || '<empty category>'}`
      );
    }
  }

  for (const row of gameCategories) {
    const gameKey = String(row.game_key || '').trim();
    const categoryKey = String(row.category || '').trim();
    if (!gameKeys.has(gameKey) || !categoryKeys.has(categoryKey)) {
      warnings.push(`orphan game_categories mapping skipped: ${gameKey} -> ${categoryKey}`);
    }
  }

  for (const [key] of duplicates(
    seoGames,
    (row) => `${normalizeDomain(row.domain)}|${String(row.game_key || '').trim()}|${localeOf(row)}`
  )) {
    errors.push(`duplicate site game locale row: ${key}`);
  }

  for (const [key] of duplicates(
    seoCategories,
    (row) => `${normalizeDomain(row.domain)}|${String(row.category || '').trim()}|${localeOf(row)}`
  )) {
    errors.push(`duplicate site category locale row: ${key}`);
  }

  const localizedUrls: Array<{ kind: string; domain: string; locale: string; slug: string }> = [];
  for (const row of seoGames) {
    localizedUrls.push({
      kind: 'game',
      domain: normalizeDomain(row.domain),
      locale: localeOf(row),
      slug: String(row.slug || row.game_key || '').trim().toLowerCase(),
    });
  }
  for (const row of seoCategories) {
    localizedUrls.push({
      kind: 'category',
      domain: normalizeDomain(row.domain),
      locale: localeOf(row),
      slug: String(row.slug || slugify(row.category || '')).trim().toLowerCase(),
    });
  }

  for (const [key, conflicting] of duplicates(
    localizedUrls,
    (row) => `${row.kind}|${row.domain}|${row.locale}|${row.slug}`
  )) {
    errors.push(
      `duplicate localized URL ${key}: ${conflicting.length} source rows would violate V2 uniqueness`
    );
  }

  // site_post groups translations by domain+slug. A repeated domain+slug+locale
  // is invalid; a title-derived empty slug is also dangerous.
  for (const row of blogs) {
    const slug = String(row.slug || slugify(row.title || '')).trim().toLowerCase();
    if (!slug) {
      errors.push(`blog has no usable slug on ${normalizeDomain(row.domain)} (${localeOf(row)})`);
    }
  }
  for (const [key] of duplicates(
    blogs,
    (row) => {
      const slug = String(row.slug || slugify(row.title || '')).trim().toLowerCase();
      return `${normalizeDomain(row.domain)}|${localeOf(row)}|${slug}`;
    }
  )) {
    errors.push(`duplicate site post locale row: ${key}`);
  }

  console.log('Legacy DriftBoss source audit');
  console.log(`Scope: ${onlyDomain || 'all domains'}`);
  console.log(`Domains: ${domains.size}`);
  console.log(`Catalog games: ${games.length}`);
  console.log(`Site game SEO rows: ${seoGames.length}`);
  console.log(`Site category SEO rows: ${seoCategories.length}`);
  console.log(`Blogs: ${blogs.length}`);

  if (warnings.length) {
    console.log('\nWarnings:');
    for (const warning of warnings) console.log(`- ${warning}`);
  }

  if (errors.length) {
    console.error('\nBlocking issues:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('\nPASS: source data is safe to feed into the V2 exporters.');
  }
} finally {
  await client.end();
}
