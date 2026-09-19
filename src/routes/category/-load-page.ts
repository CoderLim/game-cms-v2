import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import categoryLayout from '@/data/poki-category.json';

import { categoryImage } from '@/lib/poki-category-image';
import type {
  CategoryBanner,
  CategorySearchGame,
  CategoryTile,
} from '@/components/poki/poki-category';

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
