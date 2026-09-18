import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

import { apiGet, apiPost, apiPut, type PageResult } from '@/lib/api-client';

interface SiteRow {
  id: string;
  name: string;
  domain: string;
  defaultLocale: string;
}

interface PostRow {
  sitePostId: string;
  type: string;
  status: string;
  indexable: boolean;
  featured: boolean;
  authorName: string | null;
  locale: string | null;
  slug: string | null;
  contentStatus: string | null;
  title: string | null;
  description: string | null;
}

interface PostContent {
  locale: string;
  slug: string;
  status: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  description: string;
  imageUrl: string;
  content: string;
}

const emptyContent = (locale: string): PostContent => ({
  locale,
  slug: '',
  status: 'draft',
  title: '',
  metaTitle: '',
  metaDescription: '',
  description: '',
  imageUrl: '',
  content: '',
});

export const Route = createFileRoute('/admin/site-posts')({
  component: SitePostsPage,
});

function SitePostsPage() {
  const queryClient = useQueryClient();
  const [siteId, setSiteId] = useState('');
  const [locale, setLocale] = useState('en');
  const [editing, setEditing] = useState<PostRow | null>(null);
  const [content, setContent] = useState<PostContent>(emptyContent('en'));

  const sites = useQuery({
    queryKey: ['admin-game-sites'],
    queryFn: () => apiGet<PageResult<SiteRow>>('/api/admin/game-sites?page=1&pageSize=100'),
  });

  useEffect(() => {
    if (!siteId && sites.data?.items[0]) {
      setSiteId(sites.data.items[0].id);
      setLocale(sites.data.items[0].defaultLocale || 'en');
    }
  }, [siteId, sites.data]);

  const posts = useQuery({
    queryKey: ['admin-site-posts', siteId, locale],
    enabled: Boolean(siteId),
    queryFn: () =>
      apiGet<PageResult<PostRow>>(
        `/api/admin/site-posts?siteId=${encodeURIComponent(siteId)}&locale=${encodeURIComponent(locale)}&page=1&pageSize=100`
      ),
  });

  const contentQuery = useQuery({
    queryKey: ['admin-site-post-content', siteId, editing?.sitePostId, locale],
    enabled: Boolean(siteId && editing?.sitePostId),
    queryFn: () =>
      apiGet<PostContent | null>(
        `/api/admin/site-post-content?siteId=${encodeURIComponent(siteId)}&sitePostId=${encodeURIComponent(editing!.sitePostId)}&locale=${encodeURIComponent(locale)}`
      ),
  });

  useEffect(() => {
    if (!editing) return;
    if (contentQuery.data) {
      setContent({ ...emptyContent(locale), ...contentQuery.data, locale });
    } else if (contentQuery.isSuccess) {
      setContent({
        ...emptyContent(locale),
        slug: editing.slug || '',
        title: editing.title || '',
        description: editing.description || '',
      });
    }
  }, [editing, locale, contentQuery.data, contentQuery.isSuccess]);

  const create = useMutation({
    mutationFn: () =>
      apiPost('/api/admin/site-posts', {
        siteId,
        type: 'guide',
        status: 'draft',
        indexable: false,
        featured: false,
      }),
    onSuccess: () => {
      toast.success('Post created');
      queryClient.invalidateQueries({ queryKey: ['admin-site-posts'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updatePlacement = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiPut('/api/admin/site-posts', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-site-posts'] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const saveContent = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No post selected');
      return apiPut('/api/admin/site-post-content', {
        siteId,
        sitePostId: editing.sitePostId,
        ...content,
      });
    },
    onSuccess: () => {
      toast.success('Post content saved');
      queryClient.invalidateQueries({ queryKey: ['admin-site-posts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-site-post-content'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Site Posts & Guides</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Editorial content is isolated per site and locale. Guides use /guides/:slug; articles and updates use /blog/:slug.
          </p>
        </div>
        <button
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={!siteId || create.isPending}
          onClick={() => create.mutate()}
        >
          New Guide
        </button>
      </div>

      <div className="bg-card border-border grid gap-4 rounded-xl border p-5 md:grid-cols-2">
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
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Post</th>
              <th className="px-4 py-3">Content</th>
              <th className="px-4 py-3">Indexable</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(posts.data?.items || []).map((post) => (
              <tr key={post.sitePostId} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{post.title || 'Untitled'}</div>
                  <div className="text-muted-foreground text-xs">{post.slug || 'no locale content yet'}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="border-input bg-background rounded border px-2 py-1"
                    value={post.type}
                    onChange={(event) =>
                      updatePlacement.mutate({
                        siteId,
                        sitePostId: post.sitePostId,
                        type: event.target.value,
                      })
                    }
                  >
                    <option value="guide">guide</option>
                    <option value="article">article</option>
                    <option value="update">update</option>
                    <option value="page">page</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="border-input bg-background rounded border px-2 py-1"
                    value={post.status}
                    onChange={(event) =>
                      updatePlacement.mutate({
                        siteId,
                        sitePostId: post.sitePostId,
                        status: event.target.value,
                      })
                    }
                  >
                    <option value="draft">draft</option>
                    <option value="published">published</option>
                    <option value="archived">archived</option>
                  </select>
                </td>
                <td className="px-4 py-3">{post.contentStatus || 'missing'}</td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={post.indexable}
                    onChange={(event) =>
                      updatePlacement.mutate({
                        siteId,
                        sitePostId: post.sitePostId,
                        indexable: event.target.checked,
                      })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={post.featured}
                    onChange={(event) =>
                      updatePlacement.mutate({
                        siteId,
                        sitePostId: post.sitePostId,
                        featured: event.target.checked,
                      })
                    }
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="underline" onClick={() => setEditing(post)}>
                    Edit content
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <section className="bg-card border-border space-y-5 rounded-xl border p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Edit {locale} content</h2>
              <p className="text-muted-foreground text-sm">{editing.type} · {editing.sitePostId}</p>
            </div>
            <button className="text-sm underline" onClick={() => setEditing(null)}>
              Close
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(['slug', 'title', 'metaTitle', 'metaDescription', 'imageUrl'] as const).map((field) => (
              <label key={field} className="space-y-1.5 text-sm">
                <span className="font-medium">{field}</span>
                <input
                  className="border-input bg-background h-10 w-full rounded-md border px-3"
                  value={content[field]}
                  onChange={(event) => setContent((old) => ({ ...old, [field]: event.target.value }))}
                />
              </label>
            ))}
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Content status</span>
              <select
                className="border-input bg-background h-10 w-full rounded-md border px-3"
                value={content.status}
                onChange={(event) => setContent((old) => ({ ...old, status: event.target.value }))}
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </label>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Description</span>
            <textarea
              className="border-input bg-background min-h-24 w-full rounded-md border p-3"
              value={content.description}
              onChange={(event) => setContent((old) => ({ ...old, description: event.target.value }))}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Markdown content</span>
            <textarea
              className="border-input bg-background min-h-96 w-full rounded-md border p-3 font-mono text-sm"
              value={content.content}
              onChange={(event) => setContent((old) => ({ ...old, content: event.target.value }))}
            />
          </label>

          <button
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            disabled={!content.slug || !content.title || saveContent.isPending}
            onClick={() => saveContent.mutate()}
          >
            Save locale content
          </button>
        </section>
      ) : null}
    </div>
  );
}
