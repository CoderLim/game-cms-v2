import { createFileRoute, notFound } from '@tanstack/react-router';

import { GameCard } from '@/components/game-site/game-card';
import { SiteFooter } from '@/components/game-site/site-footer';
import { SiteHeader } from '@/components/game-site/site-header';
import { MarkdownContent } from '@/components/markdown-content';
import { Link } from '@/core/i18n/navigation';
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

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
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
      listCategories({ siteId: site.id, locale, limit: 8 }),
      getFeatured({ siteId: site.id, locale }),
      listHot({ siteId: site.id, locale, limit: 12 }),
      listGames({ siteId: site.id, locale, limit: 36 }),
      getPublicSiteConfig(site.id),
    ]);

    if (locale !== site.defaultLocale && !siteContent) throw notFound();

    const availableHomepageLocales = [
      site.defaultLocale,
      ...publishedSiteLocales.map((entry) => entry.locale),
    ].filter((value, index, array) => array.indexOf(value) === index);

    return {
      site,
      siteContent,
      locale,
      availableHomepageLocales,
      categories,
      featured,
      hotGames,
      games,
      publicConfig,
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
    categories,
    featured,
    hotGames,
    games,
    publicConfig,
  } = Route.useLoaderData();
  const latestGames = games.filter(
    (item) => !hotGames.some((hot) => hot.siteGameId === item.siteGameId)
  );

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader siteName={site.name} categories={categories} />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {siteContent?.intro ? (
          <section className="mb-8 max-w-4xl">
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              {siteContent.title || site.name}
            </h1>
            <p className="text-muted-foreground mt-3 text-base leading-7 md:text-lg">
              {siteContent.intro}
            </p>
          </section>
        ) : null}

        {featured ? (
          <section className="mb-12">
            <div className="bg-muted/40 border-border grid items-center gap-6 rounded-3xl border p-5 md:grid-cols-[1.2fr_1fr] md:p-8">
              <div>
                <p className="text-primary mb-2 text-sm font-semibold uppercase tracking-wide">
                  Featured Game
                </p>
                {siteContent?.intro ? (
                  <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
                    {featured.title}
                  </h2>
                ) : (
                  <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                    {featured.title}
                  </h1>
                )}
                <p className="text-muted-foreground mt-3 max-w-xl leading-7">
                  Play {featured.title} instantly in your browser.
                </p>
                <Link
                  href={`/game/${featured.slug}`}
                  className="bg-primary text-primary-foreground mt-6 inline-flex rounded-xl px-5 py-2.5 font-semibold"
                >
                  Play Now
                </Link>
              </div>
              {featured.imageUrl ? (
                <Link
                  href={`/game/${featured.slug}`}
                  className="bg-muted aspect-[4/3] overflow-hidden rounded-2xl"
                >
                  <img
                    src={featured.imageUrl}
                    alt={featured.title}
                    className="h-full w-full object-cover"
                  />
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        {hotGames.length > 0 ? (
          <section className="mb-12">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Popular Games</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Popular games on {site.name}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {hotGames.map((game) => (
                <GameCard key={game.siteGameId} game={game} />
              ))}
            </div>
          </section>
        ) : null}

        {latestGames.length > 0 ? (
          <section>
            <h2 className="mb-5 text-2xl font-semibold">All Games</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {latestGames.map((game) => (
                <GameCard key={game.siteGameId} game={game} />
              ))}
            </div>
          </section>
        ) : hotGames.length === 0 ? (
          <div className="bg-muted text-muted-foreground rounded-2xl px-6 py-20 text-center">
            This site is ready. Publish games from the Game CMS to populate it.
          </div>
        ) : null}

        {siteContent?.content ? (
          <section className="mx-auto mt-14 max-w-4xl border-t pt-10">
            <MarkdownContent content={siteContent.content} />
          </section>
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
