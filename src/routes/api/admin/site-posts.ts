import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';
import {
  createPost,
  listAdmin,
  SitePostContentStatus,
  SitePostStatus,
  SitePostType,
  updatePost,
  upsertLocaleContent,
} from '@/modules/site-posts/service';
import { respData, respErr, respPage } from '@/lib/resp';

async function checkAdmin(request: Request) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw new Error('Unauthorized');
  if (!(await hasPermission(session.user.id, 'admin.*'))) {
    throw new Error('Forbidden');
  }
}

async function GET({ request }: { request: Request }) {
  try {
    await checkAdmin(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return respErr('siteId is required');

    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 20)));
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
    await checkAdmin(request);
    const body = await request.json();
    if (!body.siteId) return respErr('siteId is required');

    const post = await createPost({
      siteId: body.siteId,
      type: body.type || SitePostType.ARTICLE,
      status: body.status || SitePostStatus.DRAFT,
      indexable: Boolean(body.indexable),
      featured: Boolean(body.featured),
      authorName: body.authorName || null,
    });

    if (body.locale && body.slug && body.title) {
      await upsertLocaleContent({
        siteId: body.siteId,
        sitePostId: post.id,
        locale: body.locale,
        slug: body.slug,
        title: body.title,
        status: body.contentStatus || SitePostContentStatus.DRAFT,
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
    await checkAdmin(request);
    const body = await request.json();
    if (!body.siteId || !body.sitePostId) {
      return respErr('siteId and sitePostId are required');
    }

    const post = await updatePost(body.sitePostId, body.siteId, {
      type: body.type,
      status: body.status,
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
        status: body.contentStatus,
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
