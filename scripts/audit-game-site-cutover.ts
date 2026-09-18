/**
 * Lightweight pre-cutover audit for a deployed Game Site Engine site.
 *
 * Usage:
 *   pnpm tsx scripts/audit-game-site-cutover.ts \
 *     --base=https://preview.example.workers.dev \
 *     --canonical=https://driftbossgame.org \
 *     --game=drift-boss \
 *     --category=drift-games \
 *     --blog=welcome-to-drift-boss \
 *     --guide=how-to-play-drift-boss \
 *     --pages=about-us,privacy-policy \
 *     --not-found=tekken-3,mahjong-link \
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
const categorySlug = (args.get('category') || '').trim();
const blogSlug = (args.get('blog') || '').trim();
const guideSlug = (args.get('guide') || '').trim();
const pageSlugs = csv(args.get('pages'));
const must404GameSlugs = csv(args.get('not-found'));
const expectIndexable = args.get('expect-indexable') !== 'false';

if (!base) throw new Error('--base=https://... is required');

function csv(value?: string) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

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

function alternateLinks(html: string) {
  const matches = html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi);
  const links: Array<{ hrefLang: string; href: string }> = [];
  for (const match of matches) {
    const tag = match[0];
    const hrefLang = tag.match(/hreflang=["']([^"']+)["']/i)?.[1] || '';
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1] || '';
    if (hrefLang && href) links.push({ hrefLang, href });
  }
  return links;
}

function jsonLdObjects(html: string) {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  const values: any[] = [];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      if (Array.isArray(parsed)) values.push(...parsed);
      else values.push(parsed);
    } catch {
      // A malformed JSON-LD block is itself a cutover problem.
      throw new Error('page contains malformed application/ld+json');
    }
  }
  return values;
}

async function auditHtmlPage(
  path: string,
  expectedCanonical: string,
  options: { requireJsonLdUrl?: boolean } = {}
) {
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

  const alternates = alternateLinks(body);
  if (alternates.length > 0) {
    const xDefault = alternates.find((item) => item.hrefLang === 'x-default');
    assert(xDefault, `${url} emits hreflang alternates but no x-default`);
  }

  if (options.requireJsonLdUrl) {
    const objects = jsonLdObjects(body);
    assert(objects.length > 0, `${url} is missing JSON-LD`);
    const matching = objects.some((item) => item?.url === expectedCanonical);
    assert(
      matching,
      `${url} JSON-LD URL does not match canonical ${expectedCanonical}`
    );
  }

  console.log(`OK ${path} -> ${canonical}`);
  return body;
}

async function assert404(path: string) {
  const { response, url } = await load(path);
  assert(
    response.status === 404,
    `${url} should be unavailable for this site but returned ${response.status}`
  );
  console.log(`OK ${path} -> 404`);
}

async function main() {
  await auditHtmlPage('/', `${canonicalOrigin}/`);

  if (gameSlug) {
    await auditHtmlPage(
      `/game/${encodeURIComponent(gameSlug)}`,
      `${canonicalOrigin}/game/${gameSlug}`,
      { requireJsonLdUrl: true }
    );
  }

  if (categorySlug) {
    await auditHtmlPage(
      `/category/${encodeURIComponent(categorySlug)}`,
      `${canonicalOrigin}/category/${categorySlug}`
    );
  }

  if (blogSlug) {
    await auditHtmlPage(
      `/blog/${encodeURIComponent(blogSlug)}`,
      `${canonicalOrigin}/blog/${blogSlug}`
    );
  }

  if (guideSlug) {
    await auditHtmlPage(
      `/guides/${encodeURIComponent(guideSlug)}`,
      `${canonicalOrigin}/guides/${guideSlug}`
    );
  }

  for (const slug of pageSlugs) {
    await auditHtmlPage(`/${encodeURIComponent(slug)}`, `${canonicalOrigin}/${slug}`);
  }

  // Explicitly probe game slugs known to belong to another site. This is a
  // direct regression check for the legacy shared-catalog exposure bug.
  for (const slug of must404GameSlugs) {
    await assert404(`/game/${encodeURIComponent(slug)}`);
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

  const expectedIndexableUrls = [
    gameSlug ? `${canonicalOrigin}/game/${gameSlug}` : '',
    categorySlug ? `${canonicalOrigin}/category/${categorySlug}` : '',
    blogSlug ? `${canonicalOrigin}/blog/${blogSlug}` : '',
    guideSlug ? `${canonicalOrigin}/guides/${guideSlug}` : '',
    ...pageSlugs.map((slug) => `${canonicalOrigin}/${slug}`),
  ].filter(Boolean);

  if (expectIndexable) {
    for (const expectedUrl of expectedIndexableUrls) {
      assert(
        new RegExp(`<loc>${escapeRegExp(expectedUrl)}</loc>`).test(sitemap.body),
        `sitemap is missing ${expectedUrl}`
      );
    }
  }

  for (const slug of must404GameSlugs) {
    const leakedUrl = `${canonicalOrigin}/game/${slug}`;
    assert(
      !new RegExp(`<loc>${escapeRegExp(leakedUrl)}</loc>`).test(sitemap.body),
      `sitemap leaks a game that should be absent: ${leakedUrl}`
    );
  }
  console.log('OK /sitemap.xml');

  console.log('Game Site Engine cutover audit passed.');
}

await main();
