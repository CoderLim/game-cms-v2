import { createFileRoute } from '@tanstack/react-router';
import pageLayout from '@/data/poki-pool-club.json';

import { getLocale, localizeUrl } from '@/paraglide/runtime.js';
import { PokiGamePage } from '@/components/poki/poki-game';
import { StructuredData } from '@/components/seo/structured-data';

import { loadGamePage } from './-load-page';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

const detailLayout = {
  background: pageLayout.background,
  stageWidth: pageLayout.stageWidth,
  stageHeight: pageLayout.stageHeight,
  player: {
    x: pageLayout.player.x,
    y: pageLayout.player.y,
    w: pageLayout.player.w,
    h: pageLayout.player.h,
    barH: pageLayout.player.barH,
  },
  ad: {
    x: pageLayout.ad.x,
    y: pageLayout.ad.y,
    w: pageLayout.ad.w,
    h: pageLayout.ad.h,
  },
  ...(pageLayout.bannerAd
    ? {
        bannerAd: {
          x: pageLayout.bannerAd.x,
          y: pageLayout.bannerAd.y,
          w: pageLayout.bannerAd.w,
          h: pageLayout.bannerAd.h,
        },
      }
    : {}),
};

export const Route = createFileRoute('/game/$slug')({
  loader: ({ params }) =>
    loadGamePage({ data: { slug: params.slug, locale: getLocale() } }),
  head: ({ loaderData }) => {
    if (!loaderData) return {};

    const { site, locale, game, canonical, description, availableLocales } =
      loaderData;
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
    stageHeight,
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
        layout={{ ...detailLayout, stageHeight }}
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
