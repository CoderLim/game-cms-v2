import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import {
  parseBody,
  siteLocaleContentSchema,
} from '@/modules/admin/game-engine-validation';
import { get, SiteLocaleStatus, upsert } from '@/modules/sites/content';

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
    const body = parseBody(siteLocaleContentSchema, await request.json());

    const row = await upsert({
      siteId: body.siteId,
      locale: body.locale,
      status: (body.status || SiteLocaleStatus.DRAFT) as SiteLocaleStatus,
      title: body.title ?? null,
      metaTitle: body.metaTitle ?? null,
      metaDescription: body.metaDescription ?? null,
      intro: body.intro ?? null,
      content: body.content ?? null,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to save site content');
  }
}

export const Route = createFileRoute('/api/admin/site-content')({
  server: { handlers: { GET, PUT } },
});