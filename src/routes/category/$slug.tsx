import { createFileRoute, notFound } from '@tanstack/react-router';

import { GameCard } from '@/components/game-site/game-card';
import { SiteFooter } from '@/components/game-site/site-footer';
import { SiteHeader } from '@/components/game-site/site-header';
import { MarkdownContent } from '@/components/markdown-content';
import { listPublishedLocales } from '@/modules/categories/locales';
import {
  getPublishedBySlug,
  listGames,
  listPublished,
} from '@/modules/categories/service';
import { getPublicSiteConfig } from '@/modules/site-settings/service';
import { getCurrentSiteContext } from '@/modules/sites/service';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

export const Route = createFileRoute('/category/$slug')({
  loader: async ({ params }) => {
    const site = await getCurrentSiteContext();
    const locale = getLocale();
    if (!site.enabledLocales.includes(locale)) throw notFound();

    const category = await getPublishedBySlug({
      siteId: site.id,
      locale,
      slug: params.slug,
    });
    if (!category) throw notFound();

    const [categories, availableLocales, games, publicConfig] =
      await Promise.all([
        listPublished({ siteId: site.id, locale, limit: 8 }),
        listPublishedLocales({
          siteId: site.id,
          siteCategoryId: category.siteCategoryId,
        }),
        listGames({
          siteId: site.id,
          siteCategoryId: category.siteCategoryId,
          locale,
          limit: 48,
        }),
        getPublicSiteConfig(site.id),
      ]);

    return {
      site,
      locale,
      category,
      categories,
      availableLocales,
      games,
      publicConfig,
    };
  },
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

    return {
      meta: [
        {
          title: category.metaTitle || `${category.title} | ${site.name}`,
        },
        {
          name: 'description',
          content:
            category.metaDescription ||
            category.description ||
            `Play ${category.title} online.`,
        },
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
  const { site, category, categories, games, publicConfig } =
    Route.useLoaderData();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader siteName={site.name} categories={categories} />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">{category.title}</h1>
          {category.description ? (
            <div className="text-muted-foreground mt-3 leading-7">
              <MarkdownContent content={category.description} />
            </div>
          ) : null}
        </header>

        {games.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {games.map((game) => (
              <GameCard key={game.siteGameId} game={game} />
            ))}
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground rounded-2xl px-6 py-16 text-center">
            No published games in this category yet.
          </div>
        )}

        {category.content ? (
          <article className="mx-auto mt-12 max-w-4xl">
            <MarkdownContent content={category.content} />
          </article>
        ) : null}
      </main>
      <SiteFooter
        siteName={site.name}
        socialLinks={publicConfig.socialLinks}
        analytics={publicConfig.analytics}
        ads={publicConfig.ads}
      />
    </div>
  );
}
