import { useEffect, useMemo, useRef, useState } from 'react';
import pageData from '@/data/poki-pool-club.json';

import { BuiltWithShipAny } from '@/components/built-with-shipany';

import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/700.css';

type Tile = {
  title: string;
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
  image: string;
};

const data = pageData as {
  background: string;
  stageWidth: number;
  stageHeight: number;
  player: {
    x: number;
    y: number;
    w: number;
    h: number;
    barH: number;
    title: string;
    developer: string;
    likes: string;
    dislikes: string;
    image: string;
    iframe?: string;
  };
  ad: { x: number; y: number; w: number; h: number };
  bannerAd?: { x: number; y: number; w: number; h: number };
  tiles: Tile[];
  developerGames: Tile[];
};

const STAGE_WIDTH = data.stageWidth;

const footerColumns = [
  {
    title: 'Popular',
    links: [
      'Car Games',
      '.io Games',
      '2 Player Games',
      'Puzzle Games',
      'Dress Up Games',
      'All Games',
    ],
  },
  {
    title: 'Help and Support',
    links: ['FAQ', 'Contact', 'Privacy Center'],
  },
  {
    title: 'Get To Know Us',
    links: ['About', 'Poki for Developers', 'Poki Kids', 'Blog', 'Jobs'],
  },
];

const categories = [
  ['Sports Games', '179'],
  ['Skill Games', '530'],
  ['Pool Games', '8'],
  ['Arcade Games', '312'],
  ['Ball Games', '114'],
  ['Classic Games', '71'],
];

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

function TileLink({ tile }: { tile: Tile }) {
  return (
    <a
      href={tile.href || '#'}
      title={tile.title}
      className="absolute block overflow-hidden rounded-[16px] bg-white/40 transition duration-150 hover:z-10 hover:scale-[1.04]"
      style={{ left: tile.x, top: tile.y, width: tile.w, height: tile.h }}
    >
      <img
        src={tile.image}
        alt={tile.title}
        className="size-full object-cover"
        loading="lazy"
      />
    </a>
  );
}

export function PokiGamePage() {
  const { ref: stageRef, scale } = useStageScale();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tiles = data.tiles.filter((tile) => tile.w === 94);
    if (!q) return tiles.slice(0, 8);
    return tiles
      .filter((tile) => tile.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query]);

  const player = data.player;

  return (
    <div
      className="min-h-screen text-[#002b50]"
      style={{
        backgroundColor: '#83ffe7',
        backgroundImage: `url(${data.background})`,
        backgroundSize: 'max(624px, 100%)',
        backgroundPosition: 'center top',
        fontFamily: '"Open Sans", "Proxima Nova", Arial, sans-serif',
      }}
    >
      <nav
        className="fixed top-4 z-20 flex h-[94px] w-[94px] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_3px_5px_3px_rgba(93,107,132,0.2)]"
        style={{ left: 'max(16px, calc(50% - 652px))' }}
      >
        <a
          href="/"
          aria-label="Poki"
          className="flex h-7 items-center justify-center pt-2"
        >
          <img src="/poki/icons/poki.svg" alt="" className="h-7 w-[60px]" />
        </a>
        <div className="mt-auto flex h-10">
          <button
            type="button"
            aria-label="Profile"
            className="flex w-1/2 items-center justify-center"
          >
            <img src="/poki/icons/user.svg" alt="" className="size-6" />
          </button>
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
        <div className="fixed inset-0 z-30 flex items-start justify-center bg-[#002b50]/40 p-4 pt-24">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What are you playing today?"
              className="h-12 w-full rounded-xl bg-[#f2f4f8] px-4 text-base outline-none"
            />
            <ul className="mt-3 max-h-80 overflow-auto">
              {results.map((tile) => (
                <li key={tile.href}>
                  <a
                    href={tile.href}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#f2f4f8]"
                  >
                    <img
                      src={tile.image}
                      alt=""
                      className="size-10 rounded-lg object-cover"
                    />
                    <span className="font-semibold">{tile.title}</span>
                  </a>
                </li>
              ))}
            </ul>
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
          <div style={{ height: data.stageHeight * scale }}>
            <div
              className="relative"
              style={{
                width: STAGE_WIDTH,
                height: data.stageHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <div
                className="absolute overflow-hidden bg-[#002b50]"
                style={{
                  left: player.x,
                  top: player.y,
                  width: player.w,
                  height: player.h + player.barH,
                }}
              >
                {player.iframe ? (
                  <iframe
                    title="Pool Club"
                    src={player.iframe}
                    className="block border-0 bg-[#002b50]"
                    style={{ width: player.w, height: player.h }}
                    allow="fullscreen; autoplay; gamepad; clipboard-write"
                    loading="lazy"
                  />
                ) : (
                  <img
                    src={player.image}
                    alt="Pool Club"
                    className="w-full object-cover"
                    style={{ height: player.h }}
                  />
                )}
                <div className="flex h-16 items-center gap-3 bg-white px-3">
                  <img
                    src={player.image}
                    alt=""
                    className="size-10 rounded-[10px] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base leading-5 font-bold">
                      Pool Club
                    </p>
                    <p className="text-xs text-[#5d6b84]">by Ravalmatic</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-[11px] font-semibold">
                    <button
                      type="button"
                      className="flex w-10 flex-col items-center gap-0.5"
                      aria-label="608.9K Like"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5 fill-[#009cff]"
                        aria-hidden
                      >
                        <path d="M7 10v10H4V10h3zm3.2 10h6.6c.8 0 1.5-.5 1.8-1.2l2.2-5.2c.1-.3.2-.6.2-.9V11c0-1.1-.9-2-2-2h-4.2l.7-3.2.1-.6c0-.4-.2-.8-.5-1.1L14 3l-5.2 5.2c-.4.4-.8 1.1-.8 1.8V18c0 1.1.9 2 2 2z" />
                      </svg>
                      <span>608.9K</span>
                    </button>
                    <button
                      type="button"
                      className="flex w-10 flex-col items-center gap-0.5"
                      aria-label="153.6K Dislike"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5 fill-[#009cff]"
                        aria-hidden
                      >
                        <path d="M17 14V4h3v10h-3zM13.8 4H7.2c-.8 0-1.5.5-1.8 1.2L3.2 10.4c-.1.3-.2.6-.2.9V13c0 1.1.9 2 2 2h4.2l-.7 3.2-.1.6c0 .4.2.8.5 1.1L10 21l5.2-5.2c.4-.4.8-1.1.8-1.8V6c0-1.1-.9-2-2-2z" />
                      </svg>
                      <span>153.6K</span>
                    </button>
                    <button
                      type="button"
                      className="flex w-10 flex-col items-center"
                      aria-label="Report a bug"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5 fill-[#009cff]"
                        aria-hidden
                      >
                        <path d="M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="absolute"
                style={{ left: data.ad.x, top: data.ad.y, width: data.ad.w }}
              >
                <div className="bg-white/50" style={{ height: data.ad.h }} />
                <p className="mt-1 text-center text-[10px] tracking-wide text-[#5d6b84] uppercase">
                  Advertisement
                </p>
              </div>

              {data.bannerAd ? (
                <div
                  className="absolute bg-white/50"
                  style={{
                    left: data.bannerAd.x,
                    top: data.bannerAd.y,
                    width: data.bannerAd.w,
                    height: data.bannerAd.h,
                  }}
                />
              ) : null}

              {data.tiles.map((tile) => (
                <TileLink
                  key={`${tile.href}-${tile.x}-${tile.y}`}
                  tile={tile}
                />
              ))}
            </div>
          </div>
        </div>

        <article className="px-8 py-10 md:px-[134px]">
          <p className="text-xs font-bold tracking-wide uppercase">
            <a href="/">Games</a>
            <span className="px-2">/</span>
            <a href="/en/pool">Pool Games</a>
          </p>
          <h1 className="mt-2 text-[36px] leading-10 font-bold">Pool Club</h1>
          <p className="mt-1 text-sm text-[#5d6b84]">by Ravalmatic</p>
          <p className="mt-4 max-w-[784px] text-base leading-6">
            Line up your shot, apply spin and pot balls through a range of pool
            challenges and modes. Read every angle on the table, plan your next
            move before you take the current shot and work through it
            efficiently.
          </p>
          {expanded ? (
            <div className="mt-4 max-w-[1036px] space-y-4 text-base leading-6">
              <p>
                Pool Club is a pool game created by Ravalmatic. Offering a
                smooth solo player pool game, Pool Club will challenge you to
                sink as many racks of balls as possible in 90 seconds. With each
                sunken ball, you&apos;ll get some extra seconds allowing you to
                extend your play limitlessly. The feature of Combos and Super
                Combos will add even more bonus seconds to the timer so you can
                impress all of your friends with your streak. Join our club and
                let time fly while sinking some balls!
              </p>
              <h2 className="text-2xl leading-6 font-bold">How to play:</h2>
              <p>
                Try to sink as many balls as possible before the timer runs out.
              </p>
              <h2 className="text-2xl leading-6 font-bold">
                About the creator:
              </h2>
              <p>
                Pool Club is created by Ravalmatic. Play their other games for
                free on Poki: Merge Cakes, foot-chinko, cricket-hero,
                Battleships Armada, Mafia Billiard Tricks and basket-champ
              </p>
            </div>
          ) : (
            <button
              type="button"
              className="mt-3 text-sm font-bold tracking-wide uppercase"
              onClick={() => setExpanded(true)}
            >
              Show more
            </button>
          )}

          <h2 className="mt-10 text-[28px] leading-7 font-bold">
            About this game
          </h2>
          <dl className="mt-4 grid max-w-[640px] grid-cols-2 gap-y-3 text-sm">
            <dt className="font-semibold">Supported devices</dt>
            <dd>Desktop, phone and tablet</dd>
            <dt className="font-semibold">Developer</dt>
            <dd>Ravalmatic</dd>
            <dt className="font-semibold">Genre</dt>
            <dd>Skill Games</dd>
            <dt className="font-semibold">Release Date</dt>
            <dd>March 2021</dd>
            <dt className="font-semibold">Latest update</dt>
            <dd>April 2021</dd>
            <dt className="font-semibold">Rating</dt>
            <dd>4.2 (762,474 votes)</dd>
          </dl>

          <h2 className="mt-10 text-[28px] leading-7 font-bold">
            Related categories
          </h2>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold uppercase">
            {categories.map(([name, count]) => (
              <li key={name}>
                <a href="#" className="hover:underline">
                  {name}
                  <span className="ml-1 font-semibold opacity-70">{count}</span>
                </a>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 text-[28px] leading-7 font-bold">
            More games by this developer
          </h2>
          <div className="mt-4 flex flex-wrap gap-4">
            {data.developerGames.map((tile) => (
              <a
                key={tile.href}
                href={tile.href}
                title={tile.title}
                className="block size-[247px] overflow-hidden rounded-[16px] transition duration-150 hover:scale-[1.04]"
              >
                <img
                  src={tile.image}
                  alt={tile.title}
                  className="size-full object-cover"
                />
              </a>
            ))}
          </div>
        </article>
      </main>

      <footer className="mx-auto w-full max-w-[1304px] px-4 py-10 text-sm font-semibold">
        <p className="text-lg">Let the world play</p>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="mb-2 text-xs tracking-wide uppercase opacity-70">
                {column.title}
              </p>
              <ul className="space-y-1">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="hover:underline">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <BuiltWithShipAny />
        </div>
      </footer>
    </div>
  );
}
