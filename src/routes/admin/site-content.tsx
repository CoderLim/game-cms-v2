import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

import { apiGet, apiPut, type PageResult } from '@/lib/api-client';

interface SiteRow {
  id: string;
  name: string;
  domain: string;
  defaultLocale?: string;
  enabledLocales?: string;
}

interface SiteContentRow {
  id: string;
  siteId: string;
  locale: string;
  status: string;
  title: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  intro: string | null;
  content: string | null;
}

const emptyContent = {
  status: 'draft',
  title: '',
  metaTitle: '',
  metaDescription: '',
  intro: '',
  content: '',
};

export const Route = createFileRoute('/admin/site-content')({
  component: SiteContentPage,
});

function parseLocales(raw?: string) {
  if (!raw) return ['en'];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) && value.length ? value : ['en'];
  } catch {
    return ['en'];
  }
}

function SiteContentPage() {
  const queryClient = useQueryClient();
  const [siteId, setSiteId] = useState('');
  const [locale, setLocale] = useState('en');
  const [form, setForm] = useState(emptyContent);

  const sites = useQuery({
    queryKey: ['admin-game-sites'],
    queryFn: () =>
      apiGet<PageResult<SiteRow>>('/api/admin/game-sites?page=1&pageSize=100'),
  });

  const selectedSite = sites.data?.items.find((site) => site.id === siteId);
  const locales = parseLocales(selectedSite?.enabledLocales);

  useEffect(() => {
    if (!siteId && sites.data?.items[0]) {
      const site = sites.data.items[0];
      setSiteId(site.id);
      setLocale(site.defaultLocale || parseLocales(site.enabledLocales)[0] || 'en');
    }
  }, [siteId, sites.data]);

  useEffect(() => {
    if (!locales.includes(locale)) setLocale(locales[0] || 'en');
  }, [locale, locales]);

  const contentQuery = useQuery({
    queryKey: ['admin-site-content', siteId, locale],
    enabled: Boolean(siteId && locale),
    queryFn: () =>
      apiGet<SiteContentRow | null>(
        `/api/admin/site-content?siteId=${encodeURIComponent(siteId)}&locale=${encodeURIComponent(locale)}`
      ),
  });

  useEffect(() => {
    const row = contentQuery.data;
    setForm(
      row
        ? {
            status: row.status || 'draft',
            title: row.title || '',
            metaTitle: row.metaTitle || '',
            metaDescription: row.metaDescription || '',
            intro: row.intro || '',
            content: row.content || '',
          }
        : emptyContent
    );
  }, [contentQuery.data, siteId, locale]);

  const save = useMutation({
    mutationFn: () =>
      apiPut('/api/admin/site-content', {
        siteId,
        locale,
        ...form,
      }),
    onSuccess: () => {
      toast.success('Site content saved');
      queryClient.invalidateQueries({
        queryKey: ['admin-site-content', siteId, locale],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Site Content & SEO</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
          Homepage-level content is isolated by site and locale. Publish only real
          translations; unpublished locales are not used as SEO fallbacks.
        </p>
      </div>

      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Site</span>
          <select
            className="border-input bg-background h-10 w-full rounded-md border px-3"
            value={siteId}
            onChange={(event) => setSiteId(event.target.value)}
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
          <select
            className="border-input bg-background h-10 w-full rounded-md border px-3"
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          >
            {locales.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="bg-card border-border max-w-5xl space-y-5 rounded-xl border p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Status</span>
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Homepage H1</span>
            <input
              className="border-input bg-background h-10 w-full rounded-md border px-3"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Meta title</span>
          <input
            className="border-input bg-background h-10 w-full rounded-md border px-3"
            value={form.metaTitle}
            onChange={(event) =>
              setForm((current) => ({ ...current, metaTitle: event.target.value }))
            }
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Meta description</span>
          <textarea
            rows={3}
            className="border-input bg-background w-full rounded-md border p-3"
            value={form.metaDescription}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                metaDescription: event.target.value,
              }))
            }
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Intro</span>
          <textarea
            rows={4}
            className="border-input bg-background w-full rounded-md border p-3"
            value={form.intro}
            onChange={(event) =>
              setForm((current) => ({ ...current, intro: event.target.value }))
            }
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Homepage long content (Markdown)</span>
          <textarea
            rows={18}
            className="border-input bg-background w-full rounded-md border p-3 font-mono text-sm leading-6"
            value={form.content}
            onChange={(event) =>
              setForm((current) => ({ ...current, content: event.target.value }))
            }
          />
        </label>

        <button
          type="button"
          disabled={!siteId || save.isPending}
          onClick={() => save.mutate()}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Save site content
        </button>
      </section>
    </div>
  );
}