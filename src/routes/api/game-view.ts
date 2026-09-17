import { createFileRoute } from '@tanstack/react-router';

import { incrementView } from '@/modules/site-games/mutations';
import { getCurrentSiteContext } from '@/modules/sites/service';

async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const siteGameId =
      typeof body?.siteGameId === 'string' ? body.siteGameId.trim() : '';

    if (!siteGameId) {
      return Response.json({ error: 'siteGameId is required' }, { status: 400 });
    }

    const site = await getCurrentSiteContext();
    const viewCount = await incrementView({
      siteId: site.id,
      siteGameId,
    });

    if (viewCount === undefined) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    return Response.json({ viewCount });
  } catch {
    return Response.json({ error: 'Failed to record view' }, { status: 500 });
  }
}

export const Route = createFileRoute('/api/game-view')({
  server: {
    handlers: { POST },
  },
});
