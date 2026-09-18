import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

import { apiGet, apiPost, type PageResult } from '@/lib/api-client';

interface SiteRow {
  id: string;
  key: string;
  domain: string;
  name: string;
  status: string;
  defaultLocale: string;
  enabledLocales: string;
}

export const Route = createFileRoute('/admin/game-sites')({
  component: GameSitesPage,
});

function GameSitesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    key: '',
    domain: '',
    name: '',
    defaultLocale: 'en',
    enabledLocales: 'en',
  });

  const sites = useQuery({
    queryKey: ['admin-game-sites'],
    queryFn: () =>
      apiGet<PageResult<SiteRow>>('/api/admin/game-sites?page=1&pageSize=100'),
  });

  const createSite = useMutation({
    mutationFn: () =>
      apiPost('/api/admin/game-sites', {
        ...form,
        enabledLocales: form.enabledLocales
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success('Site created');
      setForm({
        key: '',
        domain: '',
        name: '',
        defaultLocale: 'en',
        enabledLocales: 'en',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-game-sites'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Game Sites</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Each site is a logical SEO property. Deployments resolve a site with SITE_KEY.
        </p>
      </div>

      <form
        className="bg-card border-border grid gap-4 rounded-xl border p-5 md:grid-cols-2 xl:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.key || !form.domain || !form.name) {
            toast.error('Key, domain and name are required');
            return;
          }
          createSite.mutate();
        }}
      >
        {[
          ['key', 'Site key', 'driftbossgame'],
          ['domain', 'Domain', 'driftbossgame.org'],
          ['name', 'Site name', 'Drift Boss'],
          ['defaultLocale', 'Default locale', 'en'],
          ['enabledLocales', 'Locales (comma separated)', 'en,es,de'],
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
            disabled={createSite.isPending}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {createSite.isPending ? 'Creating…' : 'Create site'}
          </button>
        </div>
      </form>

      <div className="border-border overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Locale</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(sites.data?.items || []).map((site) => (
              <tr key={site.id} className="border-border border-t">
                <td className="px-4 py-3 font-medium">{site.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{site.key}</td>
                <td className="px-4 py-3">{site.domain}</td>
                <td className="px-4 py-3">{site.defaultLocale}</td>
                <td className="px-4 py-3">{site.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sites.isLoading && !sites.data?.items.length ? (
          <div className="text-muted-foreground p-8 text-center text-sm">No sites yet.</div>
        ) : null}
      </div>
    </div>
  );
}
