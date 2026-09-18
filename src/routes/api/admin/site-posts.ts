import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr, respPage } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import {
  createSitePostSchema,
  parseBody,
  updateSitePostSchema,
} from '@/modules/admin/game-engine-validation';
import {
  createPost,
  listAdmin,
  SitePostContentStatus,
  SitePostStatus,
  SitePostType,
  updatePost,
  upsertLocaleContent,
} from '@/modules/site-posts/service';

async function GET({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return respErr('siteId is required');

    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get('pageSize') || 20))
    );
    const locale = searchParams.get('locale') || undefined;
    const search = searchParams.get('search') || undefined;
    const result = await listAdmin({ siteId, locale, search, page, pageSize });
    return respPage(result.items, result.total);
  } catch (error: any) {
    return respErr(error.message || 'Failed to list site posts');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = parseBody(createSitePostSchema, await request.json());

    const post = await createPost({
      siteId: body.siteId,
      type: (body.type || SitePostType.ARTICLE) as SitePostType,
      status: (body.status || SitePostStatus.DRAFT) as SitePostStatus,
      indexable: body.indexable ?? false,
      featured: body.featured ?? false,
      authorName: body.authorName || null,
    });

    if (body.locale && body.slug && body.title) {
      await upsertLocaleContent({
        siteId: body.siteId,
        sitePostId: post.id,
        locale: body.locale,
        slug: body.slug,
        title: body.title,
        status: (body.contentStatus ||
          SitePostContentStatus.DRAFT) as SitePostContentStatus,
        metaTitle: body.metaTitle || null,
        metaDescription: body.metaDescription || null,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        content: body.content || null,
      });
    }

    return respData(post);
  } catch (error: any) {
    return respErr(error.message || 'Failed to create site post');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = parseBody(updateSitePostSchema, await request.json());

    const post = await updatePost(body.sitePostId, body.siteId, {
      type: body.type as SitePostType | undefined,
      status: body.status as SitePostStatus | undefined,
      indexable: body.indexable,
      featured: body.featured,
      authorName: body.authorName,
    });

    if (body.locale && body.slug && body.title) {
      await upsertLocaleContent({
        siteId: body.siteId,
        sitePostId: body.sitePostId,
        locale: body.locale,
        slug: body.slug,
        title: body.title,
        status: body.contentStatus as SitePostContentStatus | undefined,
        metaTitle: body.metaTitle ?? null,
        metaDescription: body.metaDescription ?? null,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        content: body.content ?? null,
      });
    }

    return respData(post);
  } catch (error: any) {
    return respErr(error.message || 'Failed to update site post');
  }
}

export const Route = createFileRoute('/api/admin/site-posts')({
  server: { handlers: { GET, POST, PUT } },
});