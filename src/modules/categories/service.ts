import { and, count, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  game,
  gameCategory,
  gameCategoryMap,
  siteCategory,
  siteCategoryLocale,
  siteGame,
  siteGameCategory,
  siteGameLocale,
} from '@/config/db/game-schema';
import { GameStatus } from '@/modules/games/service';
import {
  SiteContentStatus,
  SiteGameStatus,
} from '@/modules/site-games/service';
import { getUuid } from '@/lib/hash';
import { resolveStaticAssetUrl } from '@/lib/static-asset-url';

export enum SiteCategoryStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

export async function createCategory(input: { key: string }) {
  const values = {
    id: getUuid(),
    key: normalizeKey(input.key),
  };

  const [row] = await db().insert(gameCategory).values(values).returning();
  return row;
}

export async function updateCategory(id: string, input: { key: string }) {
  const [row] = await db()
    .update(gameCategory)
    .set({ key: normalizeKey(input.key) })
    .where(eq(gameCategory.id, id))
    .returning();

  if (!row) throw new Error('Category not found');
  return row;
}

export async function removeCategory(id: string) {
  const [siteUsage] = await db()
    .select({ count: count() })
    .from(siteCategory)
    .where(eq(siteCategory.categoryId, id));
  const [gameUsage] = await db()
    .select({ count: count() })
    .from(gameCategoryMap)
    .where(eq(gameCategoryMap.categoryId, id));

  if (Number(siteUsage?.count || 0) > 0 || Number(gameUsage?.count || 0) > 0) {
    throw new Error(
      'Category is still in use. Remove its site/game assignments before deleting.'
    );
  }

  const [row] = await db()
    .delete(gameCategory)
    .where(eq(gameCategory.id, id))
    .returning();
  if (!row) throw new Error('Category not found');
  return row;
}

export async function attachCategory(input: {
  siteId: string;
  categoryId: string;
  imageUrl?: string | null;
  status?: SiteCategoryStatus;
  indexable?: boolean;
  sortWeight?: number;
}) {
  const values = {
    id: getUuid(),
    siteId: input.siteId,
    categoryId: input.categoryId,
    imageUrl: input.imageUrl ?? null,
    status: input.status || SiteCategoryStatus.DRAFT,
    indexable: input.indexable ?? false,
    sortWeight: input.sortWeight ?? 0,
  };

  const [row] = await db().insert(siteCategory).values(values).returning();
  return row;
}

export async function removeSiteCategory(siteId: string, id: string) {
  const [row] = await db()
    .delete(siteCategory)
    .where(and(eq(siteCategory.id, id), eq(siteCategory.siteId, siteId)))
    .returning();

  if (!row) throw new Error('Site category not found');
  return row;
}

export async function upsertLocaleContent(input: {
  siteId: string;
  siteCategoryId: string;
  locale: string;
  slug: string;
  title: string;
  status?: SiteContentStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
  description?: string | null;
  content?: string | null;
}) {
  const [parent] = await db()
    .select({ id: siteCategory.id })
    .from(siteCategory)
    .where(
      and(
        eq(siteCategory.id, input.siteCategoryId),
        eq(siteCategory.siteId, input.siteId)
      )
    )
    .limit(1);

  if (!parent) {
    throw new Error('site_category does not belong to the supplied site');
  }

  const values = {
    id: getUuid(),
    siteId: input.siteId,
    siteCategoryId: input.siteCategoryId,
    locale: input.locale,
    slug: normalizeSlug(input.slug),
    status: input.status || SiteContentStatus.DRAFT,
    title: input.title.trim(),
    metaTitle: input.metaTitle ?? null,
    metaDescription: input.metaDescription ?? null,
    description: input.description ?? null,
    content: input.content ?? null,
  };

  const [row] = await db()
    .insert(siteCategoryLocale)
    .values(values)
    .onConflictDoUpdate({
      target: [siteCategoryLocale.siteCategoryId, siteCategoryLocale.locale],
      set: {
        siteId: values.siteId,
        slug: values.slug,
        status: values.status,
        title: values.title,
        metaTitle: values.metaTitle,
        metaDescription: values.metaDescription,
        description: values.description,
        content: values.content,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
}

export async function assignGame(input: {
  siteId: string;
  siteGameId: string;
  siteCategoryId: string;
}) {
  // Both sides must belong to the same site. Keeping this check in the service
  // makes cross-site category leakage impossible even if an admin UI passes a
  // stale or tampered identifier.
  const [gameParent] = await db()
    .select({ id: siteGame.id })
    .from(siteGame)
    .where(
      and(eq(siteGame.id, input.siteGameId), eq(siteGame.siteId, input.siteId))
    )
    .limit(1);

  const [categoryParent] = await db()
    .select({ id: siteCategory.id })
    .from(siteCategory)
    .where(
      and(
        eq(siteCategory.id, input.siteCategoryId),
        eq(siteCategory.siteId, input.siteId)
      )
    )
    .limit(1);

  if (!gameParent || !categoryParent) {
    throw new Error(
      'site_game and site_category must belong to the supplied site'
    );
  }

  const values = {
    id: getUuid(),
    siteGameId: input.siteGameId,
    siteCategoryId: input.siteCategoryId,
  };

  const [row] = await db()
    .insert(siteGameCategory)
    .values(values)
    .onConflictDoNothing({
      target: [siteGameCategory.siteGameId, siteGameCategory.siteCategoryId],
    })
    .returning();

  return row;
}

export async function getPublishedBySlug(input: {
  siteId: string;
  locale: string;
  slug: string;
}) {
  const [row] = await db()
    .select({
      siteCategoryId: siteCategory.id,
      categoryId: gameCategory.id,
      categoryKey: gameCategory.key,
      imageUrl: siteCategory.imageUrl,
      slug: siteCategoryLocale.slug,
      title: siteCategoryLocale.title,
      metaTitle: siteCategoryLocale.metaTitle,
      metaDescription: siteCategoryLocale.metaDescription,
      description: siteCategoryLocale.description,
      content: siteCategoryLocale.content,
      sortWeight: siteCategory.sortWeight,
      contentUpdatedAt: siteCategoryLocale.updatedAt,
    })
    .from(siteCategoryLocale)
    .innerJoin(
      siteCategory,
      eq(siteCategory.id, siteCategoryLocale.siteCategoryId)
    )
    .innerJoin(gameCategory, eq(gameCategory.id, siteCategory.categoryId))
    .where(
      and(
        eq(siteCategoryLocale.siteId, input.siteId),
        eq(siteCategoryLocale.locale, input.locale),
        eq(siteCategoryLocale.slug, normalizeSlug(input.slug)),
        eq(siteCategoryLocale.status, SiteContentStatus.PUBLISHED),
        eq(siteCategory.status, SiteCategoryStatus.PUBLISHED)
      )
    )
    .limit(1);

  return row
    ? {
        ...row,
        imageUrl: resolveStaticAssetUrl(row.imageUrl),
      }
    : undefined;
}

export async function listPublished(input: {
  siteId: string;
  locale: string;
  indexableOnly?: boolean;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit || 100, 1), 500);
  const filters = [
    eq(siteCategoryLocale.siteId, input.siteId),
    eq(siteCategoryLocale.locale, input.locale),
    eq(siteCategoryLocale.status, SiteContentStatus.PUBLISHED),
    eq(siteCategory.status, SiteCategoryStatus.PUBLISHED),
  ];

  if (input.indexableOnly) filters.push(eq(siteCategory.indexable, true));

  const rows = await db()
    .select({
      siteCategoryId: siteCategory.id,
      categoryKey: gameCategory.key,
      imageUrl: siteCategory.imageUrl,
      slug: siteCategoryLocale.slug,
      title: siteCategoryLocale.title,
      description: siteCategoryLocale.description,
      sortWeight: siteCategory.sortWeight,
    })
    .from(siteCategoryLocale)
    .innerJoin(
      siteCategory,
      eq(siteCategory.id, siteCategoryLocale.siteCategoryId)
    )
    .innerJoin(gameCategory, eq(gameCategory.id, siteCategory.categoryId))
    .where(and(...filters))
    .orderBy(desc(siteCategory.sortWeight), siteCategoryLocale.title)
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    imageUrl: resolveStaticAssetUrl(row.imageUrl),
  }));
}

export async function listForGame(input: {
  siteId: string;
  siteGameId: string;
  locale: string;
}) {
  const rows = await db()
    .select({
      siteCategoryId: siteCategory.id,
      categoryKey: gameCategory.key,
      imageUrl: siteCategory.imageUrl,
      slug: siteCategoryLocale.slug,
      title: siteCategoryLocale.title,
    })
    .from(siteGameCategory)
    .innerJoin(siteGame, eq(siteGame.id, siteGameCategory.siteGameId))
    .innerJoin(
      siteCategory,
      eq(siteCategory.id, siteGameCategory.siteCategoryId)
    )
    .innerJoin(gameCategory, eq(gameCategory.id, siteCategory.categoryId))
    .innerJoin(
      siteCategoryLocale,
      and(
        eq(siteCategoryLocale.siteCategoryId, siteCategory.id),
        eq(siteCategoryLocale.siteId, input.siteId),
        eq(siteCategoryLocale.locale, input.locale)
      )
    )
    .where(
      and(
        eq(siteGameCategory.siteGameId, input.siteGameId),
        eq(siteGame.siteId, input.siteId),
        eq(siteGame.status, SiteGameStatus.PUBLISHED),
        eq(siteCategory.siteId, input.siteId),
        eq(siteCategory.status, SiteCategoryStatus.PUBLISHED),
        eq(siteCategoryLocale.status, SiteContentStatus.PUBLISHED)
      )
    )
    .orderBy(desc(siteCategory.sortWeight), siteCategoryLocale.title);

  return rows.map((row) => ({
    ...row,
    imageUrl: resolveStaticAssetUrl(row.imageUrl),
  }));
}

export async function listGames(input: {
  siteId: string;
  siteCategoryId: string;
  locale: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit || 24, 1), 200);

  const rows = await db()
    .select({
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
    })
    .from(siteGameCategory)
    .innerJoin(siteGame, eq(siteGame.id, siteGameCategory.siteGameId))
    .innerJoin(game, eq(game.id, siteGame.gameId))
    .innerJoin(
      siteGameLocale,
      and(
        eq(siteGameLocale.siteGameId, siteGame.id),
        eq(siteGameLocale.siteId, input.siteId),
        eq(siteGameLocale.locale, input.locale)
      )
    )
    .where(
      and(
        eq(siteGameCategory.siteCategoryId, input.siteCategoryId),
        eq(siteGame.siteId, input.siteId),
        eq(siteGame.status, SiteGameStatus.PUBLISHED),
        eq(siteGameLocale.status, SiteContentStatus.PUBLISHED),
        eq(game.status, GameStatus.ACTIVE)
      )
    )
    .orderBy(desc(siteGame.sortWeight), desc(siteGame.viewCount))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    imageUrl: resolveStaticAssetUrl(row.imageUrl),
  }));
}
