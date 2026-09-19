import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import categoryLayout from '@/data/poki-category.json';

import type {
  CategoryBanner,
  CategorySearchGame,
  CategoryTile,
} from '@/components/poki/poki-category';

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
  'monster-truck',
  'multiplayer',
  'obby',
  'parking',
  'platform',
  'popular',
  'puzzle',
  'racing',
  'running',
  'shooting',
  'simulation',
  'skill',
  'sniper',
  'stickman',
  'survival',
  'truck',
  'two-player',
  'tycoon',
  'typing',
  'war',
  'watermelon',
  'zombie',
]);

type GameCardData = {
  siteGameId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  featured?: boolean;
  hot?: boolean;
};

type CategoryCardData = {
  siteCategoryId: string;
  categoryKey: string;
  slug: string;
  title: string;
};

const CATEGORY_IMAGE_ALIASES: Record<string, string> = {
  'boys-games': 'boy',
  'car-games': 'car',
  'girls-games': 'girls',
  'io-games': 'multiplayer',
  'kids-games': 'cozy',
  'monster-truck-games': 'monster-truck',
  'two-player-games': 'two-player',
  'racing-games': 'racing',
  'action-games': 'action',
  'arcade-games': 'arcade',
  'puzzle-games': 'puzzle',
  '3d-games': '3d',
  'clicker-games': 'clicker',
  'adventure-games': 'adventure',
  'multiplayer-games': 'multiplayer',
  'stickman-games': 'stickman',
};

function resolveCategoryImageKey(categoryKey: string) {
  if (CATEGORY_IMAGE_KEYS.has(categoryKey)) return categoryKey;
  const alias = CATEGORY_IMAGE_ALIASES[categoryKey];
  if (alias && CATEGORY_IMAGE_KEYS.has(alias)) return alias;
  const stripped = categoryKey.replace(/-games$/, '');
  if (CATEGORY_IMAGE_KEYS.has(stripped)) return stripped;
  return null;
}

function categoryImage(categoryKey: string) {
  const key = resolveCategoryImageKey(categoryKey);
  return key ? `/poki/categories/${key}.png` : null;
}

function mapGameTiles(games: GameCardData[]): CategoryTile[] {
  const slots = [...categoryLayout.gameGrid.tiles].sort(
    (a, b) => b.w * b.h - a.w * a.h || a.y - b.y || a.x - b.x
  );

  const ordered = [...games].sort((a, b) => {
    const score = (g: GameCardData) => (g.featured ? 2 : 0) + (g.hot ? 1 : 0);
    return score(b) - score(a);
  });

  const count = Math.min(slots.length, ordered.length);
  return slots.slice(0, count).map((slot, index) => ({
    title: ordered[index].title,
    href: `/game/${ordered[index].slug}`,
    image: ordered[index].imageUrl,
    x: slot.x,
    y: slot.y,
    w: slot.w,
    h: slot.h,
  }));
}

function findCategoryForSlot(
  slotKey: string,
  categories: CategoryCardData[],
  used: Set<string>,
  currentSiteCategoryId: string
) {
  const candidates = [
    slotKey,
    `${slotKey}-games`,
    slotKey.replace(/-games$/, ''),
  ];
  for (const key of candidates) {
    const match = categories.find(
      (category) =>
        category.categoryKey === key &&
        category.siteCategoryId !== currentSiteCategoryId &&
        !used.has(category.siteCategoryId)
    );
    if (match) return match;
  }
  return undefined;
}

function mapRelatedBanners(
  categories: CategoryCardData[],
  currentSiteCategoryId: string
): CategoryBanner[] {
  const used = new Set<string>();
  const fallback = categories.filter(
    (category) => category.siteCategoryId !== currentSiteCategoryId
  );
  let fallbackIndex = 0;

  return categoryLayout.relatedCategories.tiles.map((slot) => {
    let match = findCategoryForSlot(
      slot.categoryKey,
      categories,
      used,
      currentSiteCategoryId
    );

    if (!match) {
      while (
        fallbackIndex < fallback.length &&
        used.has(fallback[fallbackIndex].siteCategoryId)
      ) {
        fallbackIndex += 1;
      }
      match = fallback[fallbackIndex++];
    }

    if (match) used.add(match.siteCategoryId);

    const title = match?.title || slot.title;
    const key = match?.categoryKey || slot.categoryKey;
    const slug = match?.slug;

    return {
      title,
      href: slug ? `/category/${slug}` : '/',
      image: categoryImage(key) || categoryImage(slot.categoryKey),
      x: slot.x,
      y: slot.y,
      w: slot.w,
      h: slot.h,
    };
  });
}

export const loadCategoryPage = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string; locale: string }) => data)
  .handler(async ({ data }) => {
    const { getCurrentSiteContext } = await import('@/modules/sites/service');
    const { getPublishedBySlug, listGames, listPublished } =
      await import('@/modules/categories/service');
    const { listPublishedLocales } =
      await import('@/modules/categories/locales');
    const { getPublicSiteConfig } =
      await import('@/modules/site-settings/service');

    const site = await getCurrentSiteContext();
    const locale = data.locale;

    if (!site.enabledLocales.includes(locale)) throw notFound();

    const category = await getPublishedBySlug({
      siteId: site.id,
      locale,
      slug: data.slug,
    });
    if (!category) throw notFound();

    const [categories, availableLocales, games, publicConfig] =
      await Promise.all([
        listPublished({
          siteId: site.id,
          locale,
          limit: 40,
        }),
        listPublishedLocales({
          siteId: site.id,
          siteCategoryId: category.siteCategoryId,
        }),
        listGames({
          siteId: site.id,
          siteCategoryId: category.siteCategoryId,
          locale,
          limit: categoryLayout.gameGrid.tiles.length,
        }),
        getPublicSiteConfig(site.id),
      ]);

    const gameTiles = mapGameTiles(games);
    const relatedBanners = mapRelatedBanners(
      categories,
      category.siteCategoryId
    );
    const searchGames: CategorySearchGame[] = games.map(
      (game: {
        siteGameId: string;
        slug: string;
        title: string;
        imageUrl: string | null;
      }) => ({
        siteGameId: game.siteGameId,
        title: game.title,
        image: game.imageUrl,
        href: `/game/${game.slug}`,
      })
    );

    return {
      site,
      locale,
      category,
      availableLocales,
      publicConfig,
      gameTiles,
      relatedBanners,
      searchGames,
      titleBanner: categoryLayout.titleBanner,
      stageHeight: categoryLayout.stageHeight,
      background: categoryLayout.background,
    };
  });
