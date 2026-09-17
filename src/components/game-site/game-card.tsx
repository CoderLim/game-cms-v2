import { Link } from '@/core/i18n/navigation';

export type GameCardData = {
  slug: string;
  title: string;
  imageUrl: string | null;
  viewCount?: number | null;
};

export function GameCard({ game }: { game: GameCardData }) {
  return (
    <Link
      href={`/game/${game.slug}`}
      className="group bg-card border-border overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="bg-muted aspect-[4/3] overflow-hidden">
        {game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt={game.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            No image
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-foreground truncate font-semibold">{game.title}</h3>
        {typeof game.viewCount === 'number' && game.viewCount > 0 ? (
          <p className="text-muted-foreground mt-1 text-xs">
            {game.viewCount.toLocaleString()} plays
          </p>
        ) : null}
      </div>
    </Link>
  );
}
