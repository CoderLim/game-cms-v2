import { eq } from 'drizzle-orm';

import { envConfigs } from '@/config';
import { site } from '@/config/db/game-schema';
import { db } from '@/core/db';
import { getUuid } from '@/lib/hash';

export enum SiteStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export type SiteContext = {
  id: string;
  key: string;
  domain: string;
  name: string;
  defaultLocale: string;
  enabledLocales: string[];
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function parseLocales(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // Fall back below. Invalid persisted config should not crash every request.
  }
  return ['en'];
}

export async function getByKey(key: string) {
  const [row] = await db()
    .select()
    .from(site)
    .where(eq(site.key, normalizeKey(key)))
    .limit(1);
  return row;
}

export async function getActiveByKey(key: string) {
  const row = await getByKey(key);
  if (!row || row.status !== SiteStatus.ACTIVE) return undefined;
  return row;
}

export async function getCurrentSiteContext(): Promise<SiteContext> {
  const siteKey = envConfigs.site_key;
  if (!siteKey) {
    throw new Error(
      'SITE_KEY is required for Game Site Engine public requests. Configure one logical site per deployment.'
    );
  }

  const row = await getActiveByKey(siteKey);
  if (!row) {
    throw new Error(`Active site not found for SITE_KEY=${siteKey}`);
  }

  const enabledLocales = parseLocales(row.enabledLocales);
  if (!enabledLocales.includes(row.defaultLocale)) {
    enabledLocales.unshift(row.defaultLocale);
  }

  return {
    id: row.id,
    key: row.key,
    domain: row.domain,
    name: row.name,
    defaultLocale: row.defaultLocale,
    enabledLocales: [...new Set(enabledLocales)],
  };
}

export async function create(input: {
  key: string;
  domain: string;
  name: string;
  defaultLocale?: string;
  enabledLocales?: string[];
  logoUrl?: string;
  faviconUrl?: string;
  status?: SiteStatus;
}) {
  const defaultLocale = input.defaultLocale || 'en';
  const locales = input.enabledLocales?.length
    ? [...new Set(input.enabledLocales)]
    : [defaultLocale];
  if (!locales.includes(defaultLocale)) locales.unshift(defaultLocale);

  const values = {
    id: getUuid(),
    key: normalizeKey(input.key),
    domain: input.domain.trim().toLowerCase(),
    name: input.name.trim(),
    status: input.status || SiteStatus.ACTIVE,
    defaultLocale,
    enabledLocales: JSON.stringify(locales),
    logoUrl: input.logoUrl || null,
    faviconUrl: input.faviconUrl || null,
  };

  const [row] = await db().insert(site).values(values).returning();
  return row;
}

export async function update(
  id: string,
  input: Partial<{
    key: string;
    domain: string;
    name: string;
    defaultLocale: string;
    enabledLocales: string[];
    logoUrl: string | null;
    faviconUrl: string | null;
    status: SiteStatus;
  }>
) {
  const values: Record<string, unknown> = {};

  if (input.key !== undefined) values.key = normalizeKey(input.key);
  if (input.domain !== undefined) {
    values.domain = input.domain.trim().toLowerCase();
  }
  if (input.name !== undefined) values.name = input.name.trim();
  if (input.defaultLocale !== undefined) {
    values.defaultLocale = input.defaultLocale;
  }
  if (input.enabledLocales !== undefined) {
    values.enabledLocales = JSON.stringify([...new Set(input.enabledLocales)]);
  }
  if (input.logoUrl !== undefined) values.logoUrl = input.logoUrl;
  if (input.faviconUrl !== undefined) values.faviconUrl = input.faviconUrl;
  if (input.status !== undefined) values.status = input.status;

  if (Object.keys(values).length === 0) return undefined;

  const [row] = await db()
    .update(site)
    .set(values)
    .where(eq(site.id, id))
    .returning();
  return row;
}
