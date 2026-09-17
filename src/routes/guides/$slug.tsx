import { createFileRoute, notFound } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';

import { SiteFooter } from '@/components/game-site/site-footer';
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
import { getPublicSiteConfig } from '@/modules/site-settings/service';
import { getCurrentSiteContext } from '@/modules/sites/service';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

export const Route = createFileRoute('/guides/$slug')({
  loader: async ({ params }) => {
    const site = await getCurrentSiteContext();
    const locale = getLocale();
    if (!site.enabledLocales.includes(locale)) throw notFound();

    const guide = await getPublishedBySlug({
      siteId: site.id,
      locale,
      slug: params.slug,
      type: SitePostType.GUIDE,
    });
    if (!guide) throw notFound();

    const [categories, availableLocales, publicConfig] = await Promise.all([
      listCategories({ siteId: site.id, locale, limit: 8 }),
      listPublishedLocales({ siteId: site.id, sitePostId: guide.sitePostId }),
      getPublicSiteConfig(site.id),
    ]);

    const origin = siteOrigin(site.domain);
    const canonical = localizeUrl(`${origin}/guides/${guide.slug}`, {
      locale: locale as any,
    }).href;
    const description =
      guide.metaDescription ||
      guide.description ||
      `${guide.title} guide on ${site.name}.`;

    return {
      site,
      locale,
      guide,
      categories,
      availableLocales,
      canonical,
      description,
      publicConfig,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const {
      site,
      guide,
      canonical,
      description,
      availableLocales,
    } = loaderData;
    const origin = siteOrigin(site.domain);
    const title = guide.metaTitle || `${guide.title} | ${site.name}`;
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
        ...(guide.imageUrl
          ? [{ property: 'og:image', content: guide.imageUrl }]
          : []),
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        ...(guide.imageUrl
          ? [{ name: 'twitter:image', content: guide.imageUrl }]
          : []),
      ],
      links: [
        { rel: 'canonical', href: canonical },
        ...availableLocales.map((entry) => ({
          rel: 'alternate',
          hrefLang: entry.locale,
          href: localizeUrl(`${origin}/guides/${entry.slug}`, {
            locale: entry.locale as any,
          }).href,
        })),
        ...(defaultEntry
          ? [
              {
                rel: 'alternate',
                hrefLang: 'x-default',
                href: localizeUrl(`${origin}/guides/${defaultEntry.slug}`, {
                  locale: defaultEntry.locale as any,
                }).href,
              },
            ]
          : []),
      ],
    };
  },
  component: GuidePage,
});

function GuidePage() {
  const {
    site,
    locale,
    guide,
    categories,
    canonical,
    description,
    publicConfig,
  } = Route.useLoaderData();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: guide.title,
    url: canonical,
    description,
    ...(guide.imageUrl ? { image: guide.imageUrl } : {}),
    ...(guide.publishedAt
      ? { datePublished: new Date(guide.publishedAt).toISOString() }
      : {}),
    ...(guide.updatedAt
      ? { dateModified: new Date(guide.updatedAt).toISOString() }
      : {}),
    ...(guide.authorName
      ? {
          author: {
            '@type': 'Person',
            name: guide.authorName,
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
            <p className="text-primary mb-2 text-sm font-semibold uppercase tracking-wide">
              Guide
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {guide.title}
            </h1>
            {guide.description ? (
              <p className="text-muted-foreground mt-3 text-lg leading-7">
                {guide.description}
              </p>
            ) : null}
            <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-4 text-sm">
              {guide.publishedAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  {formatPostDate(guide.publishedAt, locale)}
                </span>
              ) : null}
              {guide.authorName ? <span>{guide.authorName}</span> : null}
            </div>
          </header>

          {guide.imageUrl ? (
            <img
              src={guide.imageUrl}
              alt={guide.title}
              className="border-border mb-8 aspect-video w-full rounded-2xl border object-cover"
            />
          ) : null}

          <MarkdownContent content={guide.content || ''} />
        </article>
      </main>
      <SiteFooter
        siteName={site.name}
        socialLinks={publicConfig.socialLinks}
        analytics={publicConfig.analytics}
        ads={publicConfig.ads}
      />
    </div>
  );
}
