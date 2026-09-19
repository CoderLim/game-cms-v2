import { createFileRoute, notFound } from '@tanstack/react-router';

import {
  PokiGamePage,
  type DetailTile,
} from '@/components/poki/poki-game';
import { StructuredData } from '@/components/seo/structured-data';
import pageLayout from '@/data/poki-pool-club.json';
import { listForGame as listGameCategories } from '@/modules/categories/service';
import { listPublishedLocales } from '@/modules/site-games/locales';
import { listSimilar } from '@/modules/site-games/public';
import { getPublishedBySlug } from '@/modules/site-games/service';
import { getPublicSiteConfig } from '@/modules/site-settings/service';
import { getCurrentSiteContext } from '@/modules/sites/service';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';

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

export const Route = createFileRoute('/game/$slug')({
  loader: async ({ params }) => {
    const site = await getCurrentSiteContext();
    const locale = getLocale();

    if (!site.enabledLocales.includes(locale)) throw notFound();

    const game = await getPublishedBySlug({
      siteId: site.id,
      locale,
      slug: params.slug,
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
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};

    const {
      site,
      locale,
      game,
      canonical,
      description,
      availableLocales,
    } = loaderData;
    const origin = siteOrigin(site.domain);
    const title = game.metaTitle || `${game.title} | ${site.name}`;
    const defaultEntry =
      availableLocales.find((entry) => entry.locale === site.defaultLocale) ||
      availableLocales[0];

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonical },
        ...(game.imageUrl
          ? [{ property: 'og:image', content: game.imageUrl }]
          : []),
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        ...(game.imageUrl
          ? [{ name: 'twitter:image', content: game.imageUrl }]
          : []),
      ],
      links: [
        { rel: 'canonical', href: canonical },
        ...availableLocales.map((entry) => ({
          rel: 'alternate',
          hrefLang: entry.locale,
          href: localizeUrl(`${origin}/game/${entry.slug}`, {
            locale: entry.locale as any,
          }).href,
        })),
        ...(defaultEntry
          ? [
              {
                rel: 'alternate',
                hrefLang: 'x-default',
                href: localizeUrl(`${origin}/game/${defaultEntry.slug}`, {
                  locale: defaultEntry.locale as any,
                }).href,
              },
            ]
          : []),
      ],
    };
  },
  component: GamePage,
});

function GamePage() {
  const {
    site,
    game,
    canonical,
    description,
    categories,
    recommendationTiles,
    publicConfig,
  } = Route.useLoaderData();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    url: canonical,
    description,
    gamePlatform: 'Web Browser',
    ...(game.imageUrl ? { image: game.imageUrl } : {}),
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: siteOrigin(site.domain),
    },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <PokiGamePage
        layout={pageLayout}
        siteName={site.name}
        game={game}
        categories={categories}
        recommendationTiles={recommendationTiles}
        playerSettings={publicConfig.gamePlayer}
        navigation={publicConfig.navigation}
        footerDescription={publicConfig.footer.description}
        socialLinks={publicConfig.socialLinks}
        analytics={publicConfig.analytics}
        ads={publicConfig.ads}
      />
    </>
  );
}
