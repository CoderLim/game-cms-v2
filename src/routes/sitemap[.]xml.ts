import { createFileRoute } from '@tanstack/react-router';

import { listPublished as listCategories } from '@/modules/categories/service';
import { listIndexable as listGames } from '@/modules/site-games/public';
import { getCurrentSiteContext } from '@/modules/sites/service';
import { localizeUrl } from '@/paraglide/runtime.js';

type Alternate = {
  locale: string;
  path: string;
};

type Entry = {
  path: string;
  locale: string;
  alternates: Alternate[];
  lastModified?: Date | string | null;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
};

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

function urlFor(origin: string, path: string, locale: string): string {
  return localizeUrl(`${origin}${path || '/'}`, { locale: locale as any }).href;
}

function entryXml(origin: string, entry: Entry, defaultLocale: string): string {
  const defaultAlternate =
    entry.alternates.find((item) => item.locale === defaultLocale) ||
    entry.alternates[0];
  const alternateXml = entry.alternates
    .map(
      (item) =>
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(item.locale)}" href="${escapeXml(urlFor(origin, item.path, item.locale))}"/>`
    )
    .join('\n');

  const xDefaultXml = defaultAlternate
    ? `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(urlFor(origin, defaultAlternate.path, defaultAlternate.locale))}"/>`
    : '';

  const lastModified = entry.lastModified
    ? new Date(entry.lastModified).toISOString()
    : null;

  return [
    '  <url>',
    `    <loc>${escapeXml(urlFor(origin, entry.path, entry.locale))}</loc>`,
    alternateXml,
    xDefaultXml,
    lastModified ? `    <lastmod>${lastModified}</lastmod>` : null,
    `    <changefreq>${entry.changeFrequency}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const site = await getCurrentSiteContext();
        const origin = siteOrigin(site.domain);

        const localeData = await Promise.all(
          site.enabledLocales.map(async (locale) => {
            const [games, categories] = await Promise.all([
              listGames({ siteId: site.id, locale, limit: 5000 }),
              listCategories({
                siteId: site.id,
                locale,
                indexableOnly: true,
                limit: 500,
              }),
            ]);
            return { locale, games, categories };
          })
        );

        const entries: Entry[] = [
          {
            path: '/',
            locale: site.defaultLocale,
            alternates: site.enabledLocales.map((locale) => ({
              locale,
              path: '/',
            })),
            priority: 1,
            changeFrequency: 'daily',
          },
        ];

        const gameGroups = new Map<
          string,
          {
            alternates: Alternate[];
            updatedAt: Date | string | null;
          }
        >();

        for (const { locale, games } of localeData) {
          for (const game of games) {
            const group = gameGroups.get(game.siteGameId) || {
              alternates: [],
              updatedAt: game.updatedAt,
            };
            group.alternates.push({
              locale,
              path: `/game/${game.slug}`,
            });
            if (
              game.updatedAt &&
              (!group.updatedAt ||
                new Date(game.updatedAt) > new Date(group.updatedAt))
            ) {
              group.updatedAt = game.updatedAt;
            }
            gameGroups.set(game.siteGameId, group);
          }
        }

        for (const group of gameGroups.values()) {
          const primary =
            group.alternates.find(
              (item) => item.locale === site.defaultLocale
            ) || group.alternates[0];
          if (!primary) continue;
          entries.push({
            path: primary.path,
            locale: primary.locale,
            alternates: group.alternates,
            lastModified: group.updatedAt,
            priority: 0.9,
            changeFrequency: 'weekly',
          });
        }

        const categoryGroups = new Map<string, Alternate[]>();
        for (const { locale, categories } of localeData) {
          for (const category of categories) {
            const alternates = categoryGroups.get(category.siteCategoryId) || [];
            alternates.push({
              locale,
              path: `/category/${category.slug}`,
            });
            categoryGroups.set(category.siteCategoryId, alternates);
          }
        }

        for (const alternates of categoryGroups.values()) {
          const primary =
            alternates.find((item) => item.locale === site.defaultLocale) ||
            alternates[0];
          if (!primary) continue;
          entries.push({
            path: primary.path,
            locale: primary.locale,
            alternates,
            priority: 0.8,
            changeFrequency: 'weekly',
          });
        }

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          ...entries.map((entry) => entryXml(origin, entry, site.defaultLocale)),
          '</urlset>',
          '',
        ].join('\n');

        return new Response(xml, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400',
          },
        });
      },
    },
  },
});
