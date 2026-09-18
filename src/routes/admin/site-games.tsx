import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

import {
  apiGet,
  apiPost,
  apiPut,
  type PageResult,
} from '@/lib/api-client';

interface SiteRow {
  id: string;
  key: string;
  name: string;
  domain: string;
  defaultLocale: string;
}

interface GameRow {
  id: string;
  key: string;
  title: string;
}

interface SiteGameRow {
  id: string;
  gameId: string;
  gameKey: string;
  catalogTitle: string;
  imageUrl: string | null;
  status: string;
  indexable: boolean;
  featured: boolean;
  hot: boolean;
  viewCount: number;
  slug: string | null;
  localizedTitle: string | null;
  contentStatus: string | null;
}

interface SiteGameContent {
  id?: string;
  locale: string;
  slug: string;
  status: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  intro: string | null;
  description: string | null;
  content: string | null;
  howToPlay: string | null;
  controls: string | null;
  features: string | null;
  faq: string | null;
}

const emptyContent = (locale: string): SiteGameContent => ({
  locale,
  slug: '',
  status: 'draft',
  title: '',
  metaTitle: '',
  metaDescription: '',
  intro: '',
  description: '',
  content: '',
  howToPlay: '',
  controls: '',
  features: '',
  faq: '',
});

export const Route = createFileRoute('/admin/site-games')({
  component: SiteGamesPage,
});

function SiteGamesPage() {
  const queryClient = useQueryClient();
  const [siteId, setSiteId] = useState('');
  const [gameId, setGameId] = useState('');
  const [locale, setLocale] = useState('en');
  const [editing, setEditing] = useState<SiteGameRow | null>(null);
  const [content, setContent] = useState<SiteGameContent>(emptyContent('en'));

  const sites = useQuery({
    queryKey: ['admin-game-sites'],
    queryFn: () =>
      apiGet<PageResult<SiteRow>>('/api/admin/game-sites?page=1&pageSize=100'),
  });

  const catalog = useQuery({
    queryKey: ['admin-game-catalog'],
    queryFn: () =>
      apiGet<PageResult<GameRow>>('/api/admin/game-catalog?page=1&pageSize=100'),
  });

  useEffect(() => {
    if (!siteId && sites.data?.items[0]) {
      setSiteId(sites.data.items[0].id);
      setLocale(sites.data.items[0].defaultLocale || 'en');
    }
  }, [siteId, sites.data]);

  const siteGames = useQuery({
    queryKey: ['admin-site-games', siteId, locale],
    enabled: Boolean(siteId),
    queryFn: () =>
      apiGet<PageResult<SiteGameRow>>(
        `/api/admin/site-games?siteId=${encodeURIComponent(siteId)}&locale=${encodeURIComponent(locale)}&page=1&pageSize=100`
      ),
  });

  const contentQuery = useQuery({
    queryKey: ['admin-site-game-content', siteId, editing?.id, locale],
    enabled: Boolean(siteId && editing?.id),
    queryFn: () =>
      apiGet<SiteGameContent | null>(
        `/api/admin/site-game-content?siteId=${encodeURIComponent(siteId)}&siteGameId=${encodeURIComponent(editing!.id)}&locale=${encodeURIComponent(locale)}`
      ),
  });

  useEffect(() => {
    if (!editing) return;
    if (contentQuery.data) {
      setContent({
        ...emptyContent(locale),
        ...contentQuery.data,
        locale,
      });
    } else if (contentQuery.isSuccess) {
      setContent({
        ...emptyContent(locale),
        title: editing.localizedTitle || editing.catalogTitle,
        slug: editing.slug || editing.gameKey,
      });
    }
  }, [editing, locale, contentQuery.data, contentQuery.isSuccess]);

  const attach = useMutation({
    mutationFn: () =>
      apiPost('/api/admin/site-games', {
        siteId,
        gameId,
        status: 'draft',
      }),
    onSuccess: () => {
      toast.success('Game attached to site');
      setGameId('');
      queryClient.invalidateQueries({ queryKey: ['admin-site-games'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updatePlacement = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPut('/api/admin/site-games', payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-site-games'] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const saveContent = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No game selected');
      return apiPut('/api/admin/site-game-content', {
        siteId,
        siteGameId: editing.id,
        ...content,
      });
    },
    onSuccess: () => {
      toast.success('Content saved');
      queryClient.invalidateQueries({ queryKey: ['admin-site-games'] });
      queryClient.invalidateQueries({ queryKey: ['admin-site-game-content'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const currentSite = sites.data?.items.find((item) => item.id === siteId);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Site Games</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Attach global games to a site, then publish unique localized content for that site.
        </p>
      </div>

      <div className="bg-card border-border grid gap-4 rounded-xl border p-5 md:grid-cols-3">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Site</span>
          <select
            className="border-input bg-background h-10 w-full rounded-md border px-3"
            value={siteId}
            onChange={(event) => {
              const next = event.target.value;
              setSiteId(next);
              setEditing(null);
              const site = sites.data?.items.find((item) => item.id === next);
              if (site) setLocale(site.defaultLocale || 'en');
            }}
          >
            <option value="">Select site</option>
            {(sites.data?.items || []).map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.domain})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Content locale</span>
          <input
            className="border-input bg-background h-10 w-full rounded-md border px-3"
            value={locale}
            onChange={(event) => {
              setLocale(event.target.value.trim().toLowerCase());
              setEditing(null);
            }}
          />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Attach catalog game</span>
          <div className="flex gap-2">
            <select
              className="border-input bg-background h-10 min-w-0 flex-1 rounded-md border px-3"
              value={gameId}
              onChange={(event) => setGameId(event.target.value)}
            >
              <option value="">Select game</option>
              {(catalog.data?.items || []).map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!siteId || !gameId || attach.isPending}
              onClick={() => attach.mutate()}
              className="bg-primary text-primary-foreground rounded-md px-3 text-sm font-medium disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </label>
      </div>

      {currentSite ? (
        <div className="text-muted-foreground text-sm">
          Editing <span className="text-foreground font-medium">{currentSite.name}</span> · SITE_KEY {currentSite.key}
        </div>
      ) : null}

      <div className="border-border overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Game</th>
              <th className="px-4 py-3">Slug / content</th>
              <th className="px-4 py-3">Placement</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(siteGames.data?.items || []).map((row) => (
              <tr key={row.id} className="border-border border-t align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{row.localizedTitle || row.catalogTitle}</div>
                  <div className="text-muted-foreground font-mono text-xs">{row.gameKey}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{row.slug || 'No locale content'}</div>
                  <div className="text-muted-foreground text-xs">{row.contentStatus || 'missing'}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {row.status === 'published' ? <span>published</span> : <span>draft</span>}
                    {row.indexable ? <span>· index</span> : null}
                    {row.featured ? <span>· featured</span> : null}
                    {row.hot ? <span>· hot</span> : null}
                  </div>
                </td>
                <td className="px-4 py-3">{row.viewCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(row)}
                      className="border-border rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      Content
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updatePlacement.mutate({
                          id: row.id,
                          status: row.status === 'published' ? 'draft' : 'published',
                        })
                      }
                      className="border-border rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      {row.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updatePlacement.mutate({ id: row.id, indexable: !row.indexable })
                      }
                      className="border-border rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      {row.indexable ? 'Noindex' : 'Index'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updatePlacement.mutate({ id: row.id, featured: !row.featured })
                      }
                      className="border-border rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      {row.featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePlacement.mutate({ id: row.id, hot: !row.hot })}
                      className="border-border rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      {row.hot ? 'Unhot' : 'Hot'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!siteGames.isLoading && !siteGames.data?.items.length ? (
          <div className="text-muted-foreground p-8 text-center text-sm">
            {siteId ? 'No games attached to this site.' : 'Select a site.'}
          </div>
        ) : null}
      </div>

      {editing ? (
        <section className="bg-card border-border rounded-xl border p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Localized content · {editing.catalogTitle}</h2>
              <p className="text-muted-foreground text-sm">{locale} · content is unique to this site</p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-muted-foreground text-sm"
            >
              Close
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['slug', 'Slug'],
              ['title', 'Page title'],
              ['metaTitle', 'Meta title'],
              ['metaDescription', 'Meta description'],
              ['intro', 'Intro'],
            ].map(([key, label]) => (
              <label key={key} className="space-y-1.5 text-sm">
                <span className="font-medium">{label}</span>
                <input
                  className="border-input bg-background h-10 w-full rounded-md border px-3"
                  value={(content[key as keyof SiteGameContent] as string | null) || ''}
                  onChange={(event) =>
                    setContent((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
              </label>
            ))}
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Content status</span>
              <select
                className="border-input bg-background h-10 w-full rounded-md border px-3"
                value={content.status}
                onChange={(event) =>
                  setContent((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              ['description', 'Description'],
              ['howToPlay', 'How to play'],
              ['controls', 'Controls'],
              ['features', 'Features'],
              ['faq', 'FAQ'],
              ['content', 'Long content'],
            ].map(([key, label]) => (
              <label key={key} className="space-y-1.5 text-sm">
                <span className="font-medium">{label}</span>
                <textarea
                  rows={key === 'content' ? 12 : 6}
                  className="border-input bg-background w-full rounded-md border p-3 font-mono text-sm"
                  value={(content[key as keyof SiteGameContent] as string | null) || ''}
                  onChange={(event) =>
                    setContent((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            disabled={!content.slug || !content.title || saveContent.isPending}
            onClick={() => saveContent.mutate()}
            className="bg-primary text-primary-foreground mt-5 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saveContent.isPending ? 'Saving…' : 'Save localized content'}
          </button>
        </section>
      ) : null}
    </div>
  );
}
