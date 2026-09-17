import { createFileRoute } from '@tanstack/react-router';

import { incrementRating } from '@/modules/site-games/mutations';
import { getCurrentSiteContext } from '@/modules/sites/service';

function cookieName(siteGameId: string) {
  return `gse_vote_${siteGameId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const siteGameId =
      typeof body?.siteGameId === 'string' ? body.siteGameId.trim() : '';
    const vote = body?.vote === 'like' || body?.vote === 'dislike' ? body.vote : '';

    if (!siteGameId || !vote) {
      return Response.json(
        { error: 'siteGameId and a valid vote are required' },
        { status: 400 }
      );
    }

    const name = cookieName(siteGameId);
    const cookies = request.headers.get('cookie') || '';
    const alreadyVoted = cookies
      .split(';')
      .map((item) => item.trim())
      .some((item) => item.startsWith(`${name}=`));

    if (alreadyVoted) {
      return Response.json({ error: 'Already voted' }, { status: 409 });
    }

    const site = await getCurrentSiteContext();
    const result = await incrementRating({
      siteId: site.id,
      siteGameId,
      vote,
    });

    if (!result) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    return Response.json(result, {
      headers: {
        'Set-Cookie': `${name}=${vote}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`,
      },
    });
  } catch {
    return Response.json({ error: 'Failed to record rating' }, { status: 500 });
  }
}

export const Route = createFileRoute('/api/game-rating')({
  server: {
    handlers: { POST },
  },
});
