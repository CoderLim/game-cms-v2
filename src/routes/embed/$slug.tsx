import { createFileRoute, notFound } from '@tanstack/react-router';

import {
  GamePlayer,
  type GamePlayerSettings,
} from '@/components/game-site/game-player';
import { GameViewTracker } from '@/components/game-site/game-view-tracker';
import { getPublishedBySlug } from '@/modules/site-games/service';
import { getPublicSiteConfig } from '@/modules/site-settings/service';
import { getCurrentSiteContext } from '@/modules/sites/service';
import { getLocale } from '@/paraglide/runtime.js';

export const Route = createFileRoute('/embed/$slug')({
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

    const publicConfig = await getPublicSiteConfig(site.id);
    return { game, publicConfig };
  },
  head: () => ({
    meta: [
      { name: 'robots', content: 'noindex,nofollow' },
      { name: 'googlebot', content: 'noindex,nofollow' },
    ],
  }),
  component: EmbedPage,
});

function EmbedPage() {
  const { game, publicConfig } = Route.useLoaderData();

  return (
    <main className="min-h-screen bg-black p-0">
      <GameViewTracker siteGameId={game.siteGameId} />
      <div className="min-h-screen w-full">
        <GamePlayer
          game={{
            title: game.title,
            embedUrl: game.embedUrl,
            embedType: game.embedType,
            aspectRatio: game.aspectRatio,
          }}
          settings={publicConfig.gamePlayer as GamePlayerSettings}
        />
      </div>
    </main>
  );
}
