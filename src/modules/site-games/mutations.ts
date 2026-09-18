import { and, eq, sql } from 'drizzle-orm';

import { siteGame } from '@/config/db/game-schema';
import { db } from '@/core/db';

export async function incrementView(input: {
  siteId: string;
  siteGameId: string;
}) {
  const [row] = await db()
    .update(siteGame)
    .set({ viewCount: sql`${siteGame.viewCount} + 1` })
    .where(
      and(
        eq(siteGame.id, input.siteGameId),
        eq(siteGame.siteId, input.siteId)
      )
    )
    .returning({ viewCount: siteGame.viewCount });

  return row?.viewCount;
}

export async function incrementRating(input: {
  siteId: string;
  siteGameId: string;
  vote: 'like' | 'dislike';
}) {
  const update =
    input.vote === 'like'
      ? { likeCount: sql`${siteGame.likeCount} + 1` }
      : { dislikeCount: sql`${siteGame.dislikeCount} + 1` };

  const [row] = await db()
    .update(siteGame)
    .set(update)
    .where(
      and(
        eq(siteGame.id, input.siteGameId),
        eq(siteGame.siteId, input.siteId)
      )
    )
    .returning({
      likeCount: siteGame.likeCount,
      dislikeCount: siteGame.dislikeCount,
    });

  return row;
}
