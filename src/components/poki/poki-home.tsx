import { useEffect, useMemo, useRef, useState } from 'react';
import homeData from '@/data/poki-home.json';

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

type Grid = {
  height: number;
  width: number;
  tiles: Tile[];
};

const data = homeData as {
  background: string;
  gameGrid: Grid;
  categoryGrid: Grid;
  article: string;
  footer: string;
};

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
    links: [
      'FAQ',
      'Contact',
      'Privacy Center',
      'Privacy Statement',
      'Cookie Statement',
      'Terms of Use',
    ],
  },
  {
    title: 'Get To Know Us',
    links: ['About', 'Poki for Developers', 'Poki Kids', 'Blog', 'Jobs'],
  },
];

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

function Mosaic({ grid }: { grid: Grid }) {
  return (
    <div
      className="relative mx-auto w-[1304px] max-w-none"
      style={{ height: grid.height }}
    >
      {grid.tiles.map((tile) => (
        <a
          key={`${tile.href}-${tile.x}-${tile.y}`}
          href={tile.href || '#'}
          title={tile.title}
          className="absolute block overflow-hidden rounded-[16px] bg-white/40 transition duration-150 hover:z-10 hover:scale-[1.04]"
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
        </a>
      ))}
    </div>
  );
}

export function PokiHome() {
  const { ref: stageRef, scale } = useStageScale();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.gameGrid.tiles.slice(0, 8);
    return data.gameGrid.tiles
      .filter((tile) => tile.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query]);

  const paragraphs = data.article
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div
      className="min-h-screen overflow-x-auto text-[#002b50]"
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
                    href={tile.href || '#'}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#f2f4f8]"
                  >
                    {tile.image ? (
                      <img
                        src={tile.image}
                        alt=""
                        className="size-10 rounded-lg object-cover"
                      />
                    ) : null}
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
          <div
            style={{
              height:
                (data.gameGrid.height + 16 + data.categoryGrid.height) * scale,
            }}
          >
            <div
              style={{
                width: STAGE_WIDTH,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <Mosaic grid={data.gameGrid} />
              <div className="h-4" />
              <Mosaic grid={data.categoryGrid} />
            </div>
          </div>
        </div>
        <article className="mt-4 bg-white px-6 py-8 text-[#002b50]">
          {paragraphs.map((part, index) => {
            const lines = part
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean);
            const heading = lines[0];
            const rest = lines.slice(1);
            if (index === 0) {
              return (
                <div key={part.slice(0, 24)}>
                  <p className="text-xs font-bold tracking-wide uppercase">
                    {heading}
                  </p>
                  {rest[0] ? (
                    <h1 className="mt-2 text-[36px] leading-tight font-bold">
                      {rest[0]}
                    </h1>
                  ) : null}
                  {rest.slice(1).map((line) => (
                    <p
                      key={line.slice(0, 32)}
                      className="mt-3 max-w-3xl text-base leading-7"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              );
            }
            return (
              <section key={part.slice(0, 24)} className="mt-8">
                <h2 className="text-2xl font-bold">{heading}</h2>
                {rest.map((line) => (
                  <p
                    key={line.slice(0, 40)}
                    className="mt-2 max-w-3xl text-base leading-7"
                  >
                    {line}
                  </p>
                ))}
              </section>
            );
          })}
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
