import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm';

import {
  gameCategory,
  siteCategory,
  siteCategoryLocale,
} from '@/config/db/game-schema';
import { db } from '@/core/db';

import { SiteCategoryStatus } from './service';

export async function listCategoryCatalog(input: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 20));
  const offset = (page - 1) * pageSize;
  const where = input.search
    ? like(gameCategory.key, `%${input.search}%`)
    : undefined;

  const [totalRow] = await db()
    .select({ count: count() })
    .from(gameCategory)
    .where(where);
  const items = await db()
    .select()
    .from(gameCategory)
    .where(where)
    .orderBy(desc(gameCategory.updatedAt), gameCategory.key)
    .limit(pageSize)
    .offset(offset);

  return { items, total: totalRow.count };
}

export async function listSiteCategories(input: {
  siteId: string;
  locale: string;
  status?: SiteCategoryStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 20));
  const offset = (page - 1) * pageSize;
  const conditions: SQL[] = [eq(siteCategory.siteId, input.siteId)];

  if (input.status) conditions.push(eq(siteCategory.status, input.status));
  if (input.search) {
    conditions.push(
      or(
        like(gameCategory.key, `%${input.search}%`),
        like(siteCategoryLocale.title, `%${input.search}%`),
        like(siteCategoryLocale.slug, `%${input.search}%`)
      )!
    );
  }

  const contentJoin = and(
    eq(siteCategoryLocale.siteCategoryId, siteCategory.id),
    eq(siteCategoryLocale.siteId, input.siteId),
    eq(siteCategoryLocale.locale, input.locale)
  );
  const where = and(...conditions);

  const [totalRow] = await db()
    .select({ count: count() })
    .from(siteCategory)
    .innerJoin(gameCategory, eq(gameCategory.id, siteCategory.categoryId))
    .leftJoin(siteCategoryLocale, contentJoin)
    .where(where);

  const items = await db()
    .select({
      id: siteCategory.id,
      siteId: siteCategory.siteId,
      categoryId: siteCategory.categoryId,
      categoryKey: gameCategory.key,
      imageUrl: siteCategory.imageUrl,
      status: siteCategory.status,
      indexable: siteCategory.indexable,
      sortWeight: siteCategory.sortWeight,
      locale: siteCategoryLocale.locale,
      slug: siteCategoryLocale.slug,
      localizedTitle: siteCategoryLocale.title,
      contentStatus: siteCategoryLocale.status,
      updatedAt: siteCategory.updatedAt,
    })
    .from(siteCategory)
    .innerJoin(gameCategory, eq(gameCategory.id, siteCategory.categoryId))
    .leftJoin(siteCategoryLocale, contentJoin)
    .where(where)
    .orderBy(desc(siteCategory.sortWeight), desc(siteCategory.updatedAt))
    .limit(pageSize)
    .offset(offset);

  return { items, total: totalRow.count };
}

export async function getLocaleContent(input: {
  siteId: string;
  siteCategoryId: string;
  locale: string;
}) {
  const [row] = await db()
    .select()
    .from(siteCategoryLocale)
    .where(
      and(
        eq(siteCategoryLocale.siteId, input.siteId),
        eq(siteCategoryLocale.siteCategoryId, input.siteCategoryId),
        eq(siteCategoryLocale.locale, input.locale)
      )
    )
    .limit(1);

  return row;
}
