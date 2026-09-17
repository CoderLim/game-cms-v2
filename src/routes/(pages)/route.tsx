import { MDXProvider } from '@mdx-js/react';
import { createFileRoute, Outlet } from '@tanstack/react-router';

import { SiteFooter } from '@/components/game-site/site-footer';
import { SiteHeader } from '@/components/game-site/site-header';
import { mdxComponents } from '@/components/mdx-components';
import { listPublished as listCategories } from '@/modules/categories/service';
import { getPublicSiteConfig } from '@/modules/site-settings/service';
import { getCurrentSiteContext } from '@/modules/sites/service';
import { getLocale } from '@/paraglide/runtime.js';

export const Route = createFileRoute('/(pages)')({
  loader: async () => {
    const site = await getCurrentSiteContext();
    const locale = getLocale();
    const [categories, publicConfig] = await Promise.all([
      listCategories({ siteId: site.id, locale, limit: 8 }),
      getPublicSiteConfig(site.id),
    ]);
    return { site, categories, publicConfig };
  },
  component: PagesLayout,
});

function PagesLayout() {
  const { site, categories, publicConfig } = Route.useLoaderData();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader siteName={site.name} categories={categories} />
      <main className="mx-auto max-w-3xl px-6 py-10 md:px-8 md:py-14">
        <MDXProvider components={mdxComponents}>
          <Outlet />
        </MDXProvider>
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
