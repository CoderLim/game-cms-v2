import { and, eq } from 'drizzle-orm';

import { siteGameLocale } from '@/config/db/game-schema';
import { db } from '@/core/db';

import { SiteContentStatus } from './service';

export async function listPublishedLocales(input: {
  siteId: string;
  siteGameId: string;
}) {
  return db()
    .select({
      locale: siteGameLocale.locale,
      slug: siteGameLocale.slug,
      updatedAt: siteGameLocale.updatedAt,
    })
    .from(siteGameLocale)
    .where(
      and(
        eq(siteGameLocale.siteId, input.siteId),
        eq(siteGameLocale.siteGameId, input.siteGameId),
        eq(siteGameLocale.status, SiteContentStatus.PUBLISHED)
      )
    );
}
