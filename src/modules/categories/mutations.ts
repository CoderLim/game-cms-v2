import { and, eq } from 'drizzle-orm';

import { siteCategory } from '@/config/db/game-schema';
import { db } from '@/core/db';

import { SiteCategoryStatus } from './service';

export async function updateSiteCategory(input: {
  siteId: string;
  siteCategoryId: string;
  status?: SiteCategoryStatus;
  indexable?: boolean;
  sortWeight?: number;
}) {
  const values: Record<string, unknown> = {};
  if (input.status !== undefined) values.status = input.status;
  if (input.indexable !== undefined) values.indexable = input.indexable;
  if (input.sortWeight !== undefined) values.sortWeight = input.sortWeight;

  if (Object.keys(values).length === 0) return undefined;

  const [row] = await db()
    .update(siteCategory)
    .set(values)
    .where(
      and(
        eq(siteCategory.id, input.siteCategoryId),
        eq(siteCategory.siteId, input.siteId)
      )
    )
    .returning();

  return row;
}
