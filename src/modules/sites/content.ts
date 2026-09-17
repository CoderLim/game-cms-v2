import { and, eq } from 'drizzle-orm';

import { siteLocale } from '@/config/db/game-content-schema';
import { db } from '@/core/db';
import { getUuid } from '@/lib/hash';

export enum SiteLocaleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export async function get(input: { siteId: string; locale: string }) {
  const [row] = await db()
    .select()
    .from(siteLocale)
    .where(
      and(eq(siteLocale.siteId, input.siteId), eq(siteLocale.locale, input.locale))
    )
    .limit(1);
  return row;
}

export async function getPublished(input: { siteId: string; locale: string }) {
  const [row] = await db()
    .select()
    .from(siteLocale)
    .where(
      and(
        eq(siteLocale.siteId, input.siteId),
        eq(siteLocale.locale, input.locale),
        eq(siteLocale.status, SiteLocaleStatus.PUBLISHED)
      )
    )
    .limit(1);
  return row;
}

export async function upsert(input: {
  siteId: string;
  locale: string;
  status?: SiteLocaleStatus;
  title?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  intro?: string | null;
  content?: string | null;
}) {
  const values = {
    id: getUuid(),
    siteId: input.siteId,
    locale: input.locale.trim().toLowerCase(),
    status: input.status || SiteLocaleStatus.DRAFT,
    title: input.title?.trim() || null,
    metaTitle: input.metaTitle?.trim() || null,
    metaDescription: input.metaDescription?.trim() || null,
    intro: input.intro ?? null,
    content: input.content ?? null,
  };

  const [row] = await db()
    .insert(siteLocale)
    .values(values)
    .onConflictDoUpdate({
      target: [siteLocale.siteId, siteLocale.locale],
      set: {
        status: values.status,
        title: values.title,
        metaTitle: values.metaTitle,
        metaDescription: values.metaDescription,
        intro: values.intro,
        content: values.content,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
}