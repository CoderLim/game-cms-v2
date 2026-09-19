import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr, respPage } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import {
  attachSiteCategorySchema,
  parseBody,
  updateSiteCategorySchema,
} from '@/modules/admin/game-engine-validation';
import { listSiteCategories } from '@/modules/categories/admin';
import { updateSiteCategory } from '@/modules/categories/mutations';
import {
  attachCategory,
  type SiteCategoryStatus,
} from '@/modules/categories/service';

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

    const { items, total } = await listSiteCategories({
      siteId,
      locale,
      page,
      pageSize,
      search,
    });
    return respPage(items, total);
  } catch (error: any) {
    return respErr(error.message || 'Failed to list site categories');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = parseBody(attachSiteCategorySchema, await request.json());

    const row = await attachCategory({
      siteId: body.siteId,
      categoryId: body.categoryId,
      imageUrl: body.imageUrl,
      status: body.status as SiteCategoryStatus | undefined,
      indexable: body.indexable,
      sortWeight: body.sortWeight,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to attach category');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = parseBody(updateSiteCategorySchema, await request.json());

    const row = await updateSiteCategory({
      siteId: body.siteId,
      siteCategoryId: body.id,
      imageUrl: body.imageUrl,
      status: body.status as SiteCategoryStatus | undefined,
      indexable: body.indexable,
      sortWeight: body.sortWeight,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to update site category');
  }
}

export const Route = createFileRoute('/api/admin/site-categories')({
  server: { handlers: { GET, POST, PUT } },
});