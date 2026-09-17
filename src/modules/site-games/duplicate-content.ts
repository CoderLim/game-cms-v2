import { and, eq, ne } from 'drizzle-orm';

import {
  site,
  siteGame,
  siteGameLocale,
} from '@/config/db/game-schema';
import { db } from '@/core/db';

function normalizeText(value: unknown) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_>#\[\]()!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function contentFingerprint(input: {
  description?: string | null;
  content?: string | null;
  howToPlay?: string | null;
  controls?: string | null;
  features?: string | null;
  faq?: string | null;
}) {
  return [
    input.description,
    input.content,
    input.howToPlay,
    input.controls,
    input.features,
    input.faq,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join('\n');
}

export type DuplicateGameContentMatch = {
  siteId: string;
  domain: string;
  siteGameId: string;
  locale: string;
  slug: string;
};

/**
 * Detect an exact normalized long-form duplicate for the same global game on
 * another site. Separate DB rows guarantee ownership but do not guarantee that
 * an editor/generator did not paste the same SEO body into multiple domains.
 *
 * We intentionally ignore short metadata-only matches. Titles, controls and
 * small boilerplate can legitimately overlap. The guard activates only when
 * the combined normalized page body is substantial enough to represent the
 * page's main SEO content.
 */
export async function findCrossSiteDuplicateGameContent(input: {
  siteId: string;
  siteGameId: string;
  locale: string;
  description?: string | null;
  content?: string | null;
  howToPlay?: string | null;
  controls?: string | null;
  features?: string | null;
  faq?: string | null;
  minNormalizedLength?: number;
}): Promise<DuplicateGameContentMatch | undefined> {
  const candidate = contentFingerprint(input);
  const minLength = input.minNormalizedLength ?? 500;
  if (candidate.length < minLength) return undefined;

  const [parent] = await db()
    .select({ gameId: siteGame.gameId })
    .from(siteGame)
    .where(
      and(
        eq(siteGame.id, input.siteGameId),
        eq(siteGame.siteId, input.siteId)
      )
    )
    .limit(1);

  if (!parent) {
    throw new Error('site_game does not belong to the supplied site');
  }

  const rows = await db()
    .select({
      siteId: siteGame.siteId,
      domain: site.domain,
      siteGameId: siteGame.id,
      locale: siteGameLocale.locale,
      slug: siteGameLocale.slug,
      description: siteGameLocale.description,
      content: siteGameLocale.content,
      howToPlay: siteGameLocale.howToPlay,
      controls: siteGameLocale.controls,
      features: siteGameLocale.features,
      faq: siteGameLocale.faq,
    })
    .from(siteGameLocale)
    .innerJoin(siteGame, eq(siteGame.id, siteGameLocale.siteGameId))
    .innerJoin(site, eq(site.id, siteGame.siteId))
    .where(
      and(
        eq(siteGame.gameId, parent.gameId),
        eq(siteGameLocale.locale, input.locale),
        ne(siteGame.siteId, input.siteId)
      )
    );

  for (const row of rows) {
    if (contentFingerprint(row) === candidate) {
      return {
        siteId: row.siteId,
        domain: row.domain,
        siteGameId: row.siteGameId,
        locale: row.locale,
        slug: row.slug,
      };
    }
  }

  return undefined;
}
