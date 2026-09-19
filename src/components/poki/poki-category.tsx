import { useEffect, useMemo, useRef, useState } from 'react';

import { Link } from '@/core/i18n/navigation';
import { AdSlot } from '@/components/game-site/ad-slot';
import { SiteRuntime } from '@/components/game-site/site-runtime';
import { MarkdownContent } from '@/components/markdown-content';
import { PokiFooter, PokiFrame } from '@/components/poki/poki-chrome';

import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/700.css';

export type CategoryTile = {
  title: string;
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
  image: string | null;
};

export type CategoryBanner = {
  title: string;
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
  image: string | null;
};

export type CategorySearchGame = {
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

export function PokiCategory({
  background,
  stageHeight,
  titleBanner,
  gameTiles,
  relatedBanners,
  searchGames,
  siteName,
  categoryTitle,
  categoryDescription,
  categoryContent,
  navigation,
  footerDescription,
  socialLinks,
  analytics,
  ads,
}: {
  background: string;
  stageHeight: number;
  titleBanner: { x: number; y: number; w: number; h: number };
  gameTiles: CategoryTile[];
  relatedBanners: CategoryBanner[];
  searchGames: CategorySearchGame[];
  siteName: string;
  categoryTitle: string;
  categoryDescription?: string | null;
  categoryContent?: string | null;
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

  const hasEditorial = Boolean(categoryDescription || categoryContent);

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
          <div style={{ height: stageHeight * scale }}>
            <div
              className="relative"
              style={{
                width: STAGE_WIDTH,
                height: stageHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <header
                className="absolute z-[1] flex items-center justify-center rounded-[16px] bg-white px-4 py-2.5 shadow-[0_7px_10px_4px_rgba(93,107,132,0.3)]"
                style={{
                  left: titleBanner.x,
                  top: titleBanner.y,
                  width: titleBanner.w,
                  height: titleBanner.h,
                }}
              >
                <h1 className="text-center text-[20px] leading-6 font-bold text-[#002b50]">
                  {categoryTitle}
                </h1>
              </header>

              {gameTiles.map((tile) => (
                <Link
                  key={`${tile.href}-${tile.x}-${tile.y}`}
                  href={tile.href}
                  title={tile.title}
                  className="absolute block overflow-hidden rounded-[16px] bg-white/40 transition-[transform] duration-[600ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:z-10 hover:scale-[1.04]"
                  style={{
                    left: tile.x,
                    top: tile.y,
                    width: tile.w,
                    height: tile.h,
                  }}
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
              ))}

              {relatedBanners.map((banner) => (
                <Link
                  key={`${banner.href}-${banner.x}-${banner.y}`}
                  href={banner.href}
                  title={banner.title}
                  className="absolute z-[1] flex overflow-hidden rounded-[16px] bg-white shadow-[0_7px_10px_4px_rgba(93,107,132,0.3)] transition-[transform] duration-[600ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:z-10 hover:scale-[1.04]"
                  style={{
                    left: banner.x,
                    top: banner.y,
                    width: banner.w,
                    height: banner.h,
                  }}
                >
                  {banner.image ? (
                    <img
                      src={banner.image}
                      alt=""
                      className="size-[94px] shrink-0 rounded-l-[16px] object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-[94px] shrink-0 bg-[#e9eef5]" />
                  )}
                  <span className="flex flex-1 items-center px-2 text-[12px] leading-tight font-bold text-[#002b50] uppercase">
                    {banner.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,926px)_330px] md:gap-6 md:px-0">
          <article className="px-4 text-[#002b50] md:px-0">
            <nav
              className="mb-3 text-xs font-bold tracking-wide uppercase opacity-70"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:underline">
                Games
              </Link>
              <span className="mx-2">/</span>
              <span>{categoryTitle}</span>
            </nav>
            <h2 className="text-[36px] leading-10 font-bold">
              {categoryTitle}
            </h2>
            {categoryDescription ? (
              <div className="mt-4 max-w-[926px] text-base leading-6">
                <MarkdownContent
                  content={categoryDescription}
                  variant="game-site"
                />
              </div>
            ) : null}
            {categoryContent ? (
              <MarkdownContent
                variant="game-site"
                content={categoryContent}
                className="mt-6 max-w-[926px] text-[#002b50] [&_h2]:mt-4 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:mb-4 [&_h3]:text-lg [&_h3]:leading-6 [&_h3]:font-bold [&_li]:mb-1 [&_p]:mb-4 [&_p]:text-base [&_p]:leading-6 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
              />
            ) : null}
            {!hasEditorial ? (
              <p className="mt-4 max-w-[926px] text-base leading-6">
                Play free {categoryTitle.toLowerCase()} online.
              </p>
            ) : null}
          </article>

          <aside className="hidden md:block">
            <div className="overflow-hidden rounded-[16px] bg-white/50">
              <AdSlot
                ads={ads}
                slotKey="categorySidebar"
                className="min-h-[250px] w-full"
              />
            </div>
          </aside>
        </div>
      </main>

      <PokiFooter
        siteName={siteName}
        footerDescription={footerDescription}
        navigation={navigation}
        popularLinks={relatedBanners.map((banner) => ({
          label: banner.title,
          href: banner.href,
        }))}
        socialLinks={socialLinks}
      />

      <SiteRuntime analytics={analytics} ads={ads} />
    </PokiFrame>
  );
}
