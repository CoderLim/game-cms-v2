import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

import { apiGet, apiPut, type PageResult } from '@/lib/api-client';

interface SiteRow {
  id: string;
  name: string;
  domain: string;
}

interface SiteSettingsPayload {
  analytics: string;
  ads: string;
  navigation: string;
  footer: string;
  game_player: string;
  social_links: string;
}

const EMPTY_SETTINGS: SiteSettingsPayload = {
  analytics: '',
  ads: '',
  navigation: '',
  footer: '',
  game_player: '',
  social_links: '',
};

const labels: Record<keyof SiteSettingsPayload, string> = {
  analytics: 'Analytics JSON',
  ads: 'Ads JSON',
  navigation: 'Navigation JSON',
  footer: 'Footer JSON',
  game_player: 'Game player JSON',
  social_links: 'Social links JSON',
};

const examples: Record<keyof SiteSettingsPayload, string> = {
  analytics: `{
  "gaId": "G-XXXXXXXXXX",
  "clarityId": "abcdef1234"
}`,
  ads: `{
  "enabled": true,
  "adsenseClient": "ca-pub-1234567890123456",
  "slots": {
    "gameTop": "1234567890",
    "gameBottom": "0987654321"
  }
}`,
  navigation: `[
  { "label": "Guides", "href": "/guides" },
  { "label": "Blog", "href": "/blog" }
]`,
  footer: `{
  "description": "Play browser games and discover guides."
}`,
  game_player: `{
  "allowFullscreen": true,
  "autoplay": false
}`,
  social_links: `[
  { "name": "YouTube", "url": "https://youtube.com/..." }
]`,
};

export const Route = createFileRoute('/admin/site-settings')({
  component: SiteSettingsPage,
});

function SiteSettingsPage() {
  const queryClient = useQueryClient();
  const [siteId, setSiteId] = useState('');
  const [settings, setSettings] = useState<SiteSettingsPayload>(EMPTY_SETTINGS);

  const sites = useQuery({
    queryKey: ['admin-game-sites'],
    queryFn: () =>
      apiGet<PageResult<SiteRow>>('/api/admin/game-sites?page=1&pageSize=100'),
  });

  useEffect(() => {
    if (!siteId && sites.data?.items[0]) setSiteId(sites.data.items[0].id);
  }, [siteId, sites.data]);

  const siteSettings = useQuery({
    queryKey: ['admin-site-settings', siteId],
    enabled: Boolean(siteId),
    queryFn: () =>
      apiGet<SiteSettingsPayload>(
        `/api/admin/site-settings?siteId=${encodeURIComponent(siteId)}`
      ),
  });

  useEffect(() => {
    if (siteSettings.data) {
      setSettings({ ...EMPTY_SETTINGS, ...siteSettings.data });
    }
  }, [siteSettings.data]);

  const saveSetting = useMutation({
    mutationFn: ({ key, value }: { key: keyof SiteSettingsPayload; value: string }) =>
      apiPut('/api/admin/site-settings', { siteId, key, value }),
    onSuccess: () => {
      toast.success('Site setting saved');
      queryClient.invalidateQueries({ queryKey: ['admin-site-settings', siteId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pretty = (key: keyof SiteSettingsPayload) => {
    const value = settings[key];
    if (!value) return;
    try {
      setSettings((current) => ({
        ...current,
        [key]: JSON.stringify(JSON.parse(value), null, 2),
      }));
    } catch {
      toast.error(`${labels[key]} is not valid JSON`);
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Site Settings</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
          Public per-site configuration only. Never store API keys, database credentials,
          auth secrets, or R2 secret keys here; those belong in Worker secrets.
        </p>
      </div>

      <label className="block max-w-xl space-y-1.5 text-sm">
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

      <div className="grid gap-5 xl:grid-cols-2">
        {(Object.keys(labels) as Array<keyof SiteSettingsPayload>).map((key) => (
          <section key={key} className="bg-card border-border rounded-xl border p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">{labels[key]}</h2>
              <button
                type="button"
                onClick={() => pretty(key)}
                className="border-border rounded-md border px-2.5 py-1 text-xs"
              >
                Format JSON
              </button>
            </div>
            <textarea
              rows={key === 'navigation' || key === 'social_links' ? 14 : 10}
              className="border-input bg-background w-full rounded-md border p-3 font-mono text-xs leading-5"
              placeholder={examples[key]}
              value={settings[key]}
              onChange={(event) =>
                setSettings((current) => ({ ...current, [key]: event.target.value }))
              }
            />
            <details className="text-muted-foreground mt-2 text-xs">
              <summary className="cursor-pointer">Example</summary>
              <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-3 whitespace-pre-wrap">
                {examples[key]}
              </pre>
            </details>
            <button
              type="button"
              disabled={!siteId || saveSetting.isPending}
              onClick={() => saveSetting.mutate({ key, value: settings[key] })}
              className="bg-primary text-primary-foreground mt-3 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Save
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}
