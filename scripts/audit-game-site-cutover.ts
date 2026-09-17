/**
 * Lightweight pre-cutover audit for a deployed Game Site Engine site.
 *
 * Usage:
 *   pnpm tsx scripts/audit-game-site-cutover.ts \
 *     --base=https://preview.example.workers.dev \
 *     --canonical=https://driftbossgame.org \
 *     --game=drift-boss \
 *     --pages=about-us,privacy-policy \
 *     --expect-indexable=false
 *
 * `--base` is where requests are sent. `--canonical` is the expected public
 * origin emitted in canonical/sitemap URLs. This lets a preview Worker be
 * audited before DNS cutover while still verifying production SEO URLs.
 */

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const index = arg.indexOf('=');
    return index === -1
      ? [arg.replace(/^--/, ''), 'true']
      : [arg.slice(2, index), arg.slice(index + 1)];
  })
);

const base = normalizeOrigin(args.get('base') || '');
const canonicalOrigin = normalizeOrigin(args.get('canonical') || base);
const gameSlug = (args.get('game') || '').trim();
const pageSlugs = (args.get('pages') || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const expectIndexable = args.get('expect-indexable') !== 'false';

if (!base) throw new Error('--base=https://... is required');

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, '');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function load(path: string) {
  const url = `${base}${path}`;
  const response = await fetch(url, {
    redirect: 'manual',
    headers: { 'User-Agent': 'GameSiteEngineCutoverAudit/1.0' },
  });
  const body = await response.text();
  return { url, response, body };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function canonicalFrom(html: string) {
  const match = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>|<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i
  );
  return match?.[1] || match?.[2];
}

function hasNoindex(html: string) {
  return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(
    html
  );
}

async function auditHtmlPage(path: string, expectedCanonical: string) {
  const { response, body, url } = await load(path);
  assert(response.status === 200, `${url} returned ${response.status}`);

  const canonical = canonicalFrom(body);
  assert(canonical, `${url} is missing canonical`);
  assert(
    canonical === expectedCanonical,
    `${url} canonical mismatch: expected ${expectedCanonical}, got ${canonical}`
  );

  if (expectIndexable) {
    assert(!hasNoindex(body), `${url} unexpectedly contains noindex`);
  }

  console.log(`OK ${path} -> ${canonical}`);
  return body;
}

async function main() {
  await auditHtmlPage('/', `${canonicalOrigin}/`);

  if (gameSlug) {
    await auditHtmlPage(
      `/game/${encodeURIComponent(gameSlug)}`,
      `${canonicalOrigin}/game/${gameSlug}`
    );
  }

  for (const slug of pageSlugs) {
    await auditHtmlPage(`/${encodeURIComponent(slug)}`, `${canonicalOrigin}/${slug}`);
  }

  const robots = await load('/robots.txt');
  assert(robots.response.status === 200, 'robots.txt did not return 200');
  assert(
    robots.body.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`),
    'robots.txt points to the wrong sitemap origin'
  );
  if (expectIndexable) {
    assert(
      !/^Disallow:\s*\/$/m.test(robots.body),
      'production audit expected indexable robots.txt but found Disallow: /'
    );
  } else {
    assert(
      /^Disallow:\s*\/$/m.test(robots.body),
      'preview audit expected robots.txt to contain Disallow: /'
    );
  }
  console.log('OK /robots.txt');

  const sitemap = await load('/sitemap.xml');
  assert(sitemap.response.status === 200, 'sitemap.xml did not return 200');
  assert(
    sitemap.body.includes(`<loc>${canonicalOrigin}/</loc>`),
    'sitemap is missing the expected homepage canonical URL'
  );
  if (gameSlug && expectIndexable) {
    const gameUrl = `${canonicalOrigin}/game/${gameSlug}`;
    assert(
      new RegExp(`<loc>${escapeRegExp(gameUrl)}</loc>`).test(sitemap.body),
      `sitemap is missing ${gameUrl}`
    );
  }
  console.log('OK /sitemap.xml');

  console.log('Game Site Engine cutover audit passed.');
}

await main();
