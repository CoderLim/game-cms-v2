import { createClient } from '@libsql/client';
import { and, eq } from 'drizzle-orm';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { v4 as uuidv4 } from 'uuid';

import * as schema from '../src/config/db/game-schema';

async function createScriptDb() {
  const provider = (process.env.DATABASE_PROVIDER || 'sqlite').toLowerCase();
  const url = process.env.DATABASE_URL || 'file:data/local.db';

  if (provider === 'd1') {
    throw new Error(
      'game:seed is for local SQLite/PostgreSQL development. D1 production data should be initialized through Admin or a Worker-aware migration task.'
    );
  }

  if (provider === 'postgres' || provider === 'postgresql') {
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const client = postgres(url, { prepare: false, max: 1, idle_timeout: 10 });
    return { db: drizzle({ client }) as any, close: () => client.end() };
  }

  const client = createClient({ url });
  return { db: drizzleLibsql({ client }) as any, close: () => client.close() };
}

function hostFromAppUrl() {
  try {
    return new URL(process.env.VITE_APP_URL || 'http://localhost:3000').host;
  } catch {
    return 'localhost:3000';
  }
}

async function main() {
  const { db, close } = await createScriptDb();

  try {
    const siteKey = process.env.SITE_KEY || 'local-dev';
    const siteDomain = process.env.SEED_SITE_DOMAIN || hostFromAppUrl();
    const siteName = process.env.SEED_SITE_NAME || 'Game Site Dev';
    const locale = process.env.VITE_DEFAULT_LOCALE || 'en';

    let [site] = await db
      .select()
      .from(schema.site)
      .where(eq(schema.site.key, siteKey))
      .limit(1);

    if (!site) {
      [site] = await db
        .insert(schema.site)
        .values({
          id: uuidv4(),
          key: siteKey,
          domain: siteDomain,
          name: siteName,
          status: 'active',
          defaultLocale: locale,
          enabledLocales: JSON.stringify([locale]),
        })
        .returning();
    }

    let [game] = await db
      .select()
      .from(schema.game)
      .where(eq(schema.game.key, 'demo-game'))
      .limit(1);

    if (!game) {
      [game] = await db
        .insert(schema.game)
        .values({
          id: uuidv4(),
          key: 'demo-game',
          title: 'Demo Game',
          description: 'A development fixture for validating the Game Site Engine.',
          imageUrl: null,
          embedUrl: process.env.SEED_GAME_EMBED_URL || null,
          provider: 'local-seed',
          embedType: 'iframe',
          status: 'active',
        })
        .returning();
    }

    let [siteGame] = await db
      .select()
      .from(schema.siteGame)
      .where(
        and(
          eq(schema.siteGame.siteId, site.id),
          eq(schema.siteGame.gameId, game.id)
        )
      )
      .limit(1);

    if (!siteGame) {
      [siteGame] = await db
        .insert(schema.siteGame)
        .values({
          id: uuidv4(),
          siteId: site.id,
          gameId: game.id,
          status: 'published',
          indexable: true,
          featured: true,
          hot: true,
          sortWeight: 100,
          publishedAt: new Date(),
        })
        .returning();
    } else {
      await db
        .update(schema.siteGame)
        .set({
          status: 'published',
          indexable: true,
          featured: true,
          hot: true,
          sortWeight: 100,
          publishedAt: siteGame.publishedAt || new Date(),
        })
        .where(eq(schema.siteGame.id, siteGame.id));
    }

    await db
      .insert(schema.siteGameLocale)
      .values({
        id: uuidv4(),
        siteId: site.id,
        siteGameId: siteGame.id,
        locale,
        slug: 'demo-game',
        status: 'published',
        title: 'Demo Game',
        metaTitle: `Demo Game | ${site.name}`,
        metaDescription: 'Play the Game Site Engine development demo game.',
        intro: 'This fixture verifies site-scoped game content and SEO routing.',
        description: 'The same global game can have different content on every site.',
        howToPlay: 'Configure `SEED_GAME_EMBED_URL` to test a real embedded HTML5 game.',
        controls: 'Depends on the embedded game.',
        features: '- Site-scoped content\n- Localized slug\n- Sitemap support',
        faq: '### Is this production content?\nNo. Delete or replace it before launch.',
        content: 'This page exists only to validate the Game Site Engine end-to-end.',
      })
      .onConflictDoUpdate({
        target: [schema.siteGameLocale.siteGameId, schema.siteGameLocale.locale],
        set: {
          siteId: site.id,
          slug: 'demo-game',
          status: 'published',
          title: 'Demo Game',
          metaTitle: `Demo Game | ${site.name}`,
          metaDescription: 'Play the Game Site Engine development demo game.',
          updatedAt: new Date(),
        },
      });

    let [category] = await db
      .select()
      .from(schema.gameCategory)
      .where(eq(schema.gameCategory.key, 'casual-games'))
      .limit(1);

    if (!category) {
      [category] = await db
        .insert(schema.gameCategory)
        .values({ id: uuidv4(), key: 'casual-games' })
        .returning();
    }

    let [siteCategory] = await db
      .select()
      .from(schema.siteCategory)
      .where(
        and(
          eq(schema.siteCategory.siteId, site.id),
          eq(schema.siteCategory.categoryId, category.id)
        )
      )
      .limit(1);

    if (!siteCategory) {
      [siteCategory] = await db
        .insert(schema.siteCategory)
        .values({
          id: uuidv4(),
          siteId: site.id,
          categoryId: category.id,
          status: 'published',
          indexable: true,
          sortWeight: 100,
        })
        .returning();
    }

    await db
      .insert(schema.siteCategoryLocale)
      .values({
        id: uuidv4(),
        siteId: site.id,
        siteCategoryId: siteCategory.id,
        locale,
        slug: 'casual-games',
        status: 'published',
        title: 'Casual Games',
        metaTitle: `Casual Games | ${site.name}`,
        metaDescription: 'Casual browser games.',
        description: 'Quick-play browser games, including the local Game Site Engine fixture.',
      })
      .onConflictDoUpdate({
        target: [
          schema.siteCategoryLocale.siteCategoryId,
          schema.siteCategoryLocale.locale,
        ],
        set: {
          siteId: site.id,
          slug: 'casual-games',
          status: 'published',
          title: 'Casual Games',
          updatedAt: new Date(),
        },
      });

    await db
      .insert(schema.siteGameCategory)
      .values({
        id: uuidv4(),
        siteGameId: siteGame.id,
        siteCategoryId: siteCategory.id,
      })
      .onConflictDoNothing({
        target: [
          schema.siteGameCategory.siteGameId,
          schema.siteGameCategory.siteCategoryId,
        ],
      });

    console.log(`Game Site Engine seed complete for SITE_KEY=${site.key}`);
    console.log(`Home: http://${site.domain}/`);
    console.log(`Game: http://${site.domain}/game/demo-game`);
    console.log(`Category: http://${site.domain}/category/demo-games`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
