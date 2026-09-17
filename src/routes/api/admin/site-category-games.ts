import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import { assignGame } from '@/modules/categories/service';

async function POST({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body?.siteId || !body?.siteGameId || !body?.siteCategoryId) {
      return respErr('siteId, siteGameId and siteCategoryId are required');
    }

    const row = await assignGame({
      siteId: body.siteId,
      siteGameId: body.siteGameId,
      siteCategoryId: body.siteCategoryId,
    });
    return respData(row || null);
  } catch (error: any) {
    return respErr(error.message || 'Failed to assign game to category');
  }
}

export const Route = createFileRoute('/api/admin/site-category-games')({
  server: { handlers: { POST } },
});
