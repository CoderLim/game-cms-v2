import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm';

import { site } from '@/config/db/game-schema';
import { db } from '@/core/db';
import { SiteStatus } from './service';

export async function listSites(input: {
  status?: SiteStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 20));
  const offset = (page - 1) * pageSize;
  const conditions: SQL[] = [];

  if (input.status) conditions.push(eq(site.status, input.status));
  if (input.search) {
    conditions.push(
      or(
        like(site.name, `%${input.search}%`),
        like(site.key, `%${input.search}%`),
        like(site.domain, `%${input.search}%`)
      )!
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const [totalRow] = await db().select({ count: count() }).from(site).where(where);
  const items = await db()
    .select()
    .from(site)
    .where(where)
    .orderBy(desc(site.updatedAt), desc(site.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { items, total: totalRow.count };
}
