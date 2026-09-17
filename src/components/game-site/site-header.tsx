import { Link } from '@/core/i18n/navigation';

export type SiteHeaderCategory = {
  slug: string;
  title: string;
};

export function SiteHeader({
  siteName,
  categories = [],
}: {
  siteName: string;
  categories?: SiteHeaderCategory[];
}) {
  return (
    <header className="bg-background/95 border-border sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 md:px-6">
        <Link href="/" className="text-foreground text-lg font-bold tracking-tight">
          {siteName}
        </Link>
        {categories.length > 0 ? (
          <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded-lg px-3 py-1.5 text-sm transition"
              >
                {category.title}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
