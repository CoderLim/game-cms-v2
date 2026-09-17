import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import { getLocaleContent } from '@/modules/site-games/admin';
import * as siteGameService from '@/modules/site-games/service';

async function GET({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || '';
    const siteGameId = searchParams.get('siteGameId') || '';
    const locale = searchParams.get('locale') || 'en';
    if (!siteId || !siteGameId) {
      return respErr('siteId and siteGameId are required');
    }

    const row = await getLocaleContent({ siteId, siteGameId, locale });
    return respData(row || null);
  } catch (error: any) {
    return respErr(error.message || 'Failed to get site game content');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body?.siteId || !body?.siteGameId || !body?.locale) {
      return respErr('siteId, siteGameId and locale are required');
    }
    if (!body?.slug || !body?.title) {
      return respErr('slug and title are required');
    }

    const row = await siteGameService.upsertLocaleContent({
      siteId: body.siteId,
      siteGameId: body.siteGameId,
      locale: body.locale,
      slug: body.slug,
      title: body.title,
      status: body.status,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      intro: body.intro,
      description: body.description,
      content: body.content,
      howToPlay: body.howToPlay,
      controls: body.controls,
      features: body.features,
      faq: body.faq,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to save site game content');
  }
}

export const Route = createFileRoute('/api/admin/site-game-content')({
  server: { handlers: { GET, PUT } },
});
