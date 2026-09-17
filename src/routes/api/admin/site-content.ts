import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import {
  get,
  SiteLocaleStatus,
  upsert,
} from '@/modules/sites/content';

async function GET({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || '';
    const locale = (searchParams.get('locale') || 'en').trim().toLowerCase();
    if (!siteId) return respErr('siteId is required');

    const row = await get({ siteId, locale });
    return respData(row || null);
  } catch (error: any) {
    return respErr(error.message || 'Failed to load site content');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body?.siteId || !body?.locale) {
      return respErr('siteId and locale are required');
    }

    const allowedStatuses = new Set(Object.values(SiteLocaleStatus));
    if (body.status && !allowedStatuses.has(body.status)) {
      return respErr('Invalid site content status');
    }

    const row = await upsert({
      siteId: body.siteId,
      locale: String(body.locale),
      status: body.status || SiteLocaleStatus.DRAFT,
      title: typeof body.title === 'string' ? body.title : null,
      metaTitle: typeof body.metaTitle === 'string' ? body.metaTitle : null,
      metaDescription:
        typeof body.metaDescription === 'string' ? body.metaDescription : null,
      intro: typeof body.intro === 'string' ? body.intro : null,
      content: typeof body.content === 'string' ? body.content : null,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to save site content');
  }
}

export const Route = createFileRoute('/api/admin/site-content')({
  server: { handlers: { GET, PUT } },
});