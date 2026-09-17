import type { ComponentType } from 'react';
import { notFound, useLoaderData } from '@tanstack/react-router';

import { MarkdownContent } from '@/components/markdown-content';
import { getCurrentSiteContext } from '@/modules/sites/service';
import {
  getPublishedBySlug,
  listPublishedLocales,
  SitePostType,
} from '@/modules/site-posts/service';
import { m } from '@/paraglide/messages.js';
import {
  baseLocale,
  getLocale,
  localizeUrl,
} from '@/paraglide/runtime.js';

type PageMeta = {
  title: string;
  description: string;
  updated_at: string;
};

type PageModule = {
  default: ComponentType;
  meta: PageMeta;
};

const pages = import.meta.glob<PageModule>('/src/content/pages/*.mdx', {
  eager: true,
});

function loadLocalPage(slug: string, locale: string): PageModule | null {
  return (
    pages[`/src/content/pages/${slug}.${locale}.mdx`] ??
    pages[`/src/content/pages/${slug}.${baseLocale}.mdx`] ??
    null
  );
}

function siteOrigin(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

type LoaderData = {
  site: Awaited<ReturnType<typeof getCurrentSiteContext>>;
  slug: string;
  locale: string;
  dbPage: Awaited<ReturnType<typeof getPublishedBySlug>> | null;
  availableLocales: Awaited<ReturnType<typeof listPublishedLocales>>;
  localMeta: PageMeta | null;
};

/**
 * Shared route options for legal/info pages.
 *
 * Production content is site-scoped in `site_post` / `site_post_locale`.
 * Bundled MDX remains a development/template fallback so a fresh install can
 * render legal pages before content is entered, but migrated site content wins.
 */
export function staticPageRouteOptions(slug: string) {
  return {
    loader: async (): Promise<LoaderData> => {
      const site = await getCurrentSiteContext();
      const locale = getLocale();
      if (!site.enabledLocales.includes(locale)) throw notFound();

      const dbPage = await getPublishedBySlug({
        siteId: site.id,
        locale,
        slug,
        type: SitePostType.PAGE,
      });

      if (dbPage) {
        const availableLocales = await listPublishedLocales({
          siteId: site.id,
          sitePostId: dbPage.sitePostId,
        });
        return {
          site,
          slug,
          locale,
          dbPage,
          availableLocales,
          localMeta: null,
        };
      }

      const localPage = loadLocalPage(slug, locale);
      if (!localPage) throw notFound();

      return {
        site,
        slug,
        locale,
        dbPage: null,
        availableLocales: [],
        localMeta: localPage.meta,
      };
    },
    head: ({ loaderData }: { loaderData?: LoaderData }) => {
      if (!loaderData) return {};
      const { site, slug, locale, dbPage, availableLocales, localMeta } =
        loaderData;
      const origin = siteOrigin(site.domain);
      const canonical = localizeUrl(`${origin}/${slug}`, {
        locale: locale as any,
      }).href;

      const title =
        dbPage?.metaTitle || dbPage?.title || localMeta?.title || site.name;
      const description =
        dbPage?.metaDescription ||
        dbPage?.description ||
        localMeta?.description ||
        '';

      const defaultEntry =
        availableLocales.find((entry) => entry.locale === site.defaultLocale) ||
        availableLocales[0];

      return {
        meta: [
          { title },
          { name: 'description', content: description },
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
    component: StaticPage,
  };
}

function StaticPage() {
  const { dbPage, localMeta, slug, locale } = useLoaderData({
    strict: false,
  }) as LoaderData;

  if (dbPage) {
    return (
      <article>
        <header className="border-border mb-6 border-b pb-5">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
            {dbPage.title}
          </h1>
          {dbPage.description ? (
            <p className="text-muted-foreground mt-2 text-sm">
              {dbPage.description}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-2 text-xs">
            {m['common.pages.last_updated']()}:{' '}
            {new Date(dbPage.updatedAt).toLocaleDateString(locale)}
          </p>
        </header>
        <MarkdownContent content={dbPage.content || ''} />
      </article>
    );
  }

  const page = loadLocalPage(slug, locale)!;
  const Content = page.default;

  return (
    <article>
      <header className="border-border mb-6 border-b pb-5">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
          {localMeta!.title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {localMeta!.description}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          {m['common.pages.last_updated']()}: {localMeta!.updated_at}
        </p>
      </header>
      <div className="text-foreground/90 text-[15px] leading-7">
        <Content />
      </div>
    </article>
  );
}
