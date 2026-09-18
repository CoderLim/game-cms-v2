import { and, eq } from 'drizzle-orm';

import { sitePost, sitePostLocale } from '@/config/db/game-content-schema';
import { db } from '@/core/db';

export async function getLocaleContent(input: {
  siteId: string;
  sitePostId: string;
  locale: string;
}) {
  const [row] = await db()
    .select({
      id: sitePostLocale.id,
      locale: sitePostLocale.locale,
      slug: sitePostLocale.slug,
      status: sitePostLocale.status,
      title: sitePostLocale.title,
      metaTitle: sitePostLocale.metaTitle,
      metaDescription: sitePostLocale.metaDescription,
      description: sitePostLocale.description,
      imageUrl: sitePostLocale.imageUrl,
      content: sitePostLocale.content,
      updatedAt: sitePostLocale.updatedAt,
    })
    .from(sitePostLocale)
    .innerJoin(sitePost, eq(sitePost.id, sitePostLocale.sitePostId))
    .where(
      and(
        eq(sitePost.id, input.sitePostId),
        eq(sitePost.siteId, input.siteId),
        eq(sitePostLocale.siteId, input.siteId),
        eq(sitePostLocale.locale, input.locale)
      )
    )
    .limit(1);

  return row;
}
