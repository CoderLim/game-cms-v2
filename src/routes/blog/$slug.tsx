import { createFileRoute, notFound } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';

import { SiteHeader } from '@/components/game-site/site-header';
import { MarkdownContent } from '@/components/markdown-content';
import { StructuredData } from '@/components/seo/structured-data';
import { formatPostDate } from '@/content/posts';
import { listPublished as listCategories } from '@/modules/categories/service';
import {
  getPublishedBySlug,
  listPublishedLocales,
  SitePostType,
} from '@/modules/site-posts/service';
import { getCurrentSiteContext } from '@/modules/sites/service';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    const site = await getCurrentSiteContext();
    const locale = getLocale();
    if (!site.enabledLocales.includes(locale)) throw notFound();

    const post =
      (await getPublishedBySlug({
        siteId: site.id,
        locale,
        slug: params.slug,
        type: SitePostType.ARTICLE,
      })) ||
      (await getPublishedBySlug({
        siteId: site.id,
        locale,
        slug: params.slug,
        type: SitePostType.UPDATE,
      }));

    if (!post) throw notFound();

    const [categories, availableLocales] = await Promise.all([
      listCategories({ siteId: site.id, locale, limit: 8 }),
      listPublishedLocales({ siteId: site.id, sitePostId: post.sitePostId }),
    ]);

    const origin = siteOrigin(site.domain);
    const canonical = localizeUrl(`${origin}/blog/${post.slug}`, {
      locale: locale as any,
    }).href;
    const description =
      post.metaDescription || post.description || `${post.title} on ${site.name}.`;

    return {
      site,
      locale,
      post,
      categories,
      availableLocales,
      canonical,
      description,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const {
      site,
      post,
      canonical,
      description,
      availableLocales,
    } = loaderData;
    const origin = siteOrigin(site.domain);
    const title = post.metaTitle || `${post.title} | ${site.name}`;
    const defaultEntry =
      availableLocales.find((entry) => entry.locale === site.defaultLocale) ||
      availableLocales[0];

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonical },
        ...(post.imageUrl
          ? [{ property: 'og:image', content: post.imageUrl }]
          : []),
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        ...(post.imageUrl
          ? [{ name: 'twitter:image', content: post.imageUrl }]
          : []),
      ],
      links: [
        { rel: 'canonical', href: canonical },
        ...availableLocales.map((entry) => ({
          rel: 'alternate',
          hrefLang: entry.locale,
          href: localizeUrl(`${origin}/blog/${entry.slug}`, {
            locale: entry.locale as any,
          }).href,
        })),
        ...(defaultEntry
          ? [
              {
                rel: 'alternate',
                hrefLang: 'x-default',
                href: localizeUrl(`${origin}/blog/${defaultEntry.slug}`, {
                  locale: defaultEntry.locale as any,
                }).href,
              },
            ]
          : []),
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { site, locale, post, categories, canonical, description } =
    Route.useLoaderData();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': post.type === SitePostType.UPDATE ? 'NewsArticle' : 'Article',
    headline: post.title,
    url: canonical,
    description,
    ...(post.imageUrl ? { image: post.imageUrl } : {}),
    ...(post.publishedAt
      ? { datePublished: new Date(post.publishedAt).toISOString() }
      : {}),
    ...(post.updatedAt
      ? { dateModified: new Date(post.updatedAt).toISOString() }
      : {}),
    ...(post.authorName
      ? {
          author: {
            '@type': 'Person',
            name: post.authorName,
          },
        }
      : {}),
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: siteOrigin(site.domain),
    },
    mainEntityOfPage: canonical,
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <StructuredData data={structuredData} />
      <SiteHeader siteName={site.name} categories={categories} />
      <main className="px-4 py-10 md:px-6 md:py-14">
        <article className="mx-auto max-w-3xl">
          <header className="border-border mb-8 border-b pb-7">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {post.title}
            </h1>
            {post.description ? (
              <p className="text-muted-foreground mt-3 text-lg leading-7">
                {post.description}
              </p>
            ) : null}
            <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-4 text-sm">
              {post.publishedAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  {formatPostDate(post.publishedAt, locale)}
                </span>
              ) : null}
              {post.authorName ? <span>{post.authorName}</span> : null}
            </div>
          </header>

          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt={post.title}
              className="border-border mb-8 aspect-video w-full rounded-2xl border object-cover"
            />
          ) : null}

          <MarkdownContent content={post.content || ''} />
        </article>
      </main>
    </div>
  );
}
