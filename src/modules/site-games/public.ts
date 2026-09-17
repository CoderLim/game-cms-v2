import { and, desc, eq } from 'drizzle-orm';

import { game, siteGame, siteGameLocale } from '@/config/db/game-schema';
import { db } from '@/core/db';
import { GameStatus } from '@/modules/games/service';

import { SiteContentStatus, SiteGameStatus } from './service';

const publicFilters = (siteId: string, locale: string) =>
  and(
    eq(siteGame.siteId, siteId),
    eq(siteGameLocale.siteId, siteId),
    eq(siteGameLocale.locale, locale),
    eq(siteGame.status, SiteGameStatus.PUBLISHED),
    eq(siteGameLocale.status, SiteContentStatus.PUBLISHED),
    eq(game.status, GameStatus.ACTIVE)
  );

const cardSelection = {
  siteGameId: siteGame.id,
  gameId: game.id,
  gameKey: game.key,
  slug: siteGameLocale.slug,
  title: siteGameLocale.title,
  imageUrl: game.imageUrl,
  viewCount: siteGame.viewCount,
  featured: siteGame.featured,
  hot: siteGame.hot,
  sortWeight: siteGame.sortWeight,
};

export async function getFeatured(input: {
  siteId: string;
  locale: string;
}) {
  const [row] = await db()
    .select(cardSelection)
    .from(siteGame)
    .innerJoin(game, eq(game.id, siteGame.gameId))
    .innerJoin(siteGameLocale, eq(siteGameLocale.siteGameId, siteGame.id))
    .where(
      and(
        publicFilters(input.siteId, input.locale),
        eq(siteGame.featured, true)
      )
    )
    .orderBy(desc(siteGame.sortWeight), desc(siteGame.publishedAt))
    .limit(1);

  return row;
}

export async function listHot(input: {
  siteId: string;
  locale: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit || 12, 1), 50);

  return db()
    .select(cardSelection)
    .from(siteGame)
    .innerJoin(game, eq(game.id, siteGame.gameId))
    .innerJoin(siteGameLocale, eq(siteGameLocale.siteGameId, siteGame.id))
    .where(
      and(publicFilters(input.siteId, input.locale), eq(siteGame.hot, true))
    )
    .orderBy(desc(siteGame.sortWeight), desc(siteGame.viewCount))
    .limit(limit);
}

export async function listIndexable(input: {
  siteId: string;
  locale: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit || 5000, 1), 5000);

  return db()
    .select({
      siteGameId: siteGame.id,
      slug: siteGameLocale.slug,
      locale: siteGameLocale.locale,
      updatedAt: siteGameLocale.updatedAt,
    })
    .from(siteGame)
    .innerJoin(game, eq(game.id, siteGame.gameId))
    .innerJoin(siteGameLocale, eq(siteGameLocale.siteGameId, siteGame.id))
    .where(
      and(
        publicFilters(input.siteId, input.locale),
        eq(siteGame.indexable, true)
      )
    )
    .orderBy(desc(siteGameLocale.updatedAt))
    .limit(limit);
}
