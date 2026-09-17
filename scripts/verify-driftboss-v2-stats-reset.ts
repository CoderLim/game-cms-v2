import { createClient } from '@libsql/client';

const databaseUrl =
  process.env.DATABASE_URL || 'file:data/legacy-migration-target.db';
const client = createClient({ url: databaseUrl });

try {
  const result = await client.execute(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN view_count = 0 THEN 1 ELSE 0 END) AS zero_views,
      SUM(CASE WHEN like_count = 0 THEN 1 ELSE 0 END) AS zero_likes,
      SUM(CASE WHEN dislike_count = 0 THEN 1 ELSE 0 END) AS zero_dislikes
    FROM site_game
  `);

  const row = result.rows[0];
  const total = Number(row?.total || 0);
  const zeroViews = Number(row?.zero_views || 0);
  const zeroLikes = Number(row?.zero_likes || 0);
  const zeroDislikes = Number(row?.zero_dislikes || 0);

  if (!total) throw new Error('expected migrated site_game rows');
  if (zeroViews !== total) {
    throw new Error(`expected all ${total} site games to start with view_count=0; got ${zeroViews}`);
  }
  if (zeroLikes !== total || zeroDislikes !== total) {
    throw new Error('expected all migrated site rating counters to start at zero');
  }

  console.log(`Per-site stats reset verified for ${total} site_game rows.`);
} finally {
  client.close();
}
