import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import { getLocaleContent } from '@/modules/categories/admin';
import { upsertLocaleContent } from '@/modules/categories/service';

async function GET({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || '';
    const siteCategoryId = searchParams.get('siteCategoryId') || '';
    const locale = searchParams.get('locale') || 'en';
    if (!siteId || !siteCategoryId) {
      return respErr('siteId and siteCategoryId are required');
    }

    const row = await getLocaleContent({ siteId, siteCategoryId, locale });
    return respData(row || null);
  } catch (error: any) {
    return respErr(error.message || 'Failed to get site category content');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body?.siteId || !body?.siteCategoryId || !body?.locale) {
      return respErr('siteId, siteCategoryId and locale are required');
    }
    if (!body?.slug || !body?.title) {
      return respErr('slug and title are required');
    }

    const row = await upsertLocaleContent({
      siteId: body.siteId,
      siteCategoryId: body.siteCategoryId,
      locale: body.locale,
      slug: body.slug,
      title: body.title,
      status: body.status,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      description: body.description,
      content: body.content,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to save site category content');
  }
}

export const Route = createFileRoute('/api/admin/site-category-content')({
  server: { handlers: { GET, PUT } },
});
