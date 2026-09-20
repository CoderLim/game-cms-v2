import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getCurrentSiteContext } from '@/modules/sites/service';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => {
        if (envConfigs.deploy_env !== 'production') {
          return new Response('User-agent: *\nDisallow: /\n', {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          });
        }

        const site = await getCurrentSiteContext();
        const body = [
          'User-agent: *',
          'Allow: /',
          'Disallow: /admin',
          'Disallow: /api/',
          '',
          `Sitemap: ${siteOrigin(site.domain)}/sitemap.xml`,
          '',
        ].join('\n');

        return new Response(body, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=1800',
          },
        });
      },
    },
  },
});
