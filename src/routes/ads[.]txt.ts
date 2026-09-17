import { createFileRoute } from '@tanstack/react-router';

import { getPublicSiteConfig } from '@/modules/site-settings/service';
import { getCurrentSiteContext } from '@/modules/sites/service';

const ADSENSE_CLIENT = /^ca-pub-\d+$/i;

export const Route = createFileRoute('/ads.txt')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const site = await getCurrentSiteContext();
          const { ads } = await getPublicSiteConfig(site.id);
          const client =
            typeof ads.adsenseClient === 'string' ? ads.adsenseClient.trim() : '';

          if (!ADSENSE_CLIENT.test(client)) {
            return new Response('', {
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
          }

          // AdSense UI uses `ca-pub-...`, while ads.txt requires `pub-...`.
          const pubId = client.replace(/^ca-/i, '');
          const body = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;

          return new Response(body, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'public, max-age=300, s-maxage=3600',
            },
          });
        } catch {
          // A missing SITE_KEY/site row must never leak another site's publisher id.
          return new Response('', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      },
    },
  },
});
