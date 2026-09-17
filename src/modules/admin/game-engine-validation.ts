import { z } from 'zod';

const identifier = z.string().trim().min(1).max(128);
const locale = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .regex(/^[A-Za-z0-9-]+$/, 'invalid locale');
const slug = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/, 'slug must be URL-safe');
const optionalText = (max: number) => z.string().max(max).nullish();
const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) =>
      value.length === 0 ||
      /^https?:\/\//i.test(value) ||
      value.startsWith('/'),
    'must be an http(s) URL or absolute path'
  )
  .nullish();

export const siteStatusSchema = z.enum(['active', 'inactive', 'archived']);
export const gameStatusSchema = z.enum(['active', 'inactive', 'archived']);
export const publishStatusSchema = z.enum(['draft', 'published', 'archived']);
export const postTypeSchema = z.enum(['article', 'guide', 'update', 'page']);

export const createSiteSchema = z.object({
  key: identifier.regex(
    /^[a-z0-9-]+$/,
    'key must use lowercase letters, numbers and hyphens'
  ),
  domain: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .transform((value) =>
      value.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase()
    )
    .refine((value) => !value.includes('/') && value.includes('.'), 'invalid domain'),
  name: z.string().trim().min(1).max(120),
  defaultLocale: locale.default('en'),
  enabledLocales: z.array(locale).min(1).max(20).optional(),
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
  status: siteStatusSchema.optional(),
});

export const updateSiteSchema = createSiteSchema.partial().extend({
  id: identifier,
});

export const createGameSchema = z.object({
  key: identifier.regex(
    /^[a-z0-9-]+$/,
    'key must use lowercase letters, numbers and hyphens'
  ),
  title: z.string().trim().min(1).max(180),
  description: optionalText(20_000),
  embedUrl: optionalUrl,
  sourceUrl: optionalUrl,
  imageUrl: optionalUrl,
  provider: optionalText(120),
  embedType: z.enum(['iframe', 'external_url', 'r2_html5']).optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).nullish(),
  aspectRatio: optionalText(32),
  status: gameStatusSchema.optional(),
});

export const updateGameSchema = createGameSchema.partial().extend({
  id: identifier,
});

export const attachSiteGameSchema = z.object({
  siteId: identifier,
  gameId: identifier,
  status: publishStatusSchema.optional(),
  indexable: z.boolean().optional(),
  featured: z.boolean().optional(),
  hot: z.boolean().optional(),
  sortWeight: z.number().int().min(-1_000_000).max(1_000_000).optional(),
});

export const updateSiteGameSchema = attachSiteGameSchema
  .omit({ gameId: true })
  .partial()
  .extend({ id: identifier, siteId: identifier.optional() });

export const siteGameContentSchema = z.object({
  siteId: identifier,
  siteGameId: identifier,
  locale,
  slug,
  title: z.string().trim().min(1).max(240),
  status: publishStatusSchema.optional(),
  metaTitle: optionalText(300),
  metaDescription: optionalText(1000),
  intro: optionalText(20_000),
  description: optionalText(100_000),
  content: optionalText(500_000),
  howToPlay: optionalText(100_000),
  controls: optionalText(100_000),
  features: optionalText(100_000),
  faq: optionalText(200_000),
});

export const attachSiteCategorySchema = z.object({
  siteId: identifier,
  categoryId: identifier,
  status: publishStatusSchema.optional(),
  indexable: z.boolean().optional(),
  sortWeight: z.number().int().min(-1_000_000).max(1_000_000).optional(),
});

export const updateSiteCategorySchema = attachSiteCategorySchema
  .omit({ categoryId: true })
  .partial()
  .extend({ id: identifier, siteId: identifier });

export const siteCategoryContentSchema = z.object({
  siteId: identifier,
  siteCategoryId: identifier,
  locale,
  slug,
  title: z.string().trim().min(1).max(240),
  status: publishStatusSchema.optional(),
  metaTitle: optionalText(300),
  metaDescription: optionalText(1000),
  description: optionalText(100_000),
  content: optionalText(500_000),
});

const postLocaleFields = {
  locale: locale.optional(),
  slug: slug.optional(),
  title: z.string().trim().min(1).max(240).optional(),
  contentStatus: publishStatusSchema.optional(),
  metaTitle: optionalText(300),
  metaDescription: optionalText(1000),
  description: optionalText(20_000),
  imageUrl: optionalUrl,
  content: optionalText(1_000_000),
};

export const createSitePostSchema = z
  .object({
    siteId: identifier,
    type: postTypeSchema.optional(),
    status: publishStatusSchema.optional(),
    indexable: z.boolean().optional(),
    featured: z.boolean().optional(),
    authorName: optionalText(180),
    ...postLocaleFields,
  })
  .superRefine((value, ctx) => {
    const supplied = [value.locale, value.slug, value.title].filter(Boolean).length;
    if (supplied !== 0 && supplied !== 3) {
      ctx.addIssue({
        code: 'custom',
        message: 'locale, slug and title must be supplied together',
        path: ['locale'],
      });
    }
  });

export const updateSitePostSchema = z
  .object({
    siteId: identifier,
    sitePostId: identifier,
    type: postTypeSchema.optional(),
    status: publishStatusSchema.optional(),
    indexable: z.boolean().optional(),
    featured: z.boolean().optional(),
    authorName: optionalText(180),
    ...postLocaleFields,
  })
  .superRefine((value, ctx) => {
    const supplied = [value.locale, value.slug, value.title].filter(Boolean).length;
    if (supplied !== 0 && supplied !== 3) {
      ctx.addIssue({
        code: 'custom',
        message: 'locale, slug and title must be supplied together',
        path: ['locale'],
      });
    }
  });

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const message = result.error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid request: ${message}`);
}
