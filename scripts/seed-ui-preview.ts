import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createClient } from '@libsql/client';
import { and, eq } from 'drizzle-orm';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { v5 as uuidv5 } from 'uuid';

import * as domain from '../src/config/db/game-schema';
import * as contentSchema from '../src/config/db/game-content-schema';

const NAMESPACE = 'f4c48c70-99cb-4cbb-85dc-8f66dbaf7657';
const FIXTURE_PATH = fileURLToPath(
  new URL('./fixtures/driftboss-ui-preview.json', import.meta.url)
);

type Fixture = {
  source: {
    project: string;
    domain: string;
    sampleProfile: string;
    selectedGameKeys: string[];
  };
  site: {
    domain: string;
    site_name: string | null;
    meta_title: string | null;
    meta_desc: string | null;
    seo_content: string | null;
    about_us: string | null;
    contact_us: string | null;
    privacy_policy: string | null;
    terms_of_service: string | null;
    logo_url: string | null;
    favicon_url: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  socialLinks: Array<{ display_name: string; url: string }>;
  games: Array<{
    game_key: string;
    title: string;
    url: string | null;
    image: string | null;
    description: string | null;
    origin_content: string | null;
    video_url: string | null;
    view: number;
    likes_count: number;
    dislikes_count: number;
    created_at: string | null;
  }>;
  gameLocales: Array<{
    game_key: string;
    locale: string;
    meta_title: string | null;
    meta_desc: string | null;
    seo_content: string | null;
    created_at: string | null;
  }>;
  categories: Array<{
    category: string;
    title: string | null;
    description: string | null;
    image_url: string | null;
    created_at: string | null;
  }>;
  categoryLocales: Array<{
    category: string;
    locale: string;
    meta_title: string | null;
    meta_desc: string | null;
    seo_content: string | null;
    created_at: string | null;
  }>;
  categoryMaps: Array<{ game_key: string; category: string }>;
};

const LEGACY_STATIC_ORIGIN = 'https://static.driftbossgame.org';

function portableAssetPath(value: string | null | undefined) {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  for (const origin of [
    LEGACY_STATIC_ORIGIN,
    LEGACY_STATIC_ORIGIN.replace(/^https:/i, 'http:'),
  ]) {
    if (raw === origin) return '/';
    if (raw.startsWith(`${origin}/`)) return raw.slice(origin.length);
  }

  return raw;
}

function portableAssetReferences(value: string | null | undefined) {
  if (!value) return value ?? null;

  let text = value;
  for (const origin of [
    LEGACY_STATIC_ORIGIN,
    LEGACY_STATIC_ORIGIN.replace(/^https:/i, 'http:'),
  ]) {
    text = text.replaceAll(origin, '');
  }
  return text;
}

function id(scope: string, value: string) {
  return uuidv5(`${scope}:${value}`, NAMESPACE);
}

function asDate(value: string | null | undefined) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function siteKey(domainName: string) {
  return domainName
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\.[a-z0-9-]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleFromKey(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getFixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Fixture;
}

async function main() {
  const provider = (process.env.DATABASE_PROVIDER || 'sqlite').toLowerCase();
  if (!['sqlite', 'turso'].includes(provider)) {
    throw new Error(
      `game:seed:ui-preview only targets an isolated SQLite/Turso preview DB; got DATABASE_PROVIDER=${provider}`
    );
  }

  const databaseUrl =
    process.env.DATABASE_URL || 'file:data/ui-wiring-preview.db';
  const fixture = getFixture();
  const client = createClient({ url: databaseUrl });
  const db = drizzleLibsql({ client });

  try {
    const siteId = id('site', fixture.site.domain);
    const siteKeyValue = siteKey(fixture.site.domain);
    const locales = [
      ...new Set([
        'en',
        ...fixture.gameLocales.map((item) => item.locale),
        ...fixture.categoryLocales.map((item) => item.locale),
      ]),
    ];

    await db
      .insert(domain.site)
      .values({
        id: siteId,
        key: siteKeyValue,
        domain: fixture.site.domain,
        name: fixture.site.site_name || 'Drift Boss',
        status: 'active',
        defaultLocale: 'en',
        enabledLocales: JSON.stringify(locales),
        logoUrl: portableAssetPath(fixture.site.logo_url),
        faviconUrl: portableAssetPath(fixture.site.favicon_url),
        createdAt: asDate(fixture.site.created_at),
        updatedAt: asDate(fixture.site.updated_at || fixture.site.created_at),
      })
      .onConflictDoUpdate({
        target: domain.site.id,
        set: {
          key: siteKeyValue,
          domain: fixture.site.domain,
          name: fixture.site.site_name || 'Drift Boss',
          status: 'active',
          defaultLocale: 'en',
          enabledLocales: JSON.stringify(locales),
          logoUrl: portableAssetPath(fixture.site.logo_url),
          faviconUrl: portableAssetPath(fixture.site.favicon_url),
          updatedAt: asDate(fixture.site.updated_at || fixture.site.created_at),
        },
      });

    await db
      .insert(contentSchema.siteLocale)
      .values({
        id: id('site-locale', `${fixture.site.domain}:en`),
        siteId,
        locale: 'en',
        status: 'published',
        title: fixture.site.site_name || 'Drift Boss',
        metaTitle: fixture.site.meta_title,
        metaDescription: fixture.site.meta_desc,
        content: portableAssetReferences(fixture.site.seo_content),
        createdAt: asDate(fixture.site.created_at),
        updatedAt: asDate(fixture.site.updated_at || fixture.site.created_at),
      })
      .onConflictDoUpdate({
        target: [
          contentSchema.siteLocale.siteId,
          contentSchema.siteLocale.locale,
        ],
        set: {
          status: 'published',
          title: fixture.site.site_name || 'Drift Boss',
          metaTitle: fixture.site.meta_title,
          metaDescription: fixture.site.meta_desc,
          content: portableAssetReferences(fixture.site.seo_content),
          updatedAt: asDate(fixture.site.updated_at || fixture.site.created_at),
        },
      });

    const pageDefs = [
      { field: 'about_us', slug: 'about-us', title: 'About Us' },
      { field: 'contact_us', slug: 'contact-us', title: 'Contact Us' },
      {
        field: 'privacy_policy',
        slug: 'privacy-policy',
        title: 'Privacy Policy',
      },
      {
        field: 'terms_of_service',
        slug: 'terms-of-service',
        title: 'Terms of Service',
      },
    ] as const;

    for (const page of pageDefs) {
      const pageContent = fixture.site[page.field];
      if (!pageContent?.trim()) continue;

      const postId = id(
        'site-post',
        `${fixture.site.domain}:page:${page.slug}`
      );
      await db
        .insert(contentSchema.sitePost)
        .values({
          id: postId,
          siteId,
          type: 'page',
          status: 'published',
          indexable: true,
          featured: false,
          publishedAt: asDate(fixture.site.created_at),
          createdAt: asDate(fixture.site.created_at),
          updatedAt: asDate(
            fixture.site.updated_at || fixture.site.created_at
          ),
        })
        .onConflictDoUpdate({
          target: contentSchema.sitePost.id,
          set: {
            status: 'published',
            indexable: true,
            updatedAt: asDate(
              fixture.site.updated_at || fixture.site.created_at
            ),
          },
        });

      await db
        .insert(contentSchema.sitePostLocale)
        .values({
          id: id(
            'site-post-locale',
            `${fixture.site.domain}:page:${page.slug}:en`
          ),
          siteId,
          sitePostId: postId,
          locale: 'en',
          slug: page.slug,
          status: 'published',
          title: page.title,
          content: portableAssetReferences(pageContent),
          createdAt: asDate(fixture.site.created_at),
          updatedAt: asDate(
            fixture.site.updated_at || fixture.site.created_at
          ),
        })
        .onConflictDoUpdate({
          target: [
            contentSchema.sitePostLocale.sitePostId,
            contentSchema.sitePostLocale.locale,
          ],
          set: {
            siteId,
            slug: page.slug,
            status: 'published',
            title: page.title,
            content: portableAssetReferences(pageContent),
            updatedAt: asDate(
              fixture.site.updated_at || fixture.site.created_at
            ),
          },
        });
    }

    const categoryLocaleMap = new Map(
      fixture.categoryLocales.map((item) => [
        `${item.category}:${item.locale}`,
        item,
      ])
    );
    const siteCategoryByKey = new Map<string, string>();

    const categoryPopularity = new Map<string, number>();
    for (const relation of fixture.categoryMaps) {
      categoryPopularity.set(
        relation.category,
        (categoryPopularity.get(relation.category) || 0) + 1
      );
    }

    const sortedCategories = [...fixture.categories].sort(
      (a, b) =>
        (categoryPopularity.get(b.category) || 0) -
          (categoryPopularity.get(a.category) || 0) ||
        a.category.localeCompare(b.category)
    );

    for (const [categoryIndex, category] of sortedCategories.entries()) {
      const categoryId = id('category', category.category);
      const siteCategoryId = id(
        'site-category',
        `${fixture.site.domain}:${category.category}`
      );
      siteCategoryByKey.set(category.category, siteCategoryId);

      await db
        .insert(domain.gameCategory)
        .values({
          id: categoryId,
          key: category.category,
          createdAt: asDate(category.created_at),
          updatedAt: asDate(category.created_at),
        })
        .onConflictDoUpdate({
          target: domain.gameCategory.id,
          set: { key: category.category },
        });

      await db
        .insert(domain.siteCategory)
        .values({
          id: siteCategoryId,
          siteId,
          categoryId,
          imageUrl: portableAssetPath(category.image_url),
          status: 'published',
          indexable: true,
          sortWeight: 1000 - categoryIndex * 10,
          createdAt: asDate(category.created_at),
          updatedAt: asDate(category.created_at),
        })
        .onConflictDoUpdate({
          target: domain.siteCategory.id,
          set: {
            imageUrl: portableAssetPath(category.image_url),
            status: 'published',
            indexable: true,
            sortWeight: 1000 - categoryIndex * 10,
          },
        });

      const availableCategoryLocales = [
        ...new Set([
          'en',
          ...fixture.categoryLocales
            .filter((item) => item.category === category.category)
            .map((item) => item.locale),
        ]),
      ];

      for (const locale of availableCategoryLocales) {
        const seo = categoryLocaleMap.get(`${category.category}:${locale}`);
        await db
          .insert(domain.siteCategoryLocale)
          .values({
            id: id(
              'site-category-locale',
              `${fixture.site.domain}:${category.category}:${locale}`
            ),
            siteId,
            siteCategoryId,
            locale,
            slug: category.category,
            status: 'published',
            title: category.title || titleFromKey(category.category),
            metaTitle: seo?.meta_title || null,
            metaDescription: seo?.meta_desc || null,
            description:
              locale === 'en' ? category.description || null : null,
            content: portableAssetReferences(seo?.seo_content) || null,
            createdAt: asDate(seo?.created_at || category.created_at),
            updatedAt: asDate(seo?.created_at || category.created_at),
          })
          .onConflictDoUpdate({
            target: [
              domain.siteCategoryLocale.siteCategoryId,
              domain.siteCategoryLocale.locale,
            ],
            set: {
              siteId,
              slug: category.category,
              status: 'published',
              title: category.title || titleFromKey(category.category),
              metaTitle: seo?.meta_title || null,
              metaDescription: seo?.meta_desc || null,
              description:
                locale === 'en' ? category.description || null : null,
              content: portableAssetReferences(seo?.seo_content) || null,
            },
          });
      }
    }

    const gameLocaleMap = new Map(
      fixture.gameLocales.map((item) => [
        `${item.game_key}:${item.locale}`,
        item,
      ])
    );

    const previewOrder = [
      'drift-boss',
      'klotski',
      'enhypen-escape',
      'mahjong-link',
      'count-masters',
      'labubu-clicker',
      'space-waves',
      'snake-clash',
      'bubble-trouble',
      'baseball-bros',
      'dinosaur-game',
      'road-rash',
      'survival-race',
      'bloxdio',
      'electron-dash',
      'head-soccer',
      'geometry-vibes',
      'geometry-dash-spam',
      'slow-roads',
      'capybara-clicker-2',
      'chill-guy-clicker',
      'escape-road-2',
      'poor-bunny',
      'purble-place',
    ];
    const orderIndex = new Map(
      previewOrder.map((key, index) => [key, index])
    );
    const hotKeys = new Set(previewOrder.slice(1, 9));

    for (const game of fixture.games) {
      const gameId = id('game', game.game_key);
      const siteGameId = id(
        'site-game',
        `${fixture.site.domain}:${game.game_key}`
      );
      const index = orderIndex.get(game.game_key) ?? previewOrder.length;

      await db
        .insert(domain.game)
        .values({
          id: gameId,
          key: game.game_key,
          title: game.title,
          description: game.description,
          embedUrl: portableAssetPath(game.url),
          sourceUrl: portableAssetPath(game.video_url),
          imageUrl: portableAssetPath(game.image),
          provider: 'legacy-driftboss',
          embedType: 'iframe',
          status: 'active',
          createdAt: asDate(game.created_at),
          updatedAt: asDate(game.created_at),
        })
        .onConflictDoUpdate({
          target: domain.game.id,
          set: {
            key: game.game_key,
            title: game.title,
            description: game.description,
            embedUrl: portableAssetPath(game.url),
            sourceUrl: portableAssetPath(game.video_url),
            imageUrl: portableAssetPath(game.image),
            provider: 'legacy-driftboss',
            embedType: 'iframe',
            status: 'active',
          },
        });

      await db
        .insert(domain.siteGame)
        .values({
          id: siteGameId,
          siteId,
          gameId,
          status: 'published',
          indexable: true,
          featured: game.game_key === 'drift-boss',
          hot: hotKeys.has(game.game_key),
          sortWeight: 2400 - index * 10,
          viewCount: game.view || 0,
          likeCount: game.likes_count || 0,
          dislikeCount: game.dislikes_count || 0,
          publishedAt: asDate(game.created_at),
          createdAt: asDate(game.created_at),
          updatedAt: asDate(game.created_at),
        })
        .onConflictDoUpdate({
          target: domain.siteGame.id,
          set: {
            status: 'published',
            indexable: true,
            featured: game.game_key === 'drift-boss',
            hot: hotKeys.has(game.game_key),
            sortWeight: 2400 - index * 10,
            viewCount: game.view || 0,
            likeCount: game.likes_count || 0,
            dislikeCount: game.dislikes_count || 0,
          },
        });

      const gameLocales = fixture.gameLocales.filter(
        (item) => item.game_key === game.game_key
      );
      for (const localeRow of gameLocales) {
        await db
          .insert(domain.siteGameLocale)
          .values({
            id: id(
              'site-game-locale',
              `${fixture.site.domain}:${game.game_key}:${localeRow.locale}`
            ),
            siteId,
            siteGameId,
            locale: localeRow.locale,
            slug: game.game_key,
            status: 'published',
            title: game.title,
            metaTitle: localeRow.meta_title,
            metaDescription: localeRow.meta_desc,
            description:
              localeRow.locale === 'en' ? game.description : null,
            content: portableAssetReferences(localeRow.seo_content),
            createdAt: asDate(localeRow.created_at || game.created_at),
            updatedAt: asDate(localeRow.created_at || game.created_at),
          })
          .onConflictDoUpdate({
            target: [
              domain.siteGameLocale.siteGameId,
              domain.siteGameLocale.locale,
            ],
            set: {
              siteId,
              slug: game.game_key,
              status: 'published',
              title: game.title,
              metaTitle: localeRow.meta_title,
              metaDescription: localeRow.meta_desc,
              description:
                localeRow.locale === 'en' ? game.description : null,
              content: portableAssetReferences(localeRow.seo_content),
            },
          });
      }

      for (const relation of fixture.categoryMaps.filter(
        (item) => item.game_key === game.game_key
      )) {
        const categoryId = id('category', relation.category);
        const siteCategoryId = siteCategoryByKey.get(relation.category);
        if (!siteCategoryId) {
          throw new Error(
            `Missing site category for ${game.game_key} -> ${relation.category}`
          );
        }

        await db
          .insert(domain.gameCategoryMap)
          .values({
            id: id(
              'game-category-map',
              `${game.game_key}:${relation.category}`
            ),
            gameId,
            categoryId,
          })
          .onConflictDoNothing({
            target: [
              domain.gameCategoryMap.gameId,
              domain.gameCategoryMap.categoryId,
            ],
          });

        await db
          .insert(domain.siteGameCategory)
          .values({
            id: id(
              'site-game-category',
              `${fixture.site.domain}:${game.game_key}:${relation.category}`
            ),
            siteGameId,
            siteCategoryId,
          })
          .onConflictDoNothing({
            target: [
              domain.siteGameCategory.siteGameId,
              domain.siteGameCategory.siteCategoryId,
            ],
          });
      }
    }

    await db
      .insert(domain.siteSetting)
      .values({
        id: id('site-setting', `${fixture.site.domain}:social_links`),
        siteId,
        key: 'social_links',
        value: JSON.stringify(
          fixture.socialLinks.map((item) => ({
            displayName: item.display_name,
            url: item.url,
          }))
        ),
      })
      .onConflictDoUpdate({
        target: [domain.siteSetting.siteId, domain.siteSetting.key],
        set: {
          value: JSON.stringify(
            fixture.socialLinks.map((item) => ({
              displayName: item.display_name,
              url: item.url,
            }))
          ),
        },
      });

    console.log('UI preview fixture imported successfully.');
    console.log(`DATABASE_URL=${databaseUrl}`);
    console.log(`SITE_KEY=${siteKeyValue}`);
    console.log(`Games=${fixture.games.length}`);
    console.log(`Categories=${fixture.categories.length}`);
    console.log(
      `Locales=${locales.join(',')} (Drift Boss includes the zh migration fixture)`
    );
    console.log('Featured=drift-boss');
    console.log(`Hot=${[...hotKeys].join(',')}`);
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
