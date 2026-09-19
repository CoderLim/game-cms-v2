import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import pageLayout from '@/data/poki-pool-club.json';

import { localizeUrl } from '@/paraglide/runtime.js';
import type { DetailTile } from '@/components/poki/poki-game';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

function mapRecommendationTiles(
  games: Array<{
    siteGameId: string;
    slug: string;
    title: string;
    imageUrl: string | null;
  }>
): DetailTile[] {
  return pageLayout.tiles.slice(0, games.length).map((slot, index) => ({
    siteGameId: games[index].siteGameId,
    title: games[index].title,
    image: games[index].imageUrl,
    href: `/game/${games[index].slug}`,
    x: slot.x,
    y: slot.y,
    w: slot.w,
    h: slot.h,
  }));
}

export const loadGamePage = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string; locale: string }) => data)
  .handler(async ({ data }) => {
    const { getCurrentSiteContext } = await import('@/modules/sites/service');
    const { getPublishedBySlug } = await import('@/modules/site-games/service');
    const { listPublishedLocales } =
      await import('@/modules/site-games/locales');
    const { listSimilar } = await import('@/modules/site-games/public');
    const { listForGame: listGameCategories } =
      await import('@/modules/categories/service');
    const { getPublicSiteConfig } =
      await import('@/modules/site-settings/service');

    const site = await getCurrentSiteContext();
    const locale = data.locale;

    if (!site.enabledLocales.includes(locale)) throw notFound();

    const game = await getPublishedBySlug({
      siteId: site.id,
      locale,
      slug: data.slug,
    });
    if (!game) throw notFound();

    const [categories, availableLocales, moreGames, publicConfig] =
      await Promise.all([
        listGameCategories({
          siteId: site.id,
          siteGameId: game.siteGameId,
          locale,
        }),
        listPublishedLocales({ siteId: site.id, siteGameId: game.siteGameId }),
        listSimilar({
          siteId: site.id,
          siteGameId: game.siteGameId,
          locale,
          limit: 20,
        }),
        getPublicSiteConfig(site.id),
      ]);

    const origin = siteOrigin(site.domain);
    const canonical = localizeUrl(`${origin}/game/${game.slug}`, {
      locale: locale as any,
    }).href;
    const description =
      game.metaDescription ||
      game.intro ||
      game.description ||
      game.gameDescription ||
      `Play ${game.title} online.`;

    return {
      site,
      locale,
      game,
      canonical,
      description,
      categories,
      availableLocales,
      recommendationTiles: mapRecommendationTiles(moreGames),
      publicConfig,
    };
  });
