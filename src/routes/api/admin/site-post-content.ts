import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';
import { getLocaleContent } from '@/modules/site-posts/content';
import { upsertLocaleContent } from '@/modules/site-posts/service';
import { respData, respErr } from '@/lib/resp';

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
    const sitePostId = searchParams.get('sitePostId');
    const locale = searchParams.get('locale');
    if (!siteId || !sitePostId || !locale) {
      return respErr('siteId, sitePostId and locale are required');
    }
    return respData(await getLocaleContent({ siteId, sitePostId, locale }));
  } catch (error: any) {
    return respErr(error.message || 'Failed to load site post content');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await checkAdmin(request);
    const body = await request.json();
    if (!body.siteId || !body.sitePostId || !body.locale || !body.slug || !body.title) {
      return respErr('siteId, sitePostId, locale, slug and title are required');
    }
    return respData(
      await upsertLocaleContent({
        siteId: body.siteId,
        sitePostId: body.sitePostId,
        locale: body.locale,
        slug: body.slug,
        title: body.title,
        status: body.status,
        metaTitle: body.metaTitle ?? null,
        metaDescription: body.metaDescription ?? null,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        content: body.content ?? null,
      })
    );
  } catch (error: any) {
    return respErr(error.message || 'Failed to save site post content');
  }
}

export const Route = createFileRoute('/api/admin/site-post-content')({
  server: { handlers: { GET, PUT } },
});
