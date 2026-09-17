import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

import { apiGet, apiPost, type PageResult } from '@/lib/api-client';

interface GameRow {
  id: string;
  key: string;
  title: string;
  imageUrl: string | null;
  embedUrl: string | null;
  provider: string | null;
  status: string;
}

export const Route = createFileRoute('/admin/game-catalog')({
  component: GameCatalogPage,
});

function GameCatalogPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    key: '',
    title: '',
    imageUrl: '',
    embedUrl: '',
    provider: '',
  });

  const games = useQuery({
    queryKey: ['admin-game-catalog'],
    queryFn: () =>
      apiGet<PageResult<GameRow>>('/api/admin/game-catalog?page=1&pageSize=100'),
  });

  const createGame = useMutation({
    mutationFn: () => apiPost('/api/admin/game-catalog', form),
    onSuccess: () => {
      toast.success('Game created');
      setForm({ key: '', title: '', imageUrl: '', embedUrl: '', provider: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-game-catalog'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Game Catalog</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Global game assets live here. SEO content is edited only after a game is attached to a site.
        </p>
      </div>

      <form
        className="bg-card border-border grid gap-4 rounded-xl border p-5 md:grid-cols-2 xl:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.key || !form.title) {
            toast.error('Key and title are required');
            return;
          }
          createGame.mutate();
        }}
      >
        {[
          ['key', 'Game key', 'drift-boss'],
          ['title', 'Title', 'Drift Boss'],
          ['imageUrl', 'Image URL', 'https://...'],
          ['embedUrl', 'Embed URL', 'https://...'],
          ['provider', 'Provider', 'gamemonetize'],
        ].map(([key, label, placeholder]) => (
          <label key={key} className="space-y-1.5 text-sm">
            <span className="font-medium">{label}</span>
            <input
              className="border-input bg-background h-10 w-full rounded-md border px-3"
              placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={(event) =>
                setForm((current) => ({ ...current, [key]: event.target.value }))
              }
            />
          </label>
        ))}
        <div className="md:col-span-2 xl:col-span-5">
          <button
            type="submit"
            disabled={createGame.isPending}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {createGame.isPending ? 'Creating…' : 'Create game'}
          </button>
        </div>
      </form>

      <div className="border-border overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Game</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Embed</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(games.data?.items || []).map((game) => (
              <tr key={game.id} className="border-border border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {game.imageUrl ? (
                      <img
                        src={game.imageUrl}
                        alt=""
                        className="size-10 rounded-md object-cover"
                      />
                    ) : null}
                    <span className="font-medium">{game.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{game.key}</td>
                <td className="px-4 py-3">{game.provider || '—'}</td>
                <td className="max-w-64 truncate px-4 py-3">{game.embedUrl || '—'}</td>
                <td className="px-4 py-3">{game.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!games.isLoading && !games.data?.items.length ? (
          <div className="text-muted-foreground p-8 text-center text-sm">No games yet.</div>
        ) : null}
      </div>
    </div>
  );
}
