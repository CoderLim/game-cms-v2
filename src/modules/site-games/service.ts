import { and, desc, eq, sql } from 'drizzle-orm';

import {
  game,
  siteGame,
  siteGameLocale,
} from '@/config/db/game-schema';
import { db } from '@/core/db';
import { getUuid } from '@/lib/hash';

import { GameStatus } from '@/modules/games/service';

export enum SiteGameStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum SiteContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

export async function attachGame(input: {
  siteId: string;
  gameId: string;
  status?: SiteGameStatus;
  indexable?: boolean;
  featured?: boolean;
  hot?: boolean;
  sortWeight?: number;
}) {
  const values = {
    id: getUuid(),
    siteId: input.siteId,
    gameId: input.gameId,
    status: input.status || SiteGameStatus.DRAFT,
    indexable: input.indexable ?? false,
    featured: input.featured ?? false,
    hot: input.hot ?? false,
    sortWeight: input.sortWeight ?? 0,
    publishedAt:
      input.status === SiteGameStatus.PUBLISHED ? new Date() : null,
  };

  const [row] = await db().insert(siteGame).values(values).returning();
  return row;
}

export async function getById(id: string) {
  const [row] = await db()
    .select()
    .from(siteGame)
    .where(eq(siteGame.id, id))
    .limit(1);
  return row;
}

export async function updateSiteGame(
  id: string,
  input: Partial<{
    status: SiteGameStatus;
    indexable: boolean;
    featured: boolean;
    hot: boolean;
    sortWeight: number;
  }>
) {
  const values: any = {};
  if (input.status !== undefined) {
    values.status = input.status;
    if (input.status === SiteGameStatus.PUBLISHED) {
      values.publishedAt = new Date();
    }
  }
  if (input.indexable !== undefined) values.indexable = input.indexable;
  if (input.featured !== undefined) values.featured = input.featured;
  if (input.hot !== undefined) values.hot = input.hot;
  if (input.sortWeight !== undefined) values.sortWeight = input.sortWeight;

  if (Object.keys(values).length === 0) return undefined;

  const [row] = await db()
    .update(siteGame)
    .set(values)
    .where(eq(siteGame.id, id))
    .returning();
  return row;
}

export async function upsertLocaleContent(input: {
  siteId: string;
  siteGameId: string;
  locale: string;
  slug: string;
  title: string;
  status?: SiteContentStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
  intro?: string | null;
  description?: string | null;
  content?: string | null;
  howToPlay?: string | null;
  controls?: string | null;
  features?: string | null;
  faq?: string | null;
}) {
  // Validate the site boundary before writing localized content. This prevents
  // accidentally attaching Site A content to Site B's site_game row.
  const [parent] = await db()
    .select({ id: siteGame.id })
    .from(siteGame)
    .where(
      and(eq(siteGame.id, input.siteGameId), eq(siteGame.siteId, input.siteId))
    )
    .limit(1);

  if (!parent) {
    throw new Error('site_game does not belong to the supplied site');
  }

  const values = {
    id: getUuid(),
    siteId: input.siteId,
    siteGameId: input.siteGameId,
    locale: input.locale,
    slug: normalizeSlug(input.slug),
    status: input.status || SiteContentStatus.DRAFT,
    title: input.title.trim(),
    metaTitle: input.metaTitle ?? null,
    metaDescription: input.metaDescription ?? null,
    intro: input.intro ?? null,
    description: input.description ?? null,
    content: input.content ?? null,
    howToPlay: input.howToPlay ?? null,
    controls: input.controls ?? null,
    features: input.features ?? null,
    faq: input.faq ?? null,
  };

  const [row] = await db()
    .insert(siteGameLocale)
    .values(values)
    .onConflictDoUpdate({
      target: [siteGameLocale.siteGameId, siteGameLocale.locale],
      set: {
        siteId: values.siteId,
        slug: values.slug,
        status: values.status,
        title: values.title,
        metaTitle: values.metaTitle,
        metaDescription: values.metaDescription,
        intro: values.intro,
        description: values.description,
        content: values.content,
        howToPlay: values.howToPlay,
        controls: values.controls,
        features: values.features,
        faq: values.faq,
        updatedAt: new Date(),
      },
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
      siteGameId: siteGame.id,
      siteId: siteGame.siteId,
      gameId: game.id,
      gameKey: game.key,
      gameTitle: game.title,
      gameDescription: game.description,
      embedUrl: game.embedUrl,
      sourceUrl: game.sourceUrl,
      imageUrl: game.imageUrl,
      provider: game.provider,
      embedType: game.embedType,
      orientation: game.orientation,
      aspectRatio: game.aspectRatio,
      featured: siteGame.featured,
      hot: siteGame.hot,
      viewCount: siteGame.viewCount,
      likeCount: siteGame.likeCount,
      dislikeCount: siteGame.dislikeCount,
      locale: siteGameLocale.locale,
      slug: siteGameLocale.slug,
      title: siteGameLocale.title,
      metaTitle: siteGameLocale.metaTitle,
      metaDescription: siteGameLocale.metaDescription,
      intro: siteGameLocale.intro,
      description: siteGameLocale.description,
      content: siteGameLocale.content,
      howToPlay: siteGameLocale.howToPlay,
      controls: siteGameLocale.controls,
      features: siteGameLocale.features,
      faq: siteGameLocale.faq,
      contentUpdatedAt: siteGameLocale.updatedAt,
    })
    .from(siteGameLocale)
    .innerJoin(siteGame, eq(siteGame.id, siteGameLocale.siteGameId))
    .innerJoin(game, eq(game.id, siteGame.gameId))
    .where(
      and(
        eq(siteGameLocale.siteId, input.siteId),
        eq(siteGameLocale.locale, input.locale),
        eq(siteGameLocale.slug, normalizeSlug(input.slug)),
        eq(siteGameLocale.status, SiteContentStatus.PUBLISHED),
        eq(siteGame.status, SiteGameStatus.PUBLISHED),
        eq(game.status, GameStatus.ACTIVE)
      )
    )
    .limit(1);

  return row;
}

export async function listPublished(input: {
  siteId: string;
  locale: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit || 20, 1), 100);

  return db()
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
    .from(siteGameLocale)
    .innerJoin(siteGame, eq(siteGame.id, siteGameLocale.siteGameId))
    .innerJoin(game, eq(game.id, siteGame.gameId))
    .where(
      and(
        eq(siteGameLocale.siteId, input.siteId),
        eq(siteGameLocale.locale, input.locale),
        eq(siteGameLocale.status, SiteContentStatus.PUBLISHED),
        eq(siteGame.status, SiteGameStatus.PUBLISHED),
        eq(game.status, GameStatus.ACTIVE)
      )
    )
    .orderBy(desc(siteGame.sortWeight), desc(siteGame.publishedAt))
    .limit(limit);
}

export async function incrementView(siteGameId: string) {
  const [row] = await db()
    .update(siteGame)
    .set({ viewCount: sql`${siteGame.viewCount} + 1` })
    .where(eq(siteGame.id, siteGameId))
    .returning({ viewCount: siteGame.viewCount });
  return row?.viewCount;
}
