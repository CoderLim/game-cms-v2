import { createFileRoute } from '@tanstack/react-router';
import homeLayout from '@/data/poki-home.json';

import { getLocale, localizeUrl } from '@/paraglide/runtime.js';
import { PokiHome } from '@/components/poki/poki-home';

import { loadHomePage } from './-load-home';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

export const Route = createFileRoute('/')({
  loader: () => loadHomePage({ data: { locale: getLocale() } }),
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
