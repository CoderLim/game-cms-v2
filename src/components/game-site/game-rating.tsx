import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

function formatCount(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`;
  }
  return String(value);
}

export function GameRating({
  siteGameId,
  initialLikes,
  initialDislikes,
  variant = 'default',
}: {
  siteGameId: string;
  initialLikes: number;
  initialDislikes: number;
  variant?: 'default' | 'compact';
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [voted, setVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const vote = async (value: 'like' | 'dislike') => {
    if (voted || submitting) return;
    setSubmitting(true);

    try {
      const response = await fetch('/api/game-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteGameId, vote: value }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          likeCount: number;
          dislikeCount: number;
        };
        setLikes(data.likeCount);
        setDislikes(data.dislikeCount);
        setVoted(true);
      } else if (response.status === 409) {
        setVoted(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="ml-auto flex items-center gap-2 text-[11px] font-semibold text-[#002b50]">
        <button
          type="button"
          disabled={voted || submitting}
          onClick={() => vote('like')}
          className="flex w-11 flex-col items-center gap-0.5 rounded-md py-1 transition hover:bg-[#eef8ff] disabled:opacity-60"
          aria-label={`${likes} likes`}
        >
          <ThumbsUp className="size-5 text-[#009cff]" />
          <span>{formatCount(likes)}</span>
        </button>
        <button
          type="button"
          disabled={voted || submitting}
          onClick={() => vote('dislike')}
          className="flex w-11 flex-col items-center gap-0.5 rounded-md py-1 transition hover:bg-[#eef8ff] disabled:opacity-60"
          aria-label={`${dislikes} dislikes`}
        >
          <ThumbsDown className="size-5 text-[#009cff]" />
          <span>{formatCount(dislikes)}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="border-border bg-card mt-4 flex items-center gap-2 rounded-xl border p-2">
      <span className="text-muted-foreground mr-1 px-2 text-sm">
        Was this game fun?
      </span>
      <button
        type="button"
        disabled={voted || submitting}
        onClick={() => vote('like')}
        className="hover:bg-muted disabled:opacity-60 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition"
      >
        <ThumbsUp className="size-4" />
        {likes}
      </button>
      <button
        type="button"
        disabled={voted || submitting}
        onClick={() => vote('dislike')}
        className="hover:bg-muted disabled:opacity-60 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition"
      >
        <ThumbsDown className="size-4" />
        {dislikes}
      </button>
    </div>
  );
}
