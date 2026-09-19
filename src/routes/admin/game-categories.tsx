import { useEffect, useState } from 'react';
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
import { resolveStaticAssetUrl } from '@/lib/static-asset-url';

interface SiteRow {
  id: string;
  key: string;
  name: string;
  domain: string;
  defaultLocale: string;
}

interface CategoryRow {
  id: string;
  key: string;
}

interface SiteCategoryRow {
  id: string;
  categoryId: string;
  categoryKey: string;
  imageUrl: string | null;
  status: string;
  indexable: boolean;
  sortWeight: number;
  slug: string | null;
  localizedTitle: string | null;
  contentStatus: string | null;
}

interface SiteGameRow {
  id: string;
  catalogTitle: string;
  localizedTitle: string | null;
}

interface CategoryContent {
  locale: string;
  slug: string;
  status: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  description: string | null;
  content: string | null;
}

const emptyContent = (locale: string): CategoryContent => ({
  locale,
  slug: '',
  status: 'draft',
  title: '',
  metaTitle: '',
  metaDescription: '',
  description: '',
  content: '',
});

export const Route = createFileRoute('/admin/game-categories')({
  component: GameCategoriesPage,
});

function GameCategoriesPage() {
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState('');
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [editingCatalogKey, setEditingCatalogKey] = useState('');
  const [siteId, setSiteId] = useState('');
  const [locale, setLocale] = useState('en');
  const [categoryId, setCategoryId] = useState('');
  const [editing, setEditing] = useState<SiteCategoryRow | null>(null);
  const [categoryImageUrl, setCategoryImageUrl] = useState('');
  const [sortWeight, setSortWeight] = useState(0);
  const [content, setContent] = useState<CategoryContent>(emptyContent('en'));
  const [assignSiteGameId, setAssignSiteGameId] = useState('');

  const sites = useQuery({
    queryKey: ['admin-game-sites'],
    queryFn: () =>
      apiGet<PageResult<SiteRow>>('/api/admin/game-sites?page=1&pageSize=100'),
  });

  const catalog = useQuery({
    queryKey: ['admin-game-categories'],
    queryFn: () =>
      apiGet<PageResult<CategoryRow>>(
        '/api/admin/game-categories?page=1&pageSize=100'
      ),
  });

  useEffect(() => {
    if (!siteId && sites.data?.items[0]) {
      setSiteId(sites.data.items[0].id);
      setLocale(sites.data.items[0].defaultLocale || 'en');
    }
  }, [siteId, sites.data]);

  const siteCategories = useQuery({
    queryKey: ['admin-site-categories', siteId, locale],
    enabled: Boolean(siteId),
    queryFn: () =>
      apiGet<PageResult<SiteCategoryRow>>(
        `/api/admin/site-categories?siteId=${encodeURIComponent(siteId)}&locale=${encodeURIComponent(locale)}&page=1&pageSize=100`
      ),
  });

  const siteGames = useQuery({
    queryKey: ['admin-site-games', siteId, locale],
    enabled: Boolean(siteId),
    queryFn: () =>
      apiGet<PageResult<SiteGameRow>>(
        `/api/admin/site-games?siteId=${encodeURIComponent(siteId)}&locale=${encodeURIComponent(locale)}&page=1&pageSize=100`
      ),
  });

  const contentQuery = useQuery({
    queryKey: ['admin-site-category-content', siteId, editing?.id, locale],
    enabled: Boolean(siteId && editing?.id),
    queryFn: () =>
      apiGet<CategoryContent | null>(
        `/api/admin/site-category-content?siteId=${encodeURIComponent(siteId)}&siteCategoryId=${encodeURIComponent(editing!.id)}&locale=${encodeURIComponent(locale)}`
      ),
  });

  useEffect(() => {
    if (!editing) return;
    setCategoryImageUrl(editing.imageUrl || '');
    setSortWeight(editing.sortWeight || 0);
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    if (contentQuery.data) {
      setContent({ ...emptyContent(locale), ...contentQuery.data, locale });
    } else if (contentQuery.isSuccess) {
      setContent({
        ...emptyContent(locale),
        slug: editing.slug || editing.categoryKey,
        title: editing.localizedTitle || editing.categoryKey,
      });
    }
  }, [editing, locale, contentQuery.data, contentQuery.isSuccess]);

  const createCategory = useMutation({
    mutationFn: () => apiPost('/api/admin/game-categories', { key: newKey }),
    onSuccess: () => {
      toast.success('Category created');
      setNewKey('');
      queryClient.invalidateQueries({ queryKey: ['admin-game-categories'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateCatalogCategory = useMutation({
    mutationFn: () => {
      if (!editingCatalogId) throw new Error('No category selected');
      return apiPut('/api/admin/game-categories', {
        id: editingCatalogId,
        key: editingCatalogKey,
      });
    },
    onSuccess: () => {
      toast.success('Category updated');
      setEditingCatalogId(null);
      setEditingCatalogKey('');
      queryClient.invalidateQueries({ queryKey: ['admin-game-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-site-categories'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteCatalogCategory = useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/api/admin/game-categories?id=${encodeURIComponent(id)}`),
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-game-categories'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const attachCategory = useMutation({
    mutationFn: () =>
      apiPost('/api/admin/site-categories', {
        siteId,
        categoryId,
        status: 'draft',
      }),
    onSuccess: () => {
      toast.success('Category attached to site');
      setCategoryId('');
      queryClient.invalidateQueries({ queryKey: ['admin-site-categories'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updatePlacement = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPut('/api/admin/site-categories', { siteId, ...payload }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-site-categories'] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const removeFromSite = useMutation({
    mutationFn: (id: string) =>
      apiDelete(
        `/api/admin/site-categories?siteId=${encodeURIComponent(siteId)}&id=${encodeURIComponent(id)}`
      ),
    onSuccess: () => {
      toast.success('Category removed from site');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-site-categories'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveContent = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('No category selected');

      await apiPut('/api/admin/site-categories', {
        siteId,
        id: editing.id,
        imageUrl: categoryImageUrl || null,
        sortWeight,
      });

      return apiPut('/api/admin/site-category-content', {
        siteId,
        siteCategoryId: editing.id,
        ...content,
      });
    },
    onSuccess: () => {
      toast.success('Category saved');
      queryClient.invalidateQueries({ queryKey: ['admin-site-categories'] });
      queryClient.invalidateQueries({
        queryKey: ['admin-site-category-content'],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const assignGame = useMutation({
    mutationFn: () => {
      if (!editing || !assignSiteGameId) throw new Error('Select a game');
      return apiPost('/api/admin/site-category-games', {
        siteId,
        siteGameId: assignSiteGameId,
        siteCategoryId: editing.id,
      });
    },
    onSuccess: () => {
      toast.success('Game assigned to category');
      setAssignSiteGameId('');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Game Categories</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage reusable category keys, then configure image, slug, SEO
          Markdown and publish state per site.
        </p>
      </div>

      <section className="bg-card border-border rounded-xl border p-5">
        <h2 className="mb-4 font-semibold">Global category catalog</h2>
        <div className="flex max-w-xl gap-2">
          <input
            className="border-input bg-background h-10 min-w-0 flex-1 rounded-md border px-3"
            placeholder="racing-games"
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
          />
          <button
            type="button"
            disabled={!newKey || createCategory.isPending}
            onClick={() => createCategory.mutate()}
            className="bg-primary text-primary-foreground rounded-md px-4 text-sm font-medium disabled:opacity-50"
          >
            Add category
          </button>
        </div>

        <div className="border-border mt-5 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(catalog.data?.items || []).map((item) => (
                <tr key={item.id} className="border-border border-t">
                  <td className="px-4 py-3">
                    {editingCatalogId === item.id ? (
                      <input
                        autoFocus
                        className="border-input bg-background h-9 w-full max-w-sm rounded-md border px-3 font-mono text-xs"
                        value={editingCatalogKey}
                        onChange={(event) =>
                          setEditingCatalogKey(event.target.value)
                        }
                      />
                    ) : (
                      <span className="font-mono text-xs">{item.key}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {editingCatalogId === item.id ? (
                        <>
                          <button
                            type="button"
                            disabled={
                              !editingCatalogKey ||
                              updateCatalogCategory.isPending
                            }
                            onClick={() => updateCatalogCategory.mutate()}
                            className="bg-primary text-primary-foreground rounded-md px-2.5 py-1.5 text-xs disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatalogId(null);
                              setEditingCatalogKey('');
                            }}
                            className="border-border rounded-md border px-2.5 py-1.5 text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatalogId(item.id);
                              setEditingCatalogKey(item.key);
                            }}
                            className="border-border rounded-md border px-2.5 py-1.5 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deleteCatalogCategory.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete category "${item.key}"? This only succeeds when it has no site/game assignments.`
                                )
                              ) {
                                deleteCatalogCategory.mutate(item.id);
                              }
                            }}
                            className="border-destructive/50 text-destructive rounded-md border px-2.5 py-1.5 text-xs"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-card border-border grid gap-4 rounded-xl border p-5 md:grid-cols-3">
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
          <span className="font-medium">Locale</span>
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
          <span className="font-medium">Attach global category</span>
          <div className="flex gap-2">
            <select
              className="border-input bg-background h-10 min-w-0 flex-1 rounded-md border px-3"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Select category</option>
              {(catalog.data?.items || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.key}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!siteId || !categoryId || attachCategory.isPending}
              onClick={() => attachCategory.mutate()}
              className="bg-primary text-primary-foreground rounded-md px-3 text-sm font-medium disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </label>
      </section>

      <div className="border-border overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Slug / content</th>
              <th className="px-4 py-3">Placement</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(siteCategories.data?.items || []).map((row) => (
              <tr key={row.id} className="border-border border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {row.imageUrl ? (
                      <img
                        src={resolveStaticAssetUrl(row.imageUrl) || row.imageUrl}
                        alt=""
                        className="size-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="bg-muted size-10 rounded-md" />
                    )}
                    <span className="font-mono text-xs">
                      {row.categoryKey}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    {row.localizedTitle || row.slug || 'No locale content'}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {row.contentStatus || 'missing'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {row.status} {row.indexable ? '· index' : ''} · weight{' '}
                  {row.sortWeight}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(row)}
                      className="border-border rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updatePlacement.mutate({
                          id: row.id,
                          status:
                            row.status === 'published'
                              ? 'draft'
                              : 'published',
                        })
                      }
                      className="border-border rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      {row.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updatePlacement.mutate({
                          id: row.id,
                          indexable: !row.indexable,
                        })
                      }
                      className="border-border rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      {row.indexable ? 'Noindex' : 'Index'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!siteCategories.isLoading && !siteCategories.data?.items.length ? (
          <div className="text-muted-foreground p-8 text-center text-sm">
            {siteId
              ? 'No categories attached to this site.'
              : 'Select a site.'}
          </div>
        ) : null}
      </div>

      {editing ? (
        <section className="bg-card border-border rounded-xl border p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Category · {editing.categoryKey}
              </h2>
              <p className="text-muted-foreground text-sm">
                {locale} · image, SEO and content are unique to this site
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-muted-foreground text-sm"
            >
              Close
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ['slug', 'Slug'],
                  ['title', 'Title / H1'],
                  ['metaTitle', 'Meta title'],
                  ['metaDescription', 'Meta description'],
                ].map(([key, label]) => (
                  <label key={key} className="space-y-1.5 text-sm">
                    <span className="font-medium">{label}</span>
                    <input
                      className="border-input bg-background h-10 w-full rounded-md border px-3"
                      value={
                        (content[
                          key as keyof CategoryContent
                        ] as string | null) || ''
                      }
                      onChange={(event) =>
                        setContent((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
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
                      setContent((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="draft">draft</option>
                    <option value="published">published</option>
                    <option value="archived">archived</option>
                  </select>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Sort weight</span>
                  <input
                    type="number"
                    className="border-input bg-background h-10 w-full rounded-md border px-3"
                    value={sortWeight}
                    onChange={(event) =>
                      setSortWeight(Number(event.target.value) || 0)
                    }
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Description</span>
                <textarea
                  rows={5}
                  className="border-input bg-background w-full rounded-md border p-3 text-sm"
                  value={content.description || ''}
                  onChange={(event) =>
                    setContent((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">SEO content (Markdown)</span>
                <textarea
                  rows={14}
                  className="border-input bg-background w-full rounded-md border p-3 font-mono text-sm"
                  value={content.content || ''}
                  onChange={(event) =>
                    setContent((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                />
                <span className="text-muted-foreground block text-xs">
                  Markdown is stored as source and rendered by the public
                  category page.
                </span>
              </label>
            </div>

            <div className="space-y-5">
              <ImageUploadField
                label="Category image"
                value={categoryImageUrl}
                onChange={setCategoryImageUrl}
                help="Use an uploaded asset or a stable relative path such as /categories/racing.png."
              />

              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Assign a site game</span>
                <select
                  className="border-input bg-background h-10 w-full rounded-md border px-3"
                  value={assignSiteGameId}
                  onChange={(event) =>
                    setAssignSiteGameId(event.target.value)
                  }
                >
                  <option value="">Select game</option>
                  {(siteGames.data?.items || []).map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.localizedTitle || game.catalogTitle}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                disabled={!assignSiteGameId || assignGame.isPending}
                onClick={() => assignGame.mutate()}
                className="border-border h-10 w-full rounded-md border px-4 text-sm font-medium disabled:opacity-50"
              >
                Assign game
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={
              !content.slug || !content.title || saveContent.isPending
            }
            onClick={() => saveContent.mutate()}
            className="bg-primary text-primary-foreground mt-5 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saveContent.isPending ? 'Saving…' : 'Save category'}
          </button>
        </section>
      ) : null}
    </div>
  );
}
