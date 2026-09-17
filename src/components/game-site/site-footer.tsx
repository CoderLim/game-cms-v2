import { SiteRuntime } from '@/components/game-site/site-runtime';
import { Link } from '@/core/i18n/navigation';
import type {
  PublicAdsConfig,
  PublicAnalyticsConfig,
  PublicFooterConfig,
  PublicSocialLink,
} from '@/modules/site-settings/service';

export function SiteFooter({
  siteName,
  socialLinks = [],
  footer,
  analytics,
  ads,
}: {
  siteName: string;
  socialLinks?: PublicSocialLink[];
  footer?: PublicFooterConfig;
  analytics?: PublicAnalyticsConfig;
  ads?: PublicAdsConfig;
}) {
  return (
    <>
      <footer className="border-border bg-muted/20 mt-16 border-t">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1fr_auto] md:px-6">
          <div>
            <Link href="/" className="text-foreground font-semibold">
              {siteName}
            </Link>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
              {footer?.description ||
                'Play browser games and discover guides, updates, and related content.'}
            </p>
          </div>

          <div className="flex flex-col gap-4 text-sm md:items-end">
            <nav className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/about-us" className="hover:text-foreground">
                About
              </Link>
              <Link href="/contact-us" className="hover:text-foreground">
                Contact
              </Link>
              <Link href="/privacy-policy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms-of-service" className="hover:text-foreground">
                Terms
              </Link>
            </nav>

            {socialLinks.length > 0 ? (
              <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
                {socialLinks.map((item) => (
                  <a
                    key={`${item.url}:${item.displayName || item.name || ''}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground"
                  >
                    {item.displayName || item.name || item.url}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </footer>
      <SiteRuntime analytics={analytics} ads={ads} />
    </>
  );
}
