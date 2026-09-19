import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const table = sqliteTable;
const sqliteNowMs = sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`;

// Game Site Engine domain schema.
// D1/SQLite is the first-class V1 runtime. Keep this schema portable enough
// that the PostgreSQL version can stay structurally equivalent.

export const site = table(
  'game_site',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    domain: text('domain').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    defaultLocale: text('default_locale').notNull().default('en'),
    enabledLocales: text('enabled_locales').notNull().default('["en"]'),
    logoUrl: text('logo_url'),
    faviconUrl: text('favicon_url'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('uq_game_site_key').on(t.key),
    uniqueIndex('uq_game_site_domain').on(t.domain),
    index('idx_game_site_status').on(t.status),
  ]
);

export const game = table(
  'game_catalog',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    embedUrl: text('embed_url'),
    sourceUrl: text('source_url'),
    imageUrl: text('image_url'),
    provider: text('provider'),
    embedType: text('embed_type').notNull().default('iframe'),
    orientation: text('orientation'),
    aspectRatio: text('aspect_ratio'),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('uq_game_catalog_key').on(t.key),
    index('idx_game_catalog_status').on(t.status),
    index('idx_game_catalog_created_at').on(t.createdAt),
  ]
);

export const gameCategory = table(
  'game_category',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex('uq_game_category_key').on(t.key)]
);

export const gameCategoryMap = table(
  'game_category_map',
  {
    id: text('id').primaryKey(),
    gameId: text('game_id')
      .notNull()
      .references(() => game.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => gameCategory.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
  },
  (t) => [
    uniqueIndex('uq_game_category_map').on(t.gameId, t.categoryId),
    index('idx_game_category_map_category').on(t.categoryId),
  ]
);

export const siteGame = table(
  'site_game',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => site.id, { onDelete: 'cascade' }),
    gameId: text('game_id')
      .notNull()
      .references(() => game.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('draft'),
    indexable: integer('indexable', { mode: 'boolean' })
      .notNull()
      .default(false),
    featured: integer('featured', { mode: 'boolean' })
      .notNull()
      .default(false),
    hot: integer('hot', { mode: 'boolean' }).notNull().default(false),
    sortWeight: integer('sort_weight').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    dislikeCount: integer('dislike_count').notNull().default(0),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('uq_site_game_site_game').on(t.siteId, t.gameId),
    index('idx_site_game_site_status').on(t.siteId, t.status),
    index('idx_site_game_site_indexable').on(t.siteId, t.indexable, t.status),
    index('idx_site_game_site_featured').on(t.siteId, t.featured, t.status),
    index('idx_site_game_site_hot').on(t.siteId, t.hot, t.status),
  ]
);

export const siteGameLocale = table(
  'site_game_locale',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => site.id, { onDelete: 'cascade' }),
    siteGameId: text('site_game_id')
      .notNull()
      .references(() => siteGame.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    slug: text('slug').notNull(),
    status: text('status').notNull().default('draft'),
    title: text('title').notNull(),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    intro: text('intro'),
    description: text('description'),
    content: text('content'),
    howToPlay: text('how_to_play'),
    controls: text('controls'),
    features: text('features'),
    faq: text('faq'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('uq_site_game_locale').on(t.siteGameId, t.locale),
    uniqueIndex('uq_site_game_locale_slug').on(t.siteId, t.locale, t.slug),
    index('idx_site_game_locale_lookup').on(t.siteId, t.locale, t.status),
  ]
);

export const siteCategory = table(
  'site_category',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => site.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => gameCategory.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url'),
    status: text('status').notNull().default('draft'),
    indexable: integer('indexable', { mode: 'boolean' })
      .notNull()
      .default(false),
    sortWeight: integer('sort_weight').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('uq_site_category_site_category').on(t.siteId, t.categoryId),
    index('idx_site_category_site_status').on(t.siteId, t.status),
  ]
);

export const siteCategoryLocale = table(
  'site_category_locale',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => site.id, { onDelete: 'cascade' }),
    siteCategoryId: text('site_category_id')
      .notNull()
      .references(() => siteCategory.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    slug: text('slug').notNull(),
    status: text('status').notNull().default('draft'),
    title: text('title').notNull(),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    description: text('description'),
    content: text('content'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('uq_site_category_locale').on(t.siteCategoryId, t.locale),
    uniqueIndex('uq_site_category_locale_slug').on(
      t.siteId,
      t.locale,
      t.slug
    ),
  ]
);

export const siteGameCategory = table(
  'site_game_category',
  {
    id: text('id').primaryKey(),
    siteGameId: text('site_game_id')
      .notNull()
      .references(() => siteGame.id, { onDelete: 'cascade' }),
    siteCategoryId: text('site_category_id')
      .notNull()
      .references(() => siteCategory.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
  },
  (t) => [
    uniqueIndex('uq_site_game_category').on(t.siteGameId, t.siteCategoryId),
    index('idx_site_game_category_category').on(t.siteCategoryId),
  ]
);

export const siteSetting = table(
  'site_setting',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => site.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex('uq_site_setting_key').on(t.siteId, t.key)]
);

export type Site = typeof site.$inferSelect;
export type NewSite = typeof site.$inferInsert;
export type Game = typeof game.$inferSelect;
export type NewGame = typeof game.$inferInsert;
export type GameCategory = typeof gameCategory.$inferSelect;
export type NewGameCategory = typeof gameCategory.$inferInsert;
export type SiteGame = typeof siteGame.$inferSelect;
export type NewSiteGame = typeof siteGame.$inferInsert;
export type SiteGameLocale = typeof siteGameLocale.$inferSelect;
export type NewSiteGameLocale = typeof siteGameLocale.$inferInsert;
export type SiteCategory = typeof siteCategory.$inferSelect;
export type NewSiteCategory = typeof siteCategory.$inferInsert;
export type SiteCategoryLocale = typeof siteCategoryLocale.$inferSelect;
export type NewSiteCategoryLocale = typeof siteCategoryLocale.$inferInsert;
export type SiteSetting = typeof siteSetting.$inferSelect;
export type NewSiteSetting = typeof siteSetting.$inferInsert;
