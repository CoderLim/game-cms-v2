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

export const Route = createFileRoute('/blog/')({
  loader: async () => {
    const site = await getCurrentSiteContext();
    const locale = getLocale();
    if (!site.enabledLocales.includes(locale)) throw notFound();

    const [categories, posts, localeAvailability, publicConfig] =
      await Promise.all([
        listCategories({ siteId: site.id, locale, limit: 8 }),
        listSitePosts({
          siteId: site.id,
          locale,
          type: SitePostType.ARTICLE,
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
                  type: SitePostType.ARTICLE,
                  limit: 1,
                })
              ).length > 0,
          }))
        ),
        getPublicSiteConfig(site.id),
      ]);

    if (locale !== site.defaultLocale && posts.length === 0) throw notFound();

    const availableLocales = localeAvailability
      .filter((item) => item.hasContent || item.locale === site.defaultLocale)
      .map((item) => item.locale);

    return {
      site,
      locale,
      categories,
      posts,
      availableLocales,
      publicConfig,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { site, locale, availableLocales } = loaderData;
    const origin = siteOrigin(site.domain);
    const urlFor = (loc: string) =>
      localizeUrl(`${origin}/blog`, { locale: loc as any }).href;
    const title = `Blog | ${site.name}`;
    const description = `Guides, news, and game articles from ${site.name}.`;

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
  component: BlogPage,
});

function BlogPage() {
  const { site, locale, categories, posts, publicConfig } =
    Route.useLoaderData();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader siteName={site.name} categories={categories} />
      <main className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Blog</h1>
          <p className="text-muted-foreground mt-2">
            Guides, news, and game articles from {site.name}.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="bg-muted text-muted-foreground rounded-2xl px-6 py-16 text-center">
            No published articles yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard
                key={post.sitePostId}
                href={`/blog/${post.slug}`}
                title={post.title}
                description={post.description || undefined}
                image={post.imageUrl || undefined}
                date={
                  post.publishedAt
                    ? formatPostDate(post.publishedAt, locale)
                    : undefined
                }
                authorName={post.authorName || undefined}
                authorImage={post.authorImage || undefined}
              />
            ))}
          </div>
        )}
      </main>
      <SiteFooter
        siteName={site.name}
        socialLinks={publicConfig.socialLinks as any[]}
      />
    </div>
  );
}
