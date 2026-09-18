import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import {
  parseBody,
  sitePostContentSchema,
} from '@/modules/admin/game-engine-validation';
import { getLocaleContent } from '@/modules/site-posts/content';
import {
  SitePostContentStatus,
  upsertLocaleContent,
} from '@/modules/site-posts/service';

async function GET({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
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
    await requireAdmin(request);
    const body = parseBody(sitePostContentSchema, await request.json());

    return respData(
      await upsertLocaleContent({
        siteId: body.siteId,
        sitePostId: body.sitePostId,
        locale: body.locale,
        slug: body.slug,
        title: body.title,
        status: body.status as SitePostContentStatus | undefined,
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