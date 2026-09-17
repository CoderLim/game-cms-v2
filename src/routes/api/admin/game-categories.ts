import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr, respPage } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import { listCategoryCatalog } from '@/modules/categories/admin';
import { createCategory } from '@/modules/categories/service';

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

    const { items, total } = await listCategoryCatalog({
      search,
      page,
      pageSize,
    });
    return respPage(items, total);
  } catch (error: any) {
    return respErr(error.message || 'Failed to list game categories');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body?.key) return respErr('key is required');
    return respData(await createCategory({ key: body.key }));
  } catch (error: any) {
    return respErr(error.message || 'Failed to create game category');
  }
}

export const Route = createFileRoute('/api/admin/game-categories')({
  server: { handlers: { GET, POST } },
});
