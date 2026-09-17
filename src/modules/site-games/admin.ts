import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm';

import { game, siteGame, siteGameLocale } from '@/config/db/game-schema';
import { db } from '@/core/db';

import { SiteGameStatus } from './service';

export async function listSiteGames(input: {
  siteId: string;
  locale: string;
  status?: SiteGameStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 20));
  const offset = (page - 1) * pageSize;
  const conditions: SQL[] = [eq(siteGame.siteId, input.siteId)];

  if (input.status) conditions.push(eq(siteGame.status, input.status));
  if (input.search) {
    conditions.push(
      or(
        like(game.title, `%${input.search}%`),
        like(game.key, `%${input.search}%`),
        like(siteGameLocale.title, `%${input.search}%`),
        like(siteGameLocale.slug, `%${input.search}%`)
      )!
    );
  }

  const contentJoin = and(
    eq(siteGameLocale.siteGameId, siteGame.id),
    eq(siteGameLocale.siteId, input.siteId),
    eq(siteGameLocale.locale, input.locale)
  );
  const where = and(...conditions);

  const [totalRow] = await db()
    .select({ count: count() })
    .from(siteGame)
    .innerJoin(game, eq(game.id, siteGame.gameId))
    .leftJoin(siteGameLocale, contentJoin)
    .where(where);

  const items = await db()
    .select({
      id: siteGame.id,
      siteId: siteGame.siteId,
      gameId: siteGame.gameId,
      gameKey: game.key,
      catalogTitle: game.title,
      imageUrl: game.imageUrl,
      status: siteGame.status,
      indexable: siteGame.indexable,
      featured: siteGame.featured,
      hot: siteGame.hot,
      sortWeight: siteGame.sortWeight,
      viewCount: siteGame.viewCount,
      likeCount: siteGame.likeCount,
      dislikeCount: siteGame.dislikeCount,
      publishedAt: siteGame.publishedAt,
      locale: siteGameLocale.locale,
      slug: siteGameLocale.slug,
      localizedTitle: siteGameLocale.title,
      contentStatus: siteGameLocale.status,
      updatedAt: siteGame.updatedAt,
    })
    .from(siteGame)
    .innerJoin(game, eq(game.id, siteGame.gameId))
    .leftJoin(siteGameLocale, contentJoin)
    .where(where)
    .orderBy(desc(siteGame.updatedAt), desc(siteGame.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { items, total: totalRow.count };
}

export async function getLocaleContent(input: {
  siteId: string;
  siteGameId: string;
  locale: string;
}) {
  const [row] = await db()
    .select()
    .from(siteGameLocale)
    .where(
      and(
        eq(siteGameLocale.siteId, input.siteId),
        eq(siteGameLocale.siteGameId, input.siteGameId),
        eq(siteGameLocale.locale, input.locale)
      )
    )
    .limit(1);

  return row;
}
