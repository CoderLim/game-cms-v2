import { createFileRoute, notFound } from '@tanstack/react-router';

import { GameCard } from '@/components/game-site/game-card';
import { SiteHeader } from '@/components/game-site/site-header';
import { listPublished as listCategories } from '@/modules/categories/service';
import { getFeatured, listHot } from '@/modules/site-games/public';
import { listPublished as listGames } from '@/modules/site-games/service';
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

    const [categories, featured, hotGames, games] = await Promise.all([
      listCategories({ siteId: site.id, locale, limit: 8 }),
      getFeatured({ siteId: site.id, locale }),
      listHot({ siteId: site.id, locale, limit: 12 }),
      listGames({ siteId: site.id, locale, limit: 36 }),
    ]);

    return { site, locale, categories, featured, hotGames, games };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { site, locale } = loaderData;
    const origin = siteOrigin(site.domain);
    const urlFor = (loc: string) =>
      localizeUrl(`${origin}/`, { locale: loc as any }).href;

    return {
      meta: [
        { title: site.name },
        {
          name: 'description',
          content: `Play games on ${site.name}. Browse featured, popular, and category-based games.`,
        },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale) },
        ...site.enabledLocales.map((loc) => ({
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
  const { site, categories, featured, hotGames, games } = Route.useLoaderData();
  const latestGames = games.filter(
    (item) => !hotGames.some((hot) => hot.siteGameId === item.siteGameId)
  );

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader siteName={site.name} categories={categories} />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {featured ? (
          <section className="mb-12">
            <div className="bg-muted/40 border-border grid items-center gap-6 rounded-3xl border p-5 md:grid-cols-[1.2fr_1fr] md:p-8">
              <div>
                <p className="text-primary mb-2 text-sm font-semibold uppercase tracking-wide">
                  Featured Game
                </p>
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  {featured.title}
                </h1>
                <p className="text-muted-foreground mt-3 max-w-xl leading-7">
                  Play {featured.title} instantly in your browser.
                </p>
                <a
                  href={`/game/${featured.slug}`}
                  className="bg-primary text-primary-foreground mt-6 inline-flex rounded-xl px-5 py-2.5 font-semibold"
                >
                  Play Now
                </a>
              </div>
              {featured.imageUrl ? (
                <a
                  href={`/game/${featured.slug}`}
                  className="bg-muted aspect-[4/3] overflow-hidden rounded-2xl"
                >
                  <img
                    src={featured.imageUrl}
                    alt={featured.title}
                    className="h-full w-full object-cover"
                  />
                </a>
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
      </main>
    </div>
  );
}
