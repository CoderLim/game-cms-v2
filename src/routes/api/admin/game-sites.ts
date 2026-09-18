import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr, respPage } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import {
  createSiteSchema,
  parseBody,
  updateSiteSchema,
} from '@/modules/admin/game-engine-validation';
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
    const body = parseBody(createSiteSchema, await request.json());
    const enabledLocales = body.enabledLocales?.length
      ? body.enabledLocales
      : [body.defaultLocale];

    const row = await siteService.create({
      key: body.key,
      domain: body.domain,
      name: body.name,
      defaultLocale: body.defaultLocale,
      enabledLocales,
      logoUrl: body.logoUrl || undefined,
      faviconUrl: body.faviconUrl || undefined,
      status: body.status as siteService.SiteStatus | undefined,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to create site');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = parseBody(updateSiteSchema, await request.json());

    const row = await siteService.update(body.id, {
      key: body.key,
      domain: body.domain,
      name: body.name,
      defaultLocale: body.defaultLocale,
      enabledLocales: body.enabledLocales,
      logoUrl: body.logoUrl,
      faviconUrl: body.faviconUrl,
      status: body.status as siteService.SiteStatus | undefined,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to update site');
  }
}

export const Route = createFileRoute('/api/admin/game-sites')({
  server: { handlers: { GET, POST, PUT } },
});