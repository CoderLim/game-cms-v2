import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm';

import { game, siteGame } from '@/config/db/game-schema';
import { db } from '@/core/db';
import { getUuid } from '@/lib/hash';

export enum GameStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

export async function list(params: {
  status?: GameStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { status, search, page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;
  const conditions: SQL[] = [];

  if (status) conditions.push(eq(game.status, status));
  if (search) {
    conditions.push(
      or(like(game.title, `%${search}%`), like(game.key, `%${search}%`))!
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const [totalRow] = await db()
    .select({ count: count() })
    .from(game)
    .where(where);

  const items = await db()
    .select()
    .from(game)
    .where(where)
    .orderBy(desc(game.updatedAt), desc(game.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { items, total: totalRow.count };
}

export async function getById(id: string) {
  const [row] = await db().select().from(game).where(eq(game.id, id)).limit(1);
  return row;
}

export async function getByKey(key: string) {
  const [row] = await db()
    .select()
    .from(game)
    .where(eq(game.key, normalizeKey(key)))
    .limit(1);
  return row;
}

export async function create(input: {
  key: string;
  title: string;
  description?: string;
  embedUrl?: string;
  sourceUrl?: string;
  imageUrl?: string;
  provider?: string;
  embedType?: string;
  orientation?: string;
  aspectRatio?: string;
  status?: GameStatus;
}) {
  const values = {
    id: getUuid(),
    key: normalizeKey(input.key),
    title: input.title.trim(),
    description: input.description || null,
    embedUrl: input.embedUrl || null,
    sourceUrl: input.sourceUrl || null,
    imageUrl: input.imageUrl || null,
    provider: input.provider || null,
    embedType: input.embedType || 'iframe',
    orientation: input.orientation || null,
    aspectRatio: input.aspectRatio || null,
    status: input.status || GameStatus.ACTIVE,
  };

  const [row] = await db().insert(game).values(values).returning();
  return row;
}

export async function update(
  id: string,
  input: Partial<{
    key: string;
    title: string;
    description: string | null;
    embedUrl: string | null;
    sourceUrl: string | null;
    imageUrl: string | null;
    provider: string | null;
    embedType: string;
    orientation: string | null;
    aspectRatio: string | null;
    status: GameStatus;
  }>
) {
  const values: Record<string, unknown> = {};

  if (input.key !== undefined) values.key = normalizeKey(input.key);
  if (input.title !== undefined) values.title = input.title.trim();
  if (input.description !== undefined) values.description = input.description;
  if (input.embedUrl !== undefined) values.embedUrl = input.embedUrl;
  if (input.sourceUrl !== undefined) values.sourceUrl = input.sourceUrl;
  if (input.imageUrl !== undefined) values.imageUrl = input.imageUrl;
  if (input.provider !== undefined) values.provider = input.provider;
  if (input.embedType !== undefined) values.embedType = input.embedType;
  if (input.orientation !== undefined) values.orientation = input.orientation;
  if (input.aspectRatio !== undefined) values.aspectRatio = input.aspectRatio;
  if (input.status !== undefined) values.status = input.status;

  if (Object.keys(values).length === 0) return undefined;

  const [row] = await db()
    .update(game)
    .set(values)
    .where(eq(game.id, id))
    .returning();
  return row;
}

export async function remove(id: string) {
  const [usage] = await db()
    .select({ count: count() })
    .from(siteGame)
    .where(eq(siteGame.gameId, id));

  if (Number(usage?.count || 0) > 0) {
    throw new Error(
      'Game is attached to one or more sites. Archive it or detach it before deleting.'
    );
  }

  const [row] = await db().delete(game).where(eq(game.id, id)).returning();
  if (!row) throw new Error('Game not found');
  return row;
}
