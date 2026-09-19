import { createFileRoute, notFound } from '@tanstack/react-router';

import {
  PokiHome,
  type HomeGrid,
  type HomeSearchGame,
} from '@/components/poki/poki-home';
import homeLayout from '@/data/poki-home.json';
import { listPublished as listCategories } from '@/modules/categories/service';
import { getFeatured, listHot } from '@/modules/site-games/public';
import { listPublished as listGames } from '@/modules/site-games/service';
import { getPublicSiteConfig } from '@/modules/site-settings/service';
import {
  getPublished as getSiteContent,
  listPublishedLocales as listPublishedSiteLocales,
} from '@/modules/sites/content';
import { getCurrentSiteContext } from '@/modules/sites/service';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';

type GameCardData = {
  siteGameId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
};

type LayoutTile = {
  x: number;
  y: number;
  w: number;
  h: number;
};

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

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

function uniqueGames(
  featured: GameCardData | undefined,
  hotGames: GameCardData[],
  games: GameCardData[]
) {
  const seen = new Set<string>();
  const result: GameCardData[] = [];

  for (const game of [
    ...(featured ? [featured] : []),
    ...hotGames,
    ...games,
  ]) {
    if (seen.has(game.siteGameId)) continue;
    seen.add(game.siteGameId);
    result.push(game);
  }

  return result;
}

function orderedGameSlots(tiles: LayoutTile[]) {
  return tiles
    .map((tile, index) => ({ ...tile, index }))
    .sort(
      (a, b) =>
        b.w * b.h - a.w * a.h ||
        a.index - b.index
    );
}

function mapGameGrid(games: GameCardData[]): HomeGrid {
  const slots = orderedGameSlots(homeLayout.gameGrid.tiles);

  return {
    width: homeLayout.gameGrid.width,
    height: homeLayout.gameGrid.height,
    tiles: slots.slice(0, games.length).map((slot, index) => ({
      title: games[index].title,
      image: games[index].imageUrl,
      href: `/game/${games[index].slug}`,
      x: slot.x,
      y: slot.y,
      w: slot.w,
      h: slot.h,
    })),
  };
}

function mapCategoryGrid(
  categories: Array<{
    categoryKey: string;
    slug: string;
    title: string;
  }>
): HomeGrid {
  return {
    width: homeLayout.categoryGrid.width,
    height: homeLayout.categoryGrid.height,
    tiles: homeLayout.categoryGrid.tiles
      .slice(0, categories.length)
      .map((slot, index) => {
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

export const Route = createFileRoute('/')({
  loader: async () => {
    const site = await getCurrentSiteContext();
    const locale = getLocale();

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
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};

    const { site, siteContent, locale, availableHomepageLocales } = loaderData;
    const origin = siteOrigin(site.domain);
    const urlFor = (loc: string) =>
      localizeUrl(`${origin}/`, { locale: loc as any }).href;
    const title = siteContent?.metaTitle || siteContent?.title || site.name;
    const description =
      siteContent?.metaDescription ||
      siteContent?.intro ||
      `Play games on ${site.name}. Browse featured, popular, and category-based games.`;

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: urlFor(locale) },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale) },
        ...availableHomepageLocales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        {
          rel: 'alternate',
          hrefLang: 'x-default',
          href: urlFor(site.defaultLocale),
        },
      ],
    };
  },
  component: HomePage,
});

function HomePage() {
  const {
    site,
    siteContent,
    publicConfig,
    gameGrid,
    categoryGrid,
    searchGames,
  } = Route.useLoaderData();

  return (
    <PokiHome
      background={homeLayout.background}
      gameGrid={gameGrid}
      categoryGrid={categoryGrid}
      searchGames={searchGames}
      siteName={site.name}
      siteContent={siteContent}
      navigation={publicConfig.navigation}
      footerDescription={publicConfig.footer.description}
      socialLinks={publicConfig.socialLinks}
      analytics={publicConfig.analytics}
      ads={publicConfig.ads}
    />
  );
}
