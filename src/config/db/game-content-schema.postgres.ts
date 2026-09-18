import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { site } from './game-schema';

const table = pgTable;

// PostgreSQL compatibility copy of the site-scoped editorial content schema.
// D1/SQLite remains the V1 first-class runtime.
export const siteLocale = table(
  'site_locale',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => site.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    status: text('status').notNull().default('draft'),
    title: text('title'),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    intro: text('intro'),
    content: text('content'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('uq_site_locale').on(t.siteId, t.locale),
    index('idx_site_locale_status').on(t.siteId, t.status),
  ]
);

export const sitePost = table(
  'site_post',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => site.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('article'),
    status: text('status').notNull().default('draft'),
    indexable: boolean('indexable').notNull().default(false),
    featured: boolean('featured').notNull().default(false),
    authorName: text('author_name'),
    authorImage: text('author_image'),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('idx_site_post_site_type_status').on(t.siteId, t.type, t.status),
    index('idx_site_post_site_indexable').on(t.siteId, t.indexable, t.status),
    index('idx_site_post_site_featured').on(t.siteId, t.featured, t.status),
  ]
);

export const sitePostLocale = table(
  'site_post_locale',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => site.id, { onDelete: 'cascade' }),
    sitePostId: text('site_post_id')
      .notNull()
      .references(() => sitePost.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    slug: text('slug').notNull(),
    status: text('status').notNull().default('draft'),
    title: text('title').notNull(),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    description: text('description'),
    imageUrl: text('image_url'),
    content: text('content'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('uq_site_post_locale').on(t.sitePostId, t.locale),
    uniqueIndex('uq_site_post_locale_slug').on(t.siteId, t.locale, t.slug),
    index('idx_site_post_locale_lookup').on(t.siteId, t.locale, t.status),
  ]
);

export type SiteLocale = typeof siteLocale.$inferSelect;
export type NewSiteLocale = typeof siteLocale.$inferInsert;
export type SitePost = typeof sitePost.$inferSelect;
export type NewSitePost = typeof sitePost.$inferInsert;
export type SitePostLocale = typeof sitePostLocale.$inferSelect;
export type NewSitePostLocale = typeof sitePostLocale.$inferInsert;