import { useEffect, useMemo, useRef, useState } from 'react';

import { Link } from '@/core/i18n/navigation';
import { SiteRuntime } from '@/components/game-site/site-runtime';
import { MarkdownContent } from '@/components/markdown-content';
import { PokiFooter, PokiFrame } from '@/components/poki/poki-chrome';

import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/700.css';

export type HomeTile = {
  title: string;
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
  image: string | null;
  /** Category tiles only. Square cards put the label on the bottom; wide cards put it on the right. */
  caption?: 'bottom' | 'side';
};

export type HomeGrid = {
  height: number;
  width: number;
  tiles: HomeTile[];
};

export type HomeSearchGame = {
  siteGameId: string;
  title: string;
  href: string;
  image: string | null;
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

type RuntimeConfig = {
  analytics?: {
    gaId?: string;
    clarityId?: string;
  };
  ads?: {
    enabled?: boolean;
    adsenseClient?: string;
    slots?: Record<string, string>;
  };
};

const STAGE_WIDTH = 1304;

function useStageScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => setScale(Math.min(1, node.clientWidth / STAGE_WIDTH));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, scale };
}

function CategoryCaption({ title }: { title: string }) {
  return (
    <span className="line-clamp-2 text-[12px] leading-5 font-bold text-[#002b50] uppercase">
      {title}
    </span>
  );
}

function Mosaic({ grid }: { grid: HomeGrid }) {
  return (
    <div
      className="relative mx-auto w-[1304px] max-w-none"
      style={{ height: grid.height }}
    >
      {grid.tiles.map((tile) => {
        const frame = {
          left: tile.x,
          top: tile.y,
          width: tile.w,
          height: tile.h,
        };

        if (tile.caption === 'side') {
          return (
            <Link
              key={`${tile.href}-${tile.x}-${tile.y}`}
              href={tile.href}
              title={tile.title}
              className="absolute flex items-center overflow-hidden rounded-[16px] bg-white transition duration-150 hover:z-10 hover:scale-[1.04]"
              style={frame}
            >
              {tile.image ? (
                <img
                  src={tile.image}
                  alt=""
                  className="size-[94px] shrink-0 rounded-l-[16px] object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="size-[94px] shrink-0 bg-[#e9eef5]" />
              )}
              <span className="px-2">
                <CategoryCaption title={tile.title} />
              </span>
            </Link>
          );
        }

        if (tile.caption === 'bottom') {
          return (
            <Link
              key={`${tile.href}-${tile.x}-${tile.y}`}
              href={tile.href}
              title={tile.title}
              className="absolute overflow-hidden rounded-[16px] bg-white transition duration-150 hover:z-10 hover:scale-[1.04]"
              style={frame}
            >
              {tile.image ? (
                <img
                  src={tile.image}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="block size-full bg-[#e9eef5]" />
              )}
              <span className="absolute inset-x-0 bottom-0 rounded-b-[16px] bg-white px-4 py-2.5">
                <CategoryCaption title={tile.title} />
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={`${tile.href}-${tile.x}-${tile.y}`}
            href={tile.href}
            title={tile.title}
            className="absolute block overflow-hidden rounded-[16px] bg-white/40 transition duration-150 hover:z-10 hover:scale-[1.04]"
            style={frame}
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
      })}
    </div>
  );
}

export function PokiHome({
  background,
  gameGrid,
  categoryGrid,
  searchGames,
  siteName,
  siteContent,
  navigation,
  footerDescription,
  socialLinks,
  analytics,
  ads,
}: {
  background: string;
  gameGrid: HomeGrid;
  categoryGrid: HomeGrid;
  searchGames: HomeSearchGame[];
  siteName: string;
  siteContent?: {
    title?: string | null;
    intro?: string | null;
    content?: string | null;
  } | null;
  navigation?: NavigationItem[];
  footerDescription?: string;
  socialLinks?: SocialLink[];
} & RuntimeConfig) {
  const { ref: stageRef, scale } = useStageScale();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchGames.slice(0, 8);

    return searchGames
      .filter((game) => game.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, searchGames]);

  const hasEditorialContent = Boolean(
    siteContent?.title || siteContent?.intro || siteContent?.content
  );

  return (
    <PokiFrame background={background}>
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
              {results.map((game) => (
                <li key={game.siteGameId}>
                  <Link
                    href={game.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#f2f4f8]"
                  >
                    {game.image ? (
                      <img
                        src={game.image}
                        alt=""
                        className="size-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="size-10 rounded-lg bg-[#e9eef5]" />
                    )}
                    <span className="font-semibold">{game.title}</span>
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
          <div
            style={{
              height: (gameGrid.height + 16 + categoryGrid.height) * scale,
            }}
          >
            <div
              style={{
                width: STAGE_WIDTH,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <Mosaic grid={gameGrid} />
              <div className="h-4" />
              <Mosaic grid={categoryGrid} />
            </div>
          </div>
        </div>

        <article className="mt-4 bg-white px-6 py-8 text-[#002b50] md:px-10 md:py-10">
          <p className="text-xs font-bold tracking-wide uppercase">
            {siteName}
          </p>
          <h1 className="mt-2 max-w-4xl text-[36px] leading-tight font-bold">
            {siteContent?.title || siteName}
          </h1>
          {siteContent?.intro ? (
            <p className="mt-4 max-w-3xl text-base leading-7">
              {siteContent.intro}
            </p>
          ) : null}
          {siteContent?.content ? (
            <MarkdownContent
              variant="game-site"
              content={siteContent.content}
              className="mt-8 max-w-4xl text-[#002b50]"
            />
          ) : null}
          {!hasEditorialContent ? (
            <p className="mt-4 max-w-3xl text-base leading-7">
              Browse and play the latest games on {siteName}.
            </p>
          ) : null}
        </article>
      </main>

      <PokiFooter
        siteName={siteName}
        footerDescription={footerDescription}
        navigation={navigation}
        popularLinks={categoryGrid.tiles.map((tile) => ({
          label: tile.title,
          href: tile.href,
        }))}
        socialLinks={socialLinks}
      />

      <SiteRuntime analytics={analytics} ads={ads} />
    </PokiFrame>
  );
}
