import { createFileRoute } from '@tanstack/react-router';

import { getLocale, localizeUrl } from '@/paraglide/runtime.js';
import { PokiCategory } from '@/components/poki/poki-category';

import { loadCategoryPage } from './-load-page';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

export const Route = createFileRoute('/category/$slug')({
  loader: ({ params }) =>
    loadCategoryPage({ data: { slug: params.slug, locale: getLocale() } }),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { site, locale, category, availableLocales } = loaderData;
    const origin = siteOrigin(site.domain);
    const canonical = localizeUrl(`${origin}/category/${category.slug}`, {
      locale: locale as any,
    }).href;
    const defaultEntry =
      availableLocales.find((entry) => entry.locale === site.defaultLocale) ||
      availableLocales[0];
    const title = category.metaTitle || `${category.title} | ${site.name}`;
    const description =
      category.metaDescription ||
      category.description ||
      `Play ${category.title} online.`;

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonical },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [
        { rel: 'canonical', href: canonical },
        ...availableLocales.map((entry) => ({
          rel: 'alternate',
          hrefLang: entry.locale,
          href: localizeUrl(`${origin}/category/${entry.slug}`, {
            locale: entry.locale as any,
          }).href,
        })),
        ...(defaultEntry
          ? [
              {
                rel: 'alternate',
                hrefLang: 'x-default',
                href: localizeUrl(`${origin}/category/${defaultEntry.slug}`, {
                  locale: defaultEntry.locale as any,
                }).href,
              },
            ]
          : []),
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const {
    site,
    category,
    publicConfig,
    gameTiles,
    relatedBanners,
    searchGames,
    titleBanner,
    stageHeight,
    background,
  } = Route.useLoaderData();

  return (
    <PokiCategory
      background={background}
      stageHeight={stageHeight}
      titleBanner={titleBanner}
      gameTiles={gameTiles}
      relatedBanners={relatedBanners}
      searchGames={searchGames}
      siteName={site.name}
      categoryTitle={category.title}
      categoryDescription={category.description}
      categoryContent={category.content}
      navigation={publicConfig.navigation}
      footerDescription={publicConfig.footer.description}
      socialLinks={publicConfig.socialLinks}
      analytics={publicConfig.analytics}
      ads={publicConfig.ads}
    />
  );
}
