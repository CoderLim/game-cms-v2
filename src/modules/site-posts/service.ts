import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm';

import { sitePost, sitePostLocale } from '@/config/db/game-content-schema';
import { db } from '@/core/db';
import { getUuid } from '@/lib/hash';

export enum SitePostType {
  ARTICLE = 'article',
  GUIDE = 'guide',
  UPDATE = 'update',
  PAGE = 'page',
}

export enum SitePostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum SitePostContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

export function publicPathForPost(type: string, slug: string) {
  if (type === SitePostType.GUIDE) return `/guides/${slug}`;
  if (type === SitePostType.PAGE) return `/${slug}`;
  return `/blog/${slug}`;
}

export async function createPost(input: {
  siteId: string;
  type?: SitePostType;
  status?: SitePostStatus;
  indexable?: boolean;
  featured?: boolean;
  authorName?: string | null;
  authorImage?: string | null;
}) {
  const values = {
    id: getUuid(),
    siteId: input.siteId,
    type: input.type || SitePostType.ARTICLE,
    status: input.status || SitePostStatus.DRAFT,
    indexable: input.indexable ?? false,
    featured: input.featured ?? false,
    authorName: input.authorName ?? null,
    authorImage: input.authorImage ?? null,
    publishedAt:
      input.status === SitePostStatus.PUBLISHED ? new Date() : null,
  };

  const [row] = await db().insert(sitePost).values(values).returning();
  return row;
}

export async function updatePost(
  id: string,
  siteId: string,
  input: Partial<{
    type: SitePostType;
    status: SitePostStatus;
    indexable: boolean;
    featured: boolean;
    authorName: string | null;
    authorImage: string | null;
  }>
) {
  const values: Record<string, unknown> = {};
  if (input.type !== undefined) values.type = input.type;
  if (input.status !== undefined) {
    values.status = input.status;
    if (input.status === SitePostStatus.PUBLISHED) values.publishedAt = new Date();
  }
  if (input.indexable !== undefined) values.indexable = input.indexable;
  if (input.featured !== undefined) values.featured = input.featured;
  if (input.authorName !== undefined) values.authorName = input.authorName;
  if (input.authorImage !== undefined) values.authorImage = input.authorImage;

  if (!Object.keys(values).length) return undefined;

  const [row] = await db()
    .update(sitePost)
    .set(values)
    .where(and(eq(sitePost.id, id), eq(sitePost.siteId, siteId)))
    .returning();
  return row;
}

export async function upsertLocaleContent(input: {
  siteId: string;
  sitePostId: string;
  locale: string;
  slug: string;
  title: string;
  status?: SitePostContentStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  content?: string | null;
}) {
  const [parent] = await db()
    .select({ id: sitePost.id })
    .from(sitePost)
    .where(and(eq(sitePost.id, input.sitePostId), eq(sitePost.siteId, input.siteId)))
    .limit(1);

  if (!parent) throw new Error('site_post does not belong to the supplied site');

  const values = {
    id: getUuid(),
    siteId: input.siteId,
    sitePostId: input.sitePostId,
    locale: input.locale,
    slug: normalizeSlug(input.slug),
    status: input.status || SitePostContentStatus.DRAFT,
    title: input.title.trim(),
    metaTitle: input.metaTitle ?? null,
    metaDescription: input.metaDescription ?? null,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    content: input.content ?? null,
  };

  const [row] = await db()
    .insert(sitePostLocale)
    .values(values)
    .onConflictDoUpdate({
      target: [sitePostLocale.sitePostId, sitePostLocale.locale],
      set: {
        siteId: values.siteId,
        slug: values.slug,
        status: values.status,
        title: values.title,
        metaTitle: values.metaTitle,
        metaDescription: values.metaDescription,
        description: values.description,
        imageUrl: values.imageUrl,
        content: values.content,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
}

function publicFilters(siteId: string, locale: string) {
  return and(
    eq(sitePost.siteId, siteId),
    eq(sitePostLocale.siteId, siteId),
    eq(sitePostLocale.locale, locale),
    eq(sitePost.status, SitePostStatus.PUBLISHED),
    eq(sitePostLocale.status, SitePostContentStatus.PUBLISHED)
  );
}

export async function getPublishedBySlug(input: {
  siteId: string;
  locale: string;
  slug: string;
  type?: SitePostType;
}) {
  const filters = [
    publicFilters(input.siteId, input.locale),
    eq(sitePostLocale.slug, normalizeSlug(input.slug)),
  ];
  if (input.type) filters.push(eq(sitePost.type, input.type));

  const [row] = await db()
    .select({
      sitePostId: sitePost.id,
      siteId: sitePost.siteId,
      type: sitePost.type,
      indexable: sitePost.indexable,
      featured: sitePost.featured,
      authorName: sitePost.authorName,
      authorImage: sitePost.authorImage,
      publishedAt: sitePost.publishedAt,
      locale: sitePostLocale.locale,
      slug: sitePostLocale.slug,
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
    .where(and(...filters))
    .limit(1);

  return row;
}

export async function listPublished(input: {
  siteId: string;
  locale: string;
  type?: SitePostType;
  indexableOnly?: boolean;
  featuredOnly?: boolean;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit || 50, 1), 500);
  const filters: SQL[] = [publicFilters(input.siteId, input.locale)!];
  if (input.type) filters.push(eq(sitePost.type, input.type));
  if (input.indexableOnly) filters.push(eq(sitePost.indexable, true));
  if (input.featuredOnly) filters.push(eq(sitePost.featured, true));

  return db()
    .select({
      sitePostId: sitePost.id,
      type: sitePost.type,
      slug: sitePostLocale.slug,
      title: sitePostLocale.title,
      description: sitePostLocale.description,
      imageUrl: sitePostLocale.imageUrl,
      authorName: sitePost.authorName,
      authorImage: sitePost.authorImage,
      featured: sitePost.featured,
      publishedAt: sitePost.publishedAt,
      updatedAt: sitePostLocale.updatedAt,
      locale: sitePostLocale.locale,
    })
    .from(sitePostLocale)
    .innerJoin(sitePost, eq(sitePost.id, sitePostLocale.sitePostId))
    .where(and(...filters))
    .orderBy(desc(sitePost.featured), desc(sitePost.publishedAt), desc(sitePostLocale.updatedAt))
    .limit(limit);
}

export async function listPublishedLocales(input: {
  siteId: string;
  sitePostId: string;
}) {
  return db()
    .select({
      locale: sitePostLocale.locale,
      slug: sitePostLocale.slug,
      updatedAt: sitePostLocale.updatedAt,
    })
    .from(sitePostLocale)
    .innerJoin(sitePost, eq(sitePost.id, sitePostLocale.sitePostId))
    .where(
      and(
        eq(sitePost.id, input.sitePostId),
        eq(sitePost.siteId, input.siteId),
        eq(sitePost.status, SitePostStatus.PUBLISHED),
        eq(sitePostLocale.siteId, input.siteId),
        eq(sitePostLocale.status, SitePostContentStatus.PUBLISHED)
      )
    );
}

export async function listAdmin(input: {
  siteId: string;
  locale?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(Math.max(input.pageSize || 20, 1), 100);
  const conditions: SQL[] = [eq(sitePost.siteId, input.siteId)];
  if (input.locale) conditions.push(eq(sitePostLocale.locale, input.locale));
  if (input.search) {
    conditions.push(
      or(
        like(sitePostLocale.title, `%${input.search}%`),
        like(sitePostLocale.slug, `%${input.search}%`)
      )!
    );
  }

  const where = and(...conditions);
  const [totalRow] = await db()
    .select({ count: count() })
    .from(sitePost)
    .leftJoin(
      sitePostLocale,
      and(
        eq(sitePostLocale.sitePostId, sitePost.id),
        input.locale ? eq(sitePostLocale.locale, input.locale) : undefined
      )
    )
    .where(where);

  const items = await db()
    .select({
      sitePostId: sitePost.id,
      type: sitePost.type,
      status: sitePost.status,
      indexable: sitePost.indexable,
      featured: sitePost.featured,
      authorName: sitePost.authorName,
      publishedAt: sitePost.publishedAt,
      locale: sitePostLocale.locale,
      slug: sitePostLocale.slug,
      contentStatus: sitePostLocale.status,
      title: sitePostLocale.title,
      description: sitePostLocale.description,
      updatedAt: sitePostLocale.updatedAt,
    })
    .from(sitePost)
    .leftJoin(
      sitePostLocale,
      and(
        eq(sitePostLocale.sitePostId, sitePost.id),
        input.locale ? eq(sitePostLocale.locale, input.locale) : undefined
      )
    )
    .where(where)
    .orderBy(desc(sitePost.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { items, total: totalRow.count };
}
