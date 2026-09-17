import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import {
  parseBody,
  siteGameContentSchema,
} from '@/modules/admin/game-engine-validation';
import { getLocaleContent } from '@/modules/site-games/admin';
import { findCrossSiteDuplicateGameContent } from '@/modules/site-games/duplicate-content';
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
    const body = parseBody(siteGameContentSchema, await request.json());

    // Publishing is the SEO boundary. Drafts may duplicate temporary source
    // material, but published copy for the same game must be site-specific.
    if (body.status === 'published') {
      const duplicate = await findCrossSiteDuplicateGameContent({
        siteId: body.siteId,
        siteGameId: body.siteGameId,
        locale: body.locale,
        description: body.description,
        content: body.content,
        howToPlay: body.howToPlay,
        controls: body.controls,
        features: body.features,
        faq: body.faq,
      });

      if (duplicate) {
        return respErr(
          `Publishing blocked: this game has the same long-form ${body.locale} content on ${duplicate.domain} (${duplicate.slug}). Rewrite the page for this site before publishing.`
        );
      }
    }

    const row = await siteGameService.upsertLocaleContent({
      siteId: body.siteId,
      siteGameId: body.siteGameId,
      locale: body.locale,
      slug: body.slug,
      title: body.title,
      status: body.status as siteGameService.SiteContentStatus | undefined,
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