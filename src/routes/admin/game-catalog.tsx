import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

import { ImageUploadField } from '@/components/admin/image-upload-field';
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  type PageResult,
} from '@/lib/api-client';

interface GameRow {
  id: string;
  key: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  embedUrl: string | null;
  sourceUrl: string | null;
  provider: string | null;
  embedType: string;
  orientation: string | null;
  aspectRatio: string | null;
  status: string;
}

interface GameForm {
  key: string;
  title: string;
  description: string;
  imageUrl: string;
  embedUrl: string;
  sourceUrl: string;
  provider: string;
  embedType: string;
  orientation: string;
  aspectRatio: string;
  status: string;
}

const emptyForm = (): GameForm => ({
  key: '',
  title: '',
  description: '',
  imageUrl: '',
  embedUrl: '',
  sourceUrl: '',
  provider: '',
  embedType: 'iframe',
  orientation: '',
  aspectRatio: '',
  status: 'active',
});

export const Route = createFileRoute('/admin/game-catalog')({
  component: GameCatalogPage,
});

function GameCatalogPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GameForm>(emptyForm());

  const games = useQuery({
    queryKey: ['admin-game-catalog'],
    queryFn: () =>
      apiGet<PageResult<GameRow>>('/api/admin/game-catalog?page=1&pageSize=100'),
  });

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const saveGame = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        embedUrl: form.embedUrl || null,
        sourceUrl: form.sourceUrl || null,
        provider: form.provider || null,
        orientation: form.orientation || null,
        aspectRatio: form.aspectRatio || null,
      };

      return editingId
        ? apiPut('/api/admin/game-catalog', { id: editingId, ...payload })
        : apiPost('/api/admin/game-catalog', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Game updated' : 'Game created');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-game-catalog'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteGame = useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/api/admin/game-catalog?id=${encodeURIComponent(id)}`),
    onSuccess: () => {
      toast.success('Game deleted');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-game-catalog'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function editGame(game: GameRow) {
    setEditingId(game.id);
    setForm({
      key: game.key,
      title: game.title,
      description: game.description || '',
      imageUrl: game.imageUrl || '',
      embedUrl: game.embedUrl || '',
      sourceUrl: game.sourceUrl || '',
      provider: game.provider || '',
      embedType: game.embedType || 'iframe',
      orientation: game.orientation || '',
      aspectRatio: game.aspectRatio || '',
      status: game.status || 'active',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Game Catalog</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create and maintain reusable game assets here. Site-specific slug, SEO
          and publish state live under Site Games.
        </p>
      </div>

      <form
        className="bg-card border-border space-y-5 rounded-xl border p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.key || !form.title) {
            toast.error('Key and title are required');
            return;
          }
          saveGame.mutate();
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">
              {editingId ? 'Edit game' : 'Create game'}
            </h2>
            <p className="text-muted-foreground text-xs">
              Keys are stable identifiers; URLs and SEO are site scoped.
            </p>
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="border-border rounded-md border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['key', 'Game key', 'drift-boss'],
            ['title', 'Title', 'Drift Boss'],
            ['provider', 'Provider', 'gamemonetize'],
            ['embedUrl', 'Embed URL', 'https://...'],
            [
              'sourceUrl',
              'Source URL / asset path',
              '/games/drift-boss/index.html',
            ],
            ['aspectRatio', 'Aspect ratio', '16:9'],
          ].map(([key, label, placeholder]) => (
            <label key={key} className="space-y-1.5 text-sm">
              <span className="font-medium">{label}</span>
              <input
                className="border-input bg-background h-10 w-full rounded-md border px-3"
                placeholder={placeholder}
                value={form[key as keyof GameForm]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </label>
          ))}

          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Embed type</span>
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3"
              value={form.embedType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  embedType: event.target.value,
                }))
              }
            >
              <option value="iframe">iframe</option>
              <option value="external_url">external_url</option>
              <option value="r2_html5">r2_html5</option>
            </select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Orientation</span>
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3"
              value={form.orientation}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  orientation: event.target.value,
                }))
              }
            >
              <option value="">unspecified</option>
              <option value="landscape">landscape</option>
              <option value="portrait">portrait</option>
              <option value="square">square</option>
            </select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Catalog status</span>
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="archived">archived</option>
            </select>
          </label>
        </div>

        <ImageUploadField
          label="Game image / thumbnail"
          value={form.imageUrl}
          onChange={(imageUrl) =>
            setForm((current) => ({ ...current, imageUrl }))
          }
          help="Uploaded files use the configured CMS storage provider. Existing /games/... paths are also supported."
        />

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Catalog description</span>
          <textarea
            rows={4}
            className="border-input bg-background w-full rounded-md border p-3 text-sm"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </label>

        <button
          type="submit"
          disabled={saveGame.isPending}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saveGame.isPending
            ? 'Saving…'
            : editingId
              ? 'Save game'
              : 'Create game'}
        </button>
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
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(games.data?.items || []).map((game) => (
              <tr
                key={game.id}
                className="border-border border-t align-top"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {game.imageUrl ? (
                      <img
                        src={game.imageUrl}
                        alt=""
                        className="size-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="bg-muted size-10 rounded-md" />
                    )}
                    <span className="font-medium">{game.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{game.key}</td>
                <td className="px-4 py-3">{game.provider || '—'}</td>
                <td className="max-w-64 truncate px-4 py-3">
                  {game.embedUrl || game.sourceUrl || '—'}
                </td>
                <td className="px-4 py-3">{game.status}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="border-border rounded-md border px-2.5 py-1.5 text-xs"
                      onClick={() => editGame(game)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="border-destructive/50 text-destructive rounded-md border px-2.5 py-1.5 text-xs"
                      disabled={deleteGame.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete "${game.title}"? This only succeeds when it is not attached to any site.`
                          )
                        ) {
                          deleteGame.mutate(game.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!games.isLoading && !games.data?.items.length ? (
          <div className="text-muted-foreground p-8 text-center text-sm">
            No games yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
