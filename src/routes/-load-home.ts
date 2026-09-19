import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import homeLayout from '@/data/poki-home.json';

import type { HomeGrid, HomeSearchGame } from '@/components/poki/poki-home';

type GameCardData = {
  siteGameId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
};

const CELL = 94;

const CATEGORY_IMAGE_KEYS = new Set([
  '3d',
  'action',
  'adventure',
  'animals',
  'arcade',
  'boy',
  'brain',
  'car',
  'categories',
  'clicker',
  'cooking',
  'cozy',
  'dinosaur',
  'drifting',
  'driving',
  'escape',
  'fighting',
  'flash',
  'girls',
  'gun',
  'idle',
  'mobile',
  'multiplayer',
  'obby',
  'platform',
  'popular',
  'puzzle',
  'running',
  'shooting',
  'simulation',
  'skill',
  'sniper',
  'stickman',
  'survival',
  'two-player',
  'tycoon',
  'typing',
  'war',
  'watermelon',
  'zombie',
]);

function uniqueGames(
  featured: GameCardData | undefined,
  hotGames: GameCardData[],
  games: GameCardData[]
) {
  const seen = new Set<string>();
  const result: GameCardData[] = [];

  for (const game of [...(featured ? [featured] : []), ...hotGames, ...games]) {
    if (seen.has(game.siteGameId)) continue;
    seen.add(game.siteGameId);
    result.push(game);
  }

  return result;
}

function mapGameGrid(games: GameCardData[]): HomeGrid {
  // Keep the original Poki staggered positions for the top N slots (y,x order),
  // then assign featured/hot to the larger tiles among those slots. That preserves
  // the irregular mosaic without leaving empty holes from unused deeper slots.
  const regionSlots = [...homeLayout.gameGrid.tiles]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, games.length);

  const assignmentOrder = regionSlots
    .map((slot, index) => ({ slot, index }))
    .sort(
      (a, b) => b.slot.w * b.slot.h - a.slot.w * a.slot.h || a.index - b.index
    );

  const tiles = assignmentOrder.map((entry, gameIndex) => ({
    title: games[gameIndex].title,
    image: games[gameIndex].imageUrl,
    href: `/game/${games[gameIndex].slug}`,
    x: entry.slot.x,
    y: entry.slot.y,
    w: entry.slot.w,
    h: entry.slot.h,
  }));

  return {
    width: homeLayout.gameGrid.width,
    height: Math.max(...regionSlots.map((slot) => slot.y + slot.h)),
    tiles,
  };
}

function mapCategoryGrid(
  categories: Array<{
    categoryKey: string;
    slug: string;
    title: string;
  }>
): HomeGrid {
  const regionSlots = [...homeLayout.categoryGrid.tiles]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, categories.length);

  return {
    width: homeLayout.categoryGrid.width,
    height: Math.max(...regionSlots.map((slot) => slot.y + slot.h), CELL),
    tiles: regionSlots.map((slot, index) => {
      const category = categories[index];
      return {
        title: category.title,
        href: `/category/${category.slug}`,
        image: CATEGORY_IMAGE_KEYS.has(category.categoryKey)
          ? `/poki/categories/${category.categoryKey}.png`
          : null,
        x: slot.x,
        y: slot.y,
        w: slot.w,
        h: slot.h,
      };
    }),
  };
}

export const loadHomePage = createServerFn({ method: 'GET' })
  .inputValidator((data: { locale: string }) => data)
  .handler(async ({ data }) => {
    const { getCurrentSiteContext } = await import('@/modules/sites/service');
    const {
      getPublished: getSiteContent,
      listPublishedLocales: listPublishedSiteLocales,
    } = await import('@/modules/sites/content');
    const { listPublished: listCategories } =
      await import('@/modules/categories/service');
    const { getFeatured, listHot } =
      await import('@/modules/site-games/public');
    const { listPublished: listGames } =
      await import('@/modules/site-games/service');
    const { getPublicSiteConfig } =
      await import('@/modules/site-settings/service');

    const site = await getCurrentSiteContext();
    const locale = data.locale;

    if (!site.enabledLocales.includes(locale)) throw notFound();

    const [
      siteContent,
      publishedSiteLocales,
      categories,
      featured,
      hotGames,
      games,
      publicConfig,
    ] = await Promise.all([
      getSiteContent({ siteId: site.id, locale }),
      listPublishedSiteLocales(site.id),
      listCategories({
        siteId: site.id,
        locale,
        limit: homeLayout.categoryGrid.tiles.length,
      }),
      getFeatured({ siteId: site.id, locale }),
      listHot({ siteId: site.id, locale, limit: 50 }),
      listGames({ siteId: site.id, locale, limit: 100 }),
      getPublicSiteConfig(site.id),
    ]);

    if (locale !== site.defaultLocale && !siteContent) throw notFound();

    const availableHomepageLocales = [
      site.defaultLocale,
      ...publishedSiteLocales.map((entry) => entry.locale),
    ].filter((value, index, array) => array.indexOf(value) === index);

    const orderedGames = uniqueGames(featured, hotGames, games);
    const gameGrid = mapGameGrid(orderedGames);
    const categoryGrid = mapCategoryGrid(categories);
    const searchGames: HomeSearchGame[] = orderedGames.map((game) => ({
      siteGameId: game.siteGameId,
      title: game.title,
      image: game.imageUrl,
      href: `/game/${game.slug}`,
    }));

    return {
      site,
      siteContent,
      locale,
      availableHomepageLocales,
      publicConfig,
      gameGrid,
      categoryGrid,
      searchGames,
    };
  });
