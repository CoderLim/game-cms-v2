import { and, eq } from 'drizzle-orm';

import { siteSetting } from '@/config/db/game-schema';
import { db } from '@/core/db';
import { getUuid } from '@/lib/hash';

export type PublicSocialLink = {
  name?: string;
  displayName?: string;
  url: string;
};

export type PublicNavigationItem = {
  label: string;
  href: string;
};

export type PublicAnalyticsConfig = {
  gaId?: string;
  clarityId?: string;
};

export type PublicAdsConfig = {
  enabled?: boolean;
  adsenseClient?: string;
  slots?: Record<string, string>;
};

export type PublicFooterConfig = {
  description?: string;
};

export type PublicGamePlayerConfig = {
  allowFullscreen?: boolean;
  autoplay?: boolean;
};

export type PublicSiteConfig = {
  analytics: PublicAnalyticsConfig;
  ads: PublicAdsConfig;
  navigation: PublicNavigationItem[];
  footer: PublicFooterConfig;
  gamePlayer: PublicGamePlayerConfig;
  socialLinks: PublicSocialLink[];
};

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

function parseSetting<T>(
  values: Map<string, string | null>,
  key: string,
  fallback: T
): T {
  const raw = values.get(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getPublicSiteConfig(
  siteId: string
): Promise<PublicSiteConfig> {
  // Public pages need several independent settings at once. Reading all rows for
  // the current site avoids six round-trips to D1 on every page request.
  const rows = await list(siteId);
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return {
    analytics: parseSetting<PublicAnalyticsConfig>(values, 'analytics', {}),
    ads: parseSetting<PublicAdsConfig>(values, 'ads', {}),
    navigation: parseSetting<PublicNavigationItem[]>(values, 'navigation', []),
    footer: parseSetting<PublicFooterConfig>(values, 'footer', {}),
    gamePlayer: parseSetting<PublicGamePlayerConfig>(
      values,
      'game_player',
      {}
    ),
    socialLinks: parseSetting<PublicSocialLink[]>(values, 'social_links', []),
  };
}
