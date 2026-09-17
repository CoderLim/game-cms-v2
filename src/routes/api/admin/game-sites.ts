import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr, respPage } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import { listSites } from '@/modules/sites/admin';
import * as siteService from '@/modules/sites/service';

async function GET({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get('pageSize') || 20))
    );
    const search = searchParams.get('search') || undefined;

    const { items, total } = await listSites({ page, pageSize, search });
    return respPage(items, total);
  } catch (error: any) {
    return respErr(error.message || 'Failed to list sites');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body?.key || !body?.domain || !body?.name) {
      return respErr('key, domain and name are required');
    }

    const row = await siteService.create({
      key: body.key,
      domain: body.domain,
      name: body.name,
      defaultLocale: body.defaultLocale || 'en',
      enabledLocales: Array.isArray(body.enabledLocales)
        ? body.enabledLocales
        : [body.defaultLocale || 'en'],
      logoUrl: body.logoUrl || undefined,
      faviconUrl: body.faviconUrl || undefined,
      status: body.status,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to create site');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body?.id) return respErr('id is required');

    const row = await siteService.update(body.id, {
      key: body.key,
      domain: body.domain,
      name: body.name,
      defaultLocale: body.defaultLocale,
      enabledLocales: body.enabledLocales,
      logoUrl: body.logoUrl,
      faviconUrl: body.faviconUrl,
      status: body.status,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to update site');
  }
}

export const Route = createFileRoute('/api/admin/game-sites')({
  server: { handlers: { GET, POST, PUT } },
});
