import { createFileRoute, notFound } from '@tanstack/react-router';

import { GameCard } from '@/components/game-site/game-card';
import { GamePlayer } from '@/components/game-site/game-player';
import { GameRating } from '@/components/game-site/game-rating';
import { GameViewTracker } from '@/components/game-site/game-view-tracker';
import { SiteHeader } from '@/components/game-site/site-header';
import { MarkdownContent } from '@/components/markdown-content';
import { StructuredData } from '@/components/seo/structured-data';
import { listPublished as listCategories } from '@/modules/categories/service';
import { listPublishedLocales } from '@/modules/site-games/locales';
import { listSimilar } from '@/modules/site-games/public';
import { getPublishedBySlug } from '@/modules/site-games/service';
import { getCurrentSiteContext } from '@/modules/sites/service';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
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

    const [categories, availableLocales, moreGames] = await Promise.all([
      listCategories({ siteId: site.id, locale, limit: 8 }),
      listPublishedLocales({ siteId: site.id, siteGameId: game.siteGameId }),
      listSimilar({
        siteId: site.id,
        siteGameId: game.siteGameId,
        locale,
        limit: 12,
      }),
    ]);

    const origin = siteOrigin(site.domain);
    const canonical = localizeUrl(`${origin}/game/${game.slug}`, {
      locale: locale as any,
    }).href;
    const description =
      game.metaDescription ||
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
      moreGames,
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
  const { site, game, canonical, description, categories, moreGames } =
    Route.useLoaderData();

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
    <div className="bg-background text-foreground min-h-screen">
      <StructuredData data={structuredData} />
      <SiteHeader siteName={site.name} categories={categories} />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <GameViewTracker siteGameId={game.siteGameId} />

        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {game.title}
          </h1>
          {game.intro ? (
            <p className="text-muted-foreground mt-2 max-w-4xl leading-7">
              {game.intro}
            </p>
          ) : null}
        </div>

        <GamePlayer
          game={{
            title: game.title,
            embedUrl: game.embedUrl,
            embedType: game.embedType,
            aspectRatio: game.aspectRatio,
          }}
        />

        <div className="mx-auto max-w-4xl">
          <GameRating
            siteGameId={game.siteGameId}
            initialLikes={game.likeCount}
            initialDislikes={game.dislikeCount}
          />
        </div>

        <article className="mx-auto mt-10 max-w-4xl space-y-9">
          {game.description ? (
            <section>
              <MarkdownContent content={game.description} />
            </section>
          ) : null}

          {game.howToPlay ? (
            <section>
              <h2 className="mb-3 text-2xl font-semibold">How to Play</h2>
              <MarkdownContent content={game.howToPlay} />
            </section>
          ) : null}

          {game.controls ? (
            <section>
              <h2 className="mb-3 text-2xl font-semibold">Controls</h2>
              <MarkdownContent content={game.controls} />
            </section>
          ) : null}

          {game.features ? (
            <section>
              <h2 className="mb-3 text-2xl font-semibold">Features</h2>
              <MarkdownContent content={game.features} />
            </section>
          ) : null}

          {game.faq ? (
            <section>
              <h2 className="mb-3 text-2xl font-semibold">FAQ</h2>
              <MarkdownContent content={game.faq} />
            </section>
          ) : null}

          {game.content ? (
            <section>
              <MarkdownContent content={game.content} />
            </section>
          ) : null}
        </article>

        {moreGames.length > 0 ? (
          <section className="mt-14">
            <h2 className="mb-5 text-xl font-semibold">More Games</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {moreGames.map((item) => (
                <GameCard key={item.siteGameId} game={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
