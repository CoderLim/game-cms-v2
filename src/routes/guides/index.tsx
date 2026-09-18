import { createFileRoute, notFound } from '@tanstack/react-router';

import { BlogCard } from '@/components/blog-card';
import { SiteFooter } from '@/components/game-site/site-footer';
import { SiteHeader } from '@/components/game-site/site-header';
import { formatPostDate } from '@/content/posts';
import { listPublished as listCategories } from '@/modules/categories/service';
import {
  listPublished as listSitePosts,
  SitePostType,
} from '@/modules/site-posts/service';
import { getPublicSiteConfig } from '@/modules/site-settings/service';
import { getCurrentSiteContext } from '@/modules/sites/service';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

export const Route = createFileRoute('/guides/')({
  loader: async () => {
    const site = await getCurrentSiteContext();
    const locale = getLocale();
    if (!site.enabledLocales.includes(locale)) throw notFound();

    const [categories, guides, localeAvailability, publicConfig] =
      await Promise.all([
        listCategories({ siteId: site.id, locale, limit: 8 }),
        listSitePosts({
          siteId: site.id,
          locale,
          type: SitePostType.GUIDE,
          limit: 100,
        }),
        Promise.all(
          site.enabledLocales.map(async (candidate) => ({
            locale: candidate,
            hasContent:
              (
                await listSitePosts({
                  siteId: site.id,
                  locale: candidate,
                  type: SitePostType.GUIDE,
                  limit: 1,
                })
              ).length > 0,
          }))
        ),
        getPublicSiteConfig(site.id),
      ]);

    if (locale !== site.defaultLocale && guides.length === 0) throw notFound();

    const availableLocales = localeAvailability
      .filter((item) => item.hasContent || item.locale === site.defaultLocale)
      .map((item) => item.locale);

    return {
      site,
      locale,
      categories,
      guides,
      availableLocales,
      publicConfig,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { site, locale, availableLocales } = loaderData;
    const origin = siteOrigin(site.domain);
    const urlFor = (loc: string) =>
      localizeUrl(`${origin}/guides`, { locale: loc as any }).href;
    const title = `Game Guides | ${site.name}`;
    const description = `Game guides, strategies, controls, and tips from ${site.name}.`;

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: urlFor(locale) },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale) },
        ...availableLocales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        {
          rel: 'alternate',
          hrefLang: 'x-default',
          href: urlFor(site.defaultLocale),
        },
      ],
    };
  },
  component: GuidesPage,
});

function GuidesPage() {
  const { site, locale, categories, guides, publicConfig } =
    Route.useLoaderData();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader
        siteName={site.name}
        categories={categories}
        navigation={publicConfig.navigation}
      />
      <main className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Game Guides
          </h1>
          <p className="text-muted-foreground mt-2">
            Strategies, controls, tips, and walkthroughs from {site.name}.
          </p>
        </div>

        {guides.length === 0 ? (
          <div className="bg-muted text-muted-foreground rounded-2xl px-6 py-16 text-center">
            No published guides yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <BlogCard
                key={guide.sitePostId}
                href={`/guides/${guide.slug}`}
                title={guide.title}
                description={guide.description || undefined}
                image={guide.imageUrl || undefined}
                date={
                  guide.publishedAt
                    ? formatPostDate(guide.publishedAt, locale)
                    : undefined
                }
                authorName={guide.authorName || undefined}
                authorImage={guide.authorImage || undefined}
              />
            ))}
          </div>
        )}
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
