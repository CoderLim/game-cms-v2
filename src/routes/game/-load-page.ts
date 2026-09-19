import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import pageLayout from '@/data/poki-pool-club.json';

import { categoryImage } from '@/lib/poki-category-image';
import { localizeUrl } from '@/paraglide/runtime.js';
import type { DetailTile } from '@/components/poki/poki-game';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

type GameCardData = {
  siteGameId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  hot?: boolean;
  featured?: boolean;
};

type LayoutSlot = {
  x: number;
  y: number;
  w: number;
  h: number;
  href?: string;
};

const gameSlots = (pageLayout.tiles as LayoutSlot[]).filter((tile) =>
  (tile.href || '').includes('/g/')
);
const categorySlots = (pageLayout.tiles as LayoutSlot[]).filter(
  (tile) => !(tile.href || '').includes('/g/')
);

function uniqueGames(
  primary: GameCardData[],
  ...rest: GameCardData[][]
): GameCardData[] {
  const seen = new Set<string>();
  const result: GameCardData[] = [];

  for (const game of [...primary, ...rest.flat()]) {
    if (seen.has(game.siteGameId)) continue;
    seen.add(game.siteGameId);
    result.push(game);
  }

  return result;
}

function mapRecommendationTiles(games: GameCardData[]): {
  tiles: DetailTile[];
  packedBottom: number;
} {
  if (games.length === 0) {
    return { tiles: [], packedBottom: 0 };
  }

  // Same packing idea as the homepage: take the first N layout slots in
  // reading order, then prefer larger tiles for earlier games so the mosaic
  // stays dense instead of leaving holes from unused deeper slots.
  const regionSlots = [...gameSlots]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, games.length);

  const assignmentOrder = regionSlots
    .map((slot, index) => ({ slot, index }))
    .sort(
      (a, b) => b.slot.w * b.slot.h - a.slot.w * a.slot.h || a.index - b.index
    );

  const tiles = assignmentOrder.map((entry, gameIndex) => ({
    siteGameId: games[gameIndex].siteGameId,
    title: games[gameIndex].title,
    image: games[gameIndex].imageUrl,
    href: `/game/${games[gameIndex].slug}`,
    x: entry.slot.x,
    y: entry.slot.y,
    w: entry.slot.w,
    h: entry.slot.h,
  }));

  return {
    tiles,
    packedBottom: Math.max(...regionSlots.map((slot) => slot.y + slot.h)),
  };
}

function mapCategoryBanners(
  categories: Array<{
    siteCategoryId: string;
    categoryKey: string;
    slug: string;
    title: string;
    imageUrl?: string | null;
  }>,
  packedBottom: number
): DetailTile[] {
  const slots = [...categorySlots]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, categories.length);

  if (slots.length === 0) return [];

  const originY = slots[0].y;
  // Pull category banners up when the packed game mosaic ends early,
  // so we don't leave a turquoise gap above the category row.
  const offsetY = packedBottom + 16 - originY;

  return slots.map((slot, index) => {
    const category = categories[index];
    return {
      siteGameId: category.siteCategoryId,
      title: category.title,
      image: category.imageUrl || categoryImage(category.categoryKey),
      href: `/category/${category.slug}`,
      x: slot.x,
      y: slot.y + offsetY,
      w: slot.w,
      h: slot.h,
    };
  });
}

function computeStageHeight(
  packedBottom: number,
  categoryBanners: DetailTile[]
) {
  const playerBottom =
    pageLayout.player.y + pageLayout.player.h + pageLayout.player.barH;
  const adBottom = pageLayout.ad.y + pageLayout.ad.h;
  const bannerBottom = pageLayout.bannerAd
    ? pageLayout.bannerAd.y + pageLayout.bannerAd.h
    : 0;
  const categoryBottom = categoryBanners.length
    ? Math.max(...categoryBanners.map((tile) => tile.y + tile.h))
    : 0;

  return Math.max(
    playerBottom,
    adBottom,
    bannerBottom,
    packedBottom,
    categoryBottom,
    534
  );
}

export const loadGamePage = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string; locale: string }) => data)
  .handler(async ({ data }) => {
    const { getCurrentSiteContext } = await import('@/modules/sites/service');
    const { getPublishedBySlug, listPublished: listGames } =
      await import('@/modules/site-games/service');
    const { listPublishedLocales } =
      await import('@/modules/site-games/locales');
    const { listSimilar, listHot } =
      await import('@/modules/site-games/public');
    const { listForGame: listGameCategories, listPublished: listCategories } =
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

    const slotCount = gameSlots.length;

    const [
      categories,
      availableLocales,
      similarGames,
      hotGames,
      publishedGames,
      allCategories,
      publicConfig,
    ] = await Promise.all([
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
        limit: slotCount,
      }),
      listHot({ siteId: site.id, locale, limit: slotCount }),
      listGames({ siteId: site.id, locale, limit: slotCount }),
      listCategories({
        siteId: site.id,
        locale,
        limit: categorySlots.length,
      }),
      getPublicSiteConfig(site.id),
    ]);

    const moreGames = uniqueGames(
      similarGames,
      hotGames.filter(
        (entry: { siteGameId: string }) => entry.siteGameId !== game.siteGameId
      ),
      publishedGames.filter(
        (entry: { siteGameId: string }) => entry.siteGameId !== game.siteGameId
      )
    ).slice(0, slotCount);

    const { tiles: recommendationTiles, packedBottom } =
      mapRecommendationTiles(moreGames);

    const relatedCategories = allCategories.filter(
      (category: { siteCategoryId: string }) =>
        !categories.some(
          (entry: { siteCategoryId: string }) =>
            entry.siteCategoryId === category.siteCategoryId
        )
    );
    const categorySource =
      relatedCategories.length >= categorySlots.length
        ? relatedCategories
        : [...relatedCategories, ...categories];

    const categoryBanners = mapCategoryBanners(
      categorySource.slice(0, categorySlots.length),
      Math.max(
        packedBottom,
        pageLayout.player.y + pageLayout.player.h + pageLayout.player.barH
      )
    );

    const stageHeight = computeStageHeight(packedBottom, categoryBanners);

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
      recommendationTiles: [...recommendationTiles, ...categoryBanners],
      stageHeight,
      publicConfig,
    };
  });
