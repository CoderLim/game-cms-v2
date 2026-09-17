import { createClient } from '@libsql/client';

const databaseUrl =
  process.env.DATABASE_URL || 'file:data/legacy-migration-target.db';
const client = createClient({ url: databaseUrl });

async function one<T extends Record<string, unknown>>(
  sql: string,
  args: unknown[] = []
) {
  const result = await client.execute({ sql, args });
  return result.rows[0] as T | undefined;
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function staticPage(siteId: string, slug: string) {
  return one<{ content: string }>(
    `SELECT spl.content
       FROM site_post_locale spl
       JOIN site_post sp ON sp.id = spl.site_post_id
      WHERE sp.site_id = ? AND sp.type = 'page' AND spl.slug = ?`,
    [siteId, slug]
  );
}

try {
  const siteCount = await one<{ c: number }>(
    'SELECT COUNT(*) AS c FROM game_site'
  );
  expect(Number(siteCount?.c) === 2, `expected 2 sites, got ${siteCount?.c}`);

  const catalog = await one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM game_catalog WHERE key = 'drift-boss'`
  );
  expect(
    Number(catalog?.c) === 1,
    'drift-boss must exist once in global catalog'
  );

  const siteGames = await one<{ c: number }>(
    `SELECT COUNT(*) AS c
       FROM site_game sg
       JOIN game_catalog g ON g.id = sg.game_id
      WHERE g.key = 'drift-boss'`
  );
  expect(
    Number(siteGames?.c) === 2,
    'drift-boss must have two site_game rows'
  );

  const siteA = await one<{ id: string }>(
    `SELECT id FROM game_site WHERE domain = 'driftbossgame.org'`
  );
  const siteB = await one<{ id: string }>(
    `SELECT id FROM game_site WHERE domain = 'anotherdrift.example'`
  );
  expect(siteA?.id && siteB?.id, 'both migrated sites must exist');

  const gameA = await one<{
    slug: string;
    content: string;
    meta_description: string;
  }>(
    `SELECT sgl.slug, sgl.content, sgl.meta_description
       FROM site_game_locale sgl
      WHERE sgl.site_id = ? AND sgl.locale = 'en'`,
    [siteA.id]
  );
  const gameB = await one<{
    slug: string;
    content: string;
    meta_description: string;
  }>(
    `SELECT sgl.slug, sgl.content, sgl.meta_description
       FROM site_game_locale sgl
      WHERE sgl.site_id = ? AND sgl.locale = 'en'`,
    [siteB.id]
  );

  expect(
    gameA?.slug === 'drift-boss',
    `unexpected Site A slug: ${gameA?.slug}`
  );
  expect(
    gameA?.content === 'Site A unique Drift Boss body',
    'Site A game SEO body was not preserved'
  );
  expect(
    gameA?.meta_description === 'Site A game meta',
    'Site A game meta was not preserved'
  );
  expect(
    gameB?.slug === 'drift-boss-online',
    `unexpected Site B slug: ${gameB?.slug}`
  );
  expect(
    gameB?.content === 'Site B unique Drift Boss body',
    'Site B game SEO body was not preserved'
  );
  expect(
    gameB?.meta_description === 'Site B game meta',
    'Site B game meta was not preserved'
  );

  const crossA = await one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM site_game_locale
      WHERE site_id = ? AND slug = 'drift-boss-online'`,
    [siteA.id]
  );
  const crossB = await one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM site_game_locale
      WHERE site_id = ? AND slug = 'drift-boss'`,
    [siteB.id]
  );
  expect(Number(crossA?.c) === 0, 'Site A leaked Site B game slug');
  expect(Number(crossB?.c) === 0, 'Site B leaked Site A game slug');

  const homeA = await one<{ meta_title: string; content: string }>(
    `SELECT meta_title, content FROM site_locale
      WHERE site_id = ? AND locale = 'en'`,
    [siteA.id]
  );
  const homeB = await one<{ meta_title: string; content: string }>(
    `SELECT meta_title, content FROM site_locale
      WHERE site_id = ? AND locale = 'en'`,
    [siteB.id]
  );
  expect(
    homeA?.meta_title === 'Drift Boss Meta A',
    'Site A homepage meta missing'
  );
  expect(
    homeA?.content === 'Unique homepage content A',
    'Site A homepage body missing'
  );
  expect(
    homeB?.meta_title === 'Drift Boss Meta B',
    'Site B homepage meta missing'
  );
  expect(
    homeB?.content === 'Unique homepage content B',
    'Site B homepage body missing'
  );

  const staticPageExpectations = [
    ['about-us', 'About Drift A', 'About Drift B'],
    ['contact-us', 'Contact Drift A', 'Contact Drift B'],
    ['privacy-policy', 'Privacy Drift A', 'Privacy Drift B'],
    ['terms-of-service', 'Terms Drift A', 'Terms Drift B'],
  ] as const;

  for (const [slug, expectedA, expectedB] of staticPageExpectations) {
    const pageA = await staticPage(siteA.id, slug);
    const pageB = await staticPage(siteB.id, slug);
    expect(pageA?.content === expectedA, `Site A ${slug} page missing`);
    expect(pageB?.content === expectedB, `Site B ${slug} page missing`);
  }

  const socialA = await one<{ value: string }>(
    `SELECT value FROM site_setting WHERE site_id = ? AND key = 'social_links'`,
    [siteA.id]
  );
  const socialB = await one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM site_setting WHERE site_id = ? AND key = 'social_links'`,
    [siteB.id]
  );
  expect(
    socialA?.value?.includes('YouTube'),
    'Site A social links were not migrated'
  );
  expect(
    Number(socialB?.c) === 0,
    'Site B should not receive Site A social links'
  );

  const blogA = await one<{ content: string }>(
    `SELECT spl.content
       FROM site_post_locale spl
       JOIN site_post sp ON sp.id = spl.site_post_id
      WHERE sp.site_id = ? AND sp.type = 'article' AND spl.slug = 'how-to-drift'`,
    [siteA.id]
  );
  expect(
    blogA?.content?.includes('Site A guide-like article'),
    'Legacy blog missing'
  );

  console.log('DriftBoss V2 legacy migration verification passed.');
} finally {
  client.close();
}
