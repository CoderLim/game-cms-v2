import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr, respPage } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import {
  createGameCategorySchema,
  parseBody,
  updateGameCategorySchema,
} from '@/modules/admin/game-engine-validation';
import { listCategoryCatalog } from '@/modules/categories/admin';
import {
  createCategory,
  ensureCanonicalCategories,
  removeCategory,
  updateCategory,
} from '@/modules/categories/service';

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

    const { items, total } = await listCategoryCatalog({ search, page, pageSize });
    return respPage(items, total);
  } catch (error: any) {
    return respErr(error.message || 'Failed to list game categories');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const raw = await request.json();
    if (
      raw &&
      typeof raw === 'object' &&
      'action' in raw &&
      raw.action === 'bootstrap'
    ) {
      return respData(await ensureCanonicalCategories());
    }

    const body = parseBody(createGameCategorySchema, raw);
    return respData(await createCategory({ key: body.key }));
  } catch (error: any) {
    return respErr(error.message || 'Failed to create game category');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = parseBody(updateGameCategorySchema, await request.json());
    return respData(await updateCategory(body.id, { key: body.key }));
  } catch (error: any) {
    return respErr(error.message || 'Failed to update game category');
  }
}

async function DELETE({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!id) return respErr('id is required');
    return respData(await removeCategory(id));
  } catch (error: any) {
    return respErr(error.message || 'Failed to delete game category');
  }
}

export const Route = createFileRoute('/api/admin/game-categories')({
  server: { handlers: { GET, POST, PUT, DELETE } },
});