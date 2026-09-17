export type GamePlayerData = {
  title: string;
  embedUrl: string | null;
  embedType: string;
  aspectRatio: string | null;
};

export function GamePlayer({ game }: { game: GamePlayerData }) {
  if (!game.embedUrl) {
    return (
      <div className="bg-muted text-muted-foreground flex min-h-[420px] items-center justify-center rounded-2xl text-sm">
        Game is not available yet.
      </div>
    );
  }

  const style = game.aspectRatio
    ? { aspectRatio: game.aspectRatio }
    : { aspectRatio: '16 / 9' };

  if (game.embedType === 'external_url') {
    return (
      <div className="bg-card border-border rounded-2xl border p-8 text-center">
        <p className="text-muted-foreground mb-4">
          This game opens on its source page.
        </p>
        <a
          href={game.embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground inline-flex rounded-lg px-5 py-2.5 font-medium"
        >
          Play {game.title}
        </a>
      </div>
    );
  }

  return (
    <div
      className="bg-black border-border w-full overflow-hidden rounded-2xl border"
      style={style}
    >
      <iframe
        src={game.embedUrl}
        title={game.title}
        loading="eager"
        allow="autoplay; fullscreen; gamepad; clipboard-read; clipboard-write"
        allowFullScreen
        className="h-full w-full border-0"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
