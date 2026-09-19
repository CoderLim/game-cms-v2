import { useEffect, useMemo, useRef, useState } from 'react';

import { Link } from '@/core/i18n/navigation';
import { AdSlot } from '@/components/game-site/ad-slot';
import { GamePlayer } from '@/components/game-site/game-player';
import { GameRating } from '@/components/game-site/game-rating';
import { GameViewTracker } from '@/components/game-site/game-view-tracker';
import { SiteRuntime } from '@/components/game-site/site-runtime';
import { MarkdownContent } from '@/components/markdown-content';
import { PokiFooter, PokiFrame } from '@/components/poki/poki-chrome';

import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/700.css';

export type DetailTile = {
  siteGameId: string;
  title: string;
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
  image: string | null;
};

export type GameDetailLayout = {
  background: string;
  stageWidth: number;
  stageHeight: number;
  player: {
    x: number;
    y: number;
    w: number;
    h: number;
    barH: number;
  };
  ad: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  bannerAd?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
};

type GameData = {
  siteGameId: string;
  title: string;
  imageUrl: string | null;
  embedUrl: string | null;
  embedType: string;
  aspectRatio: string | null;
  intro: string | null;
  description: string | null;
  howToPlay: string | null;
  controls: string | null;
  features: string | null;
  faq: string | null;
  content: string | null;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
};

type CategoryData = {
  siteCategoryId: string;
  slug: string;
  title: string;
};

type NavigationItem = {
  label: string;
  href: string;
};

type SocialLink = {
  name?: string;
  displayName?: string;
  url: string;
};

type PlayerSettings = {
  allowFullscreen?: boolean;
  autoplay?: boolean;
};

type AdsConfig = {
  enabled?: boolean;
  adsenseClient?: string;
  slots?: Record<string, string>;
};

type AnalyticsConfig = {
  gaId?: string;
  clarityId?: string;
};

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function useStageScale(stageWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => setScale(Math.min(1, node.clientWidth / stageWidth));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [stageWidth]);

  return { ref, scale };
}

function TileLink({ tile }: { tile: DetailTile }) {
  return (
    <Link
      href={tile.href}
      title={tile.title}
      className="absolute block overflow-hidden rounded-[16px] bg-white/40 transition duration-150 hover:z-10 hover:scale-[1.04]"
      style={{ left: tile.x, top: tile.y, width: tile.w, height: tile.h }}
    >
      {tile.image ? (
        <img
          src={tile.image}
          alt={tile.title}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex size-full items-end p-3 text-sm font-bold text-[#002b50]">
          {tile.title}
        </span>
      )}
    </Link>
  );
}

export function PokiGamePage({
  layout,
  siteName,
  game,
  categories,
  recommendationTiles,
  playerSettings,
  navigation,
  footerDescription,
  socialLinks,
  analytics,
  ads,
}: {
  layout: GameDetailLayout;
  siteName: string;
  game: GameData;
  categories: CategoryData[];
  recommendationTiles: DetailTile[];
  playerSettings?: PlayerSettings;
  navigation?: NavigationItem[];
  footerDescription?: string;
  socialLinks?: SocialLink[];
  analytics?: AnalyticsConfig;
  ads?: AdsConfig;
}) {
  const { ref: stageRef, scale } = useStageScale(layout.stageWidth);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const searchGames = useMemo(() => {
    const unique = new Map<string, DetailTile>();
    for (const tile of recommendationTiles) {
      if (!tile.href.startsWith('/game/')) continue;
      if (!unique.has(tile.siteGameId)) unique.set(tile.siteGameId, tile);
    }
    return [...unique.values()];
  }, [recommendationTiles]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchGames.slice(0, 8);

    return searchGames
      .filter((tile) => tile.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, searchGames]);

  const firstCategory = categories[0];
  const showDescriptionInDetails = Boolean(game.intro && game.description);
  const hasLongContent = Boolean(
    showDescriptionInDetails ||
    game.howToPlay ||
    game.controls ||
    game.features ||
    game.faq ||
    game.content
  );

  return (
    <PokiFrame background={layout.background}>
      <GameViewTracker siteGameId={game.siteGameId} />

      <nav
        className="fixed top-4 z-20 flex h-[94px] w-[94px] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_3px_5px_3px_rgba(93,107,132,0.2)]"
        style={{ left: 'max(16px, calc(50% - 652px))' }}
      >
        <Link
          href="/"
          aria-label={`${siteName} home`}
          className="flex min-h-0 flex-1 items-center justify-center px-2 text-center text-[13px] leading-4 font-bold"
        >
          <span className="line-clamp-2">{siteName}</span>
        </Link>
        <div className="flex h-10 border-t border-[#e8edf3]">
          <Link
            href="/"
            aria-label="Home"
            className="flex w-1/2 items-center justify-center text-lg font-bold"
          >
            <span aria-hidden>⌂</span>
          </Link>
          <button
            type="button"
            aria-label="Search"
            className="flex w-1/2 items-center justify-center"
            onClick={() => setSearchOpen(true)}
          >
            <img src="/poki/icons/search.svg" alt="" className="size-6" />
          </button>
        </div>
      </nav>

      {searchOpen ? (
        <div
          className="fixed inset-0 z-30 flex items-start justify-center bg-[#002b50]/40 p-4 pt-24"
          role="dialog"
          aria-modal="true"
          aria-label="Search games"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search games"
              className="h-12 w-full rounded-xl bg-[#f2f4f8] px-4 text-base outline-none"
            />
            <ul className="mt-3 max-h-80 overflow-auto">
              {results.map((tile) => (
                <li key={tile.siteGameId}>
                  <Link
                    href={tile.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#f2f4f8]"
                  >
                    {tile.image ? (
                      <img
                        src={tile.image}
                        alt=""
                        className="size-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="size-10 rounded-lg bg-[#e9eef5]" />
                    )}
                    <span className="font-semibold">{tile.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {results.length === 0 ? (
              <p className="px-2 py-5 text-sm text-[#5d6b84]">
                No matching games.
              </p>
            ) : null}
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-[#009cff]"
              onClick={() => setSearchOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[1304px] pt-4">
        <div ref={stageRef} className="w-full">
          <div style={{ height: layout.stageHeight * scale }}>
            <div
              className="relative"
              style={{
                width: layout.stageWidth,
                height: layout.stageHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <div
                className="absolute overflow-hidden bg-[#002b50]"
                style={{
                  left: layout.player.x,
                  top: layout.player.y,
                  width: layout.player.w,
                  height: layout.player.h + layout.player.barH,
                }}
              >
                <div
                  className="overflow-hidden bg-[#002b50]"
                  style={{
                    width: layout.player.w,
                    height: layout.player.h,
                  }}
                >
                  <GamePlayer
                    game={{
                      title: game.title,
                      embedUrl: game.embedUrl,
                      embedType: game.embedType,
                      aspectRatio: game.aspectRatio,
                    }}
                    settings={playerSettings}
                  />
                </div>
                <div
                  className="flex items-center gap-3 bg-white px-3"
                  style={{ height: layout.player.barH }}
                >
                  {game.imageUrl ? (
                    <img
                      src={game.imageUrl}
                      alt=""
                      className="size-10 rounded-[10px] object-cover"
                    />
                  ) : (
                    <div className="size-10 rounded-[10px] bg-[#e9eef5]" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base leading-5 font-bold">
                      {game.title}
                    </p>
                    {firstCategory ? (
                      <Link
                        href={`/category/${firstCategory.slug}`}
                        className="text-xs text-[#5d6b84] hover:underline"
                      >
                        {firstCategory.title}
                      </Link>
                    ) : (
                      <p className="text-xs text-[#5d6b84]">{siteName}</p>
                    )}
                  </div>
                  <GameRating
                    siteGameId={game.siteGameId}
                    initialLikes={game.likeCount}
                    initialDislikes={game.dislikeCount}
                    variant="compact"
                  />
                </div>
              </div>

              <div
                className="absolute"
                style={{
                  left: layout.ad.x,
                  top: layout.ad.y,
                  width: layout.ad.w,
                }}
              >
                <div className="bg-white/50" style={{ height: layout.ad.h }}>
                  <AdSlot ads={ads} slotKey="gameTop" className="size-full" />
                </div>
                <p className="mt-1 text-center text-[10px] tracking-wide text-[#5d6b84] uppercase">
                  Advertisement
                </p>
              </div>

              {layout.bannerAd ? (
                <div
                  className="absolute bg-white/50"
                  style={{
                    left: layout.bannerAd.x,
                    top: layout.bannerAd.y,
                    width: layout.bannerAd.w,
                    height: layout.bannerAd.h,
                  }}
                >
                  <AdSlot
                    ads={ads}
                    slotKey="gameBottom"
                    className="size-full"
                  />
                </div>
              ) : null}

              {recommendationTiles.map((tile) => (
                <TileLink
                  key={`${tile.siteGameId}-${tile.x}-${tile.y}`}
                  tile={tile}
                />
              ))}
            </div>
          </div>
        </div>

        <article className="bg-white px-6 py-10 md:px-[134px]">
          <p className="text-xs font-bold tracking-wide uppercase">
            <Link href="/">Games</Link>
            {firstCategory ? (
              <>
                <span className="px-2">/</span>
                <Link href={`/category/${firstCategory.slug}`}>
                  {firstCategory.title}
                </Link>
              </>
            ) : null}
          </p>

          <h1 className="mt-2 text-[36px] leading-10 font-bold">
            {game.title}
          </h1>

          {game.intro ? (
            <p className="mt-4 max-w-[784px] text-base leading-6">
              {game.intro}
            </p>
          ) : game.description ? (
            <MarkdownContent
              variant="game-site"
              content={game.description}
              className="mt-4 max-w-[784px] text-[#002b50]"
            />
          ) : null}

          {hasLongContent ? (
            <>
              <div className="relative mt-6 max-w-[1036px]">
                <div
                  id="game-details"
                  className={
                    expanded
                      ? 'space-y-7'
                      : 'max-h-[420px] space-y-7 overflow-hidden'
                  }
                >
                  {showDescriptionInDetails ? (
                    <section>
                      <MarkdownContent
                        variant="game-site"
                        content={game.description || ''}
                        className="text-[#002b50]"
                      />
                    </section>
                  ) : null}

                  {game.howToPlay ? (
                    <section>
                      <h2 className="mb-3 text-2xl font-bold">How to Play</h2>
                      <MarkdownContent
                        variant="game-site"
                        content={game.howToPlay}
                        className="text-[#002b50]"
                      />
                    </section>
                  ) : null}

                  {game.controls ? (
                    <section>
                      <h2 className="mb-3 text-2xl font-bold">Controls</h2>
                      <MarkdownContent
                        variant="game-site"
                        content={game.controls}
                        className="text-[#002b50]"
                      />
                    </section>
                  ) : null}

                  {game.features ? (
                    <section>
                      <h2 className="mb-3 text-2xl font-bold">Features</h2>
                      <MarkdownContent
                        variant="game-site"
                        content={game.features}
                        className="text-[#002b50]"
                      />
                    </section>
                  ) : null}

                  {game.faq ? (
                    <section>
                      <h2 className="mb-3 text-2xl font-bold">FAQ</h2>
                      <MarkdownContent
                        variant="game-site"
                        content={game.faq}
                        className="text-[#002b50]"
                      />
                    </section>
                  ) : null}

                  {game.content ? (
                    <section>
                      <MarkdownContent
                        variant="game-site"
                        content={game.content}
                        className="text-[#002b50]"
                      />
                    </section>
                  ) : null}
                </div>

                {!expanded ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-white/0 to-white"
                    aria-hidden="true"
                  />
                ) : null}
              </div>

              <button
                type="button"
                className="mt-4 text-sm font-bold tracking-wide uppercase"
                aria-expanded={expanded}
                aria-controls="game-details"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            </>
          ) : null}

          <h2 className="mt-10 text-[28px] leading-7 font-bold">
            About this game
          </h2>
          <dl className="mt-4 grid max-w-[640px] grid-cols-2 gap-y-3 text-sm">
            {categories.length > 0 ? (
              <>
                <dt className="font-semibold">Categories</dt>
                <dd>
                  {categories.map((category) => category.title).join(', ')}
                </dd>
              </>
            ) : null}
            <dt className="font-semibold">Views</dt>
            <dd>{formatCount(game.viewCount)}</dd>
            <dt className="font-semibold">Likes</dt>
            <dd>{formatCount(game.likeCount)}</dd>
            <dt className="font-semibold">Dislikes</dt>
            <dd>{formatCount(game.dislikeCount)}</dd>
          </dl>

          {categories.length > 0 ? (
            <>
              <h2 className="mt-10 text-[28px] leading-7 font-bold">
                Related categories
              </h2>
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold uppercase">
                {categories.map((category) => (
                  <li key={category.siteCategoryId}>
                    <Link
                      href={`/category/${category.slug}`}
                      className="hover:underline"
                    >
                      {category.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {searchGames.length > 0 ? (
            <>
              <h2 className="mt-10 text-[28px] leading-7 font-bold">
                More Games
              </h2>
              <div className="mt-4 flex flex-wrap gap-4">
                {searchGames.slice(0, 4).map((tile) => (
                  <Link
                    key={tile.siteGameId}
                    href={tile.href}
                    title={tile.title}
                    className="block size-[247px] overflow-hidden rounded-[16px] bg-white/40 transition duration-150 hover:scale-[1.04]"
                  >
                    {tile.image ? (
                      <img
                        src={tile.image}
                        alt={tile.title}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-end p-4 text-base font-bold">
                        {tile.title}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </article>
      </main>

      <PokiFooter
        siteName={siteName}
        footerDescription={footerDescription}
        navigation={navigation}
        popularLinks={categories.map((category) => ({
          label: category.title,
          href: `/category/${category.slug}`,
        }))}
        socialLinks={socialLinks}
      />

      <SiteRuntime analytics={analytics} ads={ads} />
    </PokiFrame>
  );
}
