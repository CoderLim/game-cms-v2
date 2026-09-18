import { and, eq } from 'drizzle-orm';

import { siteCategoryLocale } from '@/config/db/game-schema';
import { db } from '@/core/db';

import { SiteContentStatus } from '@/modules/site-games/service';

export async function listPublishedLocales(input: {
  siteId: string;
  siteCategoryId: string;
}) {
  return db()
    .select({
      locale: siteCategoryLocale.locale,
      slug: siteCategoryLocale.slug,
      updatedAt: siteCategoryLocale.updatedAt,
    })
    .from(siteCategoryLocale)
    .where(
      and(
        eq(siteCategoryLocale.siteId, input.siteId),
        eq(siteCategoryLocale.siteCategoryId, input.siteCategoryId),
        eq(siteCategoryLocale.status, SiteContentStatus.PUBLISHED)
      )
    );
}
