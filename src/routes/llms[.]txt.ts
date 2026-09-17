import { createFileRoute } from '@tanstack/react-router';

import { listPublished as listCategories } from '@/modules/categories/service';
import { listPublished as listGames } from '@/modules/site-games/service';
import {
  listPublished as listPosts,
  publicPathForPost,
} from '@/modules/site-posts/service';
import { getPublished as getSiteContent } from '@/modules/sites/content';
import { getCurrentSiteContext } from '@/modules/sites/service';
import { localizeUrl } from '@/paraglide/runtime.js';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const site = await getCurrentSiteContext();
          const locale = site.defaultLocale;
          const origin = siteOrigin(site.domain);
          const [siteContent, games, categories, posts] = await Promise.all([
            getSiteContent({ siteId: site.id, locale }),
            listGames({ siteId: site.id, locale, limit: 100 }),
            listCategories({
              siteId: site.id,
              locale,
              indexableOnly: true,
              limit: 100,
            }),
            listPosts({
              siteId: site.id,
              locale,
              indexableOnly: true,
              limit: 100,
            }),
          ]);

          const urlFor = (path: string) =>
            localizeUrl(`${origin}${path}`, { locale: locale as any }).href;
          const description =
            siteContent?.metaDescription ||
            siteContent?.intro ||
            `Play browser games and read guides on ${site.name}.`;

          const lines: string[] = [
            `# ${site.name}`,
            '',
            `> ${description}`,
            '',
            `- [Home](${urlFor('/')}): ${description}`,
          ];

          if (games.length) {
            lines.push('', '## Games', '');
            for (const game of games) {
              lines.push(`- [${game.title}](${urlFor(`/game/${game.slug}`)})`);
            }
          }

          if (categories.length) {
            lines.push('', '## Categories', '');
            for (const category of categories) {
              lines.push(
                `- [${category.title}](${urlFor(`/category/${category.slug}`)})${category.description ? `: ${category.description}` : ''}`
              );
            }
          }

          if (posts.length) {
            lines.push('', '## Guides and Articles', '');
            for (const post of posts) {
              lines.push(
                `- [${post.title}](${urlFor(publicPathForPost(post.type, post.slug))})${post.description ? `: ${post.description}` : ''}`
              );
            }
          }

          lines.push('');
          return new Response(lines.join('\n'), {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'public, max-age=300, s-maxage=1800',
            },
          });
        } catch {
          return new Response('', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      },
    },
  },
});
