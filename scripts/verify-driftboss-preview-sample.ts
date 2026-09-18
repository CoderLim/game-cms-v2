import { createClient } from '@libsql/client';

const databaseUrl =
  process.env.DATABASE_URL || 'file:data/legacy-preview-sample.db';
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

try {
  const catalog = await one<{ c: number }>(
    'SELECT COUNT(*) AS c FROM game_catalog'
  );
  expect(Number(catalog?.c) === 1, `expected 1 catalog game, got ${catalog?.c}`);

  const drift = await one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM game_catalog WHERE key = 'drift-boss'`
  );
  expect(Number(drift?.c) === 1, 'filtered preview must contain drift-boss');

  const siteCount = await one<{ c: number }>(
    'SELECT COUNT(*) AS c FROM game_site'
  );
  expect(Number(siteCount?.c) === 1, `expected 1 site, got ${siteCount?.c}`);

  const siteGameCount = await one<{ c: number }>(
    'SELECT COUNT(*) AS c FROM site_game'
  );
  expect(
    Number(siteGameCount?.c) === 1,
    `expected 1 site_game, got ${siteGameCount?.c}`
  );

  const categoryCount = await one<{ c: number }>(
    'SELECT COUNT(*) AS c FROM game_category'
  );
  expect(
    Number(categoryCount?.c) === 1,
    `expected only the selected game's category, got ${categoryCount?.c}`
  );

  const racing = await one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM game_category WHERE key = 'racing'`
  );
  expect(Number(racing?.c) === 1, 'racing category should be retained');

  const puzzle = await one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM game_category WHERE key = 'puzzle'`
  );
  expect(Number(puzzle?.c) === 0, 'unrelated puzzle category leaked into sample');

  const articleCount = await one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM site_post WHERE type = 'article'`
  );
  expect(
    Number(articleCount?.c) === 0,
    'sample mode should omit legacy blog posts by default'
  );

  console.log('Filtered DriftBoss preview sample verification passed.');
} finally {
  client.close();
}
