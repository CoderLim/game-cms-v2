import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr, respPage } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import { listSiteGames } from '@/modules/site-games/admin';
import * as siteGameService from '@/modules/site-games/service';

async function GET({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || '';
    const locale = searchParams.get('locale') || 'en';
    if (!siteId) return respErr('siteId is required');

    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get('pageSize') || 20))
    );
    const search = searchParams.get('search') || undefined;

    const { items, total } = await listSiteGames({
      siteId,
      locale,
      page,
      pageSize,
      search,
    });
    return respPage(items, total);
  } catch (error: any) {
    return respErr(error.message || 'Failed to list site games');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body?.siteId || !body?.gameId) {
      return respErr('siteId and gameId are required');
    }

    const row = await siteGameService.attachGame({
      siteId: body.siteId,
      gameId: body.gameId,
      status: body.status,
      indexable: body.indexable,
      featured: body.featured,
      hot: body.hot,
      sortWeight: body.sortWeight,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to attach game');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body?.id) return respErr('id is required');

    // Prefer an explicit site boundary from newer clients. Older admin builds
    // only sent the row id; resolve its persisted owner so the service still
    // performs an id+site_id update rather than a global id-only mutation.
    const existing = body.siteId ? undefined : await siteGameService.getById(body.id);
    const siteId = body.siteId || existing?.siteId;
    if (!siteId) return respErr('site game not found');

    const row = await siteGameService.updateSiteGame(siteId, body.id, {
      status: body.status,
      indexable: body.indexable,
      featured: body.featured,
      hot: body.hot,
      sortWeight: body.sortWeight,
    });
    if (!row) return respErr('site game not found for supplied site');
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to update site game');
  }
}

export const Route = createFileRoute('/api/admin/site-games')({
  server: { handlers: { GET, POST, PUT } },
});
