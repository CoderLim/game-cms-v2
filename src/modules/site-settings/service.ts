import { and, eq } from 'drizzle-orm';

import { siteSetting } from '@/config/db/game-schema';
import { db } from '@/core/db';
import { getUuid } from '@/lib/hash';

export async function get(siteId: string, key: string) {
  const [row] = await db()
    .select()
    .from(siteSetting)
    .where(and(eq(siteSetting.siteId, siteId), eq(siteSetting.key, key)))
    .limit(1);
  return row;
}

export async function getValue(siteId: string, key: string) {
  const row = await get(siteId, key);
  return row?.value ?? undefined;
}

export async function getJson<T>(
  siteId: string,
  key: string,
  fallback: T
): Promise<T> {
  const value = await getValue(siteId, key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function list(siteId: string) {
  return db().select().from(siteSetting).where(eq(siteSetting.siteId, siteId));
}

export async function set(input: {
  siteId: string;
  key: string;
  value: string | null;
}) {
  const values = {
    id: getUuid(),
    siteId: input.siteId,
    key: input.key.trim(),
    value: input.value,
  };

  const [row] = await db()
    .insert(siteSetting)
    .values(values)
    .onConflictDoUpdate({
      target: [siteSetting.siteId, siteSetting.key],
      set: {
        value: values.value,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
}

export async function setJson(input: {
  siteId: string;
  key: string;
  value: unknown;
}) {
  return set({
    siteId: input.siteId,
    key: input.key,
    value: JSON.stringify(input.value),
  });
}

export async function remove(siteId: string, key: string) {
  const [row] = await db()
    .delete(siteSetting)
    .where(and(eq(siteSetting.siteId, siteId), eq(siteSetting.key, key)))
    .returning();
  return row;
}

export async function getPublicSiteConfig(siteId: string) {
  const [analytics, ads, navigation, footer, gamePlayer] = await Promise.all([
    getJson(siteId, 'analytics', {}),
    getJson(siteId, 'ads', {}),
    getJson(siteId, 'navigation', []),
    getJson(siteId, 'footer', {}),
    getJson(siteId, 'game_player', {}),
  ]);

  return {
    analytics,
    ads,
    navigation,
    footer,
    gamePlayer,
  };
}
