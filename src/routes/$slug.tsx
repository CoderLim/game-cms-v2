import { createFileRoute, notFound } from '@tanstack/react-router';

import { SiteFooter } from '@/components/game-site/site-footer';
import { SiteHeader } from '@/components/game-site/site-header';
import { MarkdownContent } from '@/components/markdown-content';
import { StructuredData } from '@/components/seo/structured-data';
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

export const Route = createFileRoute('/$slug')({
  loader: async ({ params }) => {
    const site = await getCurrentSiteContext();
    const locale = getLocale();
    if (!site.enabledLocales.includes(locale)) throw notFound();

    const page = await getPublishedBySlug({
      siteId: site.id,
      locale,
      slug: params.slug,
      type: SitePostType.PAGE,
    });
    if (!page) throw notFound();

    const [categories, availableLocales, publicConfig] = await Promise.all([
      listCategories({ siteId: site.id, locale, limit: 8 }),
      listPublishedLocales({ siteId: site.id, sitePostId: page.sitePostId }),
      getPublicSiteConfig(site.id),
    ]);

    const origin = siteOrigin(site.domain);
    const canonical = localizeUrl(`${origin}/${page.slug}`, {
      locale: locale as any,
    }).href;
    const description =
      page.metaDescription || page.description || `${page.title} on ${site.name}`;

    return {
      site,
      locale,
      page,
      categories,
      availableLocales,
      canonical,
      description,
      publicConfig,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { site, page, availableLocales, canonical, description } = loaderData;
    const origin = siteOrigin(site.domain);
    const title = page.metaTitle || `${page.title} | ${site.name}`;
    const defaultEntry =
      availableLocales.find((entry) => entry.locale === site.defaultLocale) ||
      availableLocales[0];

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonical },
        ...(page.imageUrl
          ? [{ property: 'og:image', content: page.imageUrl }]
          : []),
        {
          name: 'twitter:card',
          content: page.imageUrl ? 'summary_large_image' : 'summary',
        },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        ...(page.imageUrl
          ? [{ name: 'twitter:image', content: page.imageUrl }]
          : []),
      ],
      links: [
        { rel: 'canonical', href: canonical },
        ...availableLocales.map((entry) => ({
          rel: 'alternate',
          hrefLang: entry.locale,
          href: localizeUrl(`${origin}/${entry.slug}`, {
            locale: entry.locale as any,
          }).href,
        })),
        ...(defaultEntry
          ? [
              {
                rel: 'alternate',
                hrefLang: 'x-default',
                href: localizeUrl(`${origin}/${defaultEntry.slug}`, {
                  locale: defaultEntry.locale as any,
                }).href,
              },
            ]
          : []),
      ],
    };
  },
  component: SitePage,
});

function SitePage() {
  const { site, page, categories, canonical, description, publicConfig } =
    Route.useLoaderData();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    url: canonical,
    description,
    isPartOf: {
      '@type': 'WebSite',
      name: site.name,
      url: siteOrigin(site.domain),
    },
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <StructuredData data={structuredData} />
      <SiteHeader
        siteName={site.name}
        categories={categories}
        navigation={publicConfig.navigation}
      />
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
        <article>
          <header className="border-border mb-8 border-b pb-6">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {page.title}
            </h1>
            {page.description ? (
              <p className="text-muted-foreground mt-3 text-lg leading-8">
                {page.description}
              </p>
            ) : null}
          </header>

          {page.imageUrl ? (
            <img
              src={page.imageUrl}
              alt={page.title}
              className="border-border mb-8 w-full rounded-2xl border object-cover"
            />
          ) : null}

          <MarkdownContent content={page.content || ''} />
        </article>
      </main>
      <SiteFooter
        siteName={site.name}
        socialLinks={publicConfig.socialLinks}
        footer={publicConfig.footer}
        analytics={publicConfig.analytics}
        ads={publicConfig.ads}
      />
    </div>
  );
}
