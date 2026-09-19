import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { LocaleSelector } from '@/components/locale-selector';

export type PokiNavItem = {
  label: string;
  href: string;
};

export type PokiSocialLink = {
  name?: string;
  displayName?: string;
  url: string;
};

const FONT = '"Open Sans", "Proxima Nova", Arial, sans-serif';

export function PokiFrame({
  background,
  children,
}: {
  background: string;
  children: ReactNode;
}) {
  return (
    <div
      className="isolate min-h-screen overflow-x-hidden text-[#002b50]"
      style={{ fontFamily: FONT }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundColor: '#83ffe7',
          backgroundImage: `url(${background})`,
          backgroundSize: 'max(624px, 100%)',
          backgroundPosition: 'center',
        }}
      />
      {children}
    </div>
  );
}

function socialKind(item: PokiSocialLink) {
  const hay =
    `${item.name || ''} ${item.displayName || ''} ${item.url}`.toLowerCase();
  if (hay.includes('youtu')) return 'youtube';
  if (hay.includes('tiktok')) return 'tiktok';
  if (hay.includes('instagram')) return 'instagram';
  if (hay.includes('twitter') || hay.includes('x.com')) return 'x';
  if (hay.includes('reddit')) return 'reddit';
  if (hay.includes('github')) return 'github';
  if (hay.includes('facebook')) return 'facebook';
  if (hay.includes('discord')) return 'discord';
  return 'link';
}

function SocialGlyph({ kind }: { kind: string }) {
  const props = {
    viewBox: '0 0 24 24',
    className: 'size-[18px]',
    fill: 'currentColor',
    'aria-hidden': true as const,
  };

  if (kind === 'youtube') {
    return (
      <svg {...props}>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.8 15.5v-7l6.2 3.5-6.2 3.5z" />
      </svg>
    );
  }

  if (kind === 'x') {
    return (
      <svg {...props}>
        <path d="M18.2 3H21l-6.5 7.4L22 21h-6.2l-4.8-6.3L6 21H3.2l7-8L2 3h6.3l4.4 5.8L18.2 3zm-1.1 16.2h1.7L7 4.7H5.2l11.9 14.5z" />
      </svg>
    );
  }

  if (kind === 'reddit') {
    return (
      <svg {...props}>
        <path d="M14.5 3.2a1.4 1.4 0 1 0 1.3 2.1 6.2 6.2 0 0 1 3.3 5.2v.3a2.3 2.3 0 1 0-1.3 2.1 5.7 5.7 0 0 1-5.8 4.4 5.7 5.7 0 0 1-5.8-4.4 2.3 2.3 0 1 0-1.3-2.1v-.3a6.2 6.2 0 0 1 3.3-5.2 1.4 1.4 0 1 0 1.3-2.1 1.4 1.4 0 0 0-.8 1.2 7.4 7.4 0 0 0-2.5 1.6 7.6 7.6 0 0 0-2.2 4.4 3.6 3.6 0 0 0-1.5 3 3.5 3.5 0 0 0 2.2 3.2 7.2 7.2 0 0 0 6.3 3.7 7.2 7.2 0 0 0 6.3-3.7 3.5 3.5 0 0 0 2.2-3.2 3.6 3.6 0 0 0-1.5-3 7.6 7.6 0 0 0-2.2-4.4 7.4 7.4 0 0 0-2.5-1.6 1.4 1.4 0 0 0-.8-1.2zM9.2 12.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zm5.6 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zm-4.6 4.2c.8.8 2.2.8 3 0 .2-.2.6-.2.8 0 .2.3.2.6 0 .8-1.3 1.3-3.3 1.3-4.6 0-.2-.2-.2-.5 0-.8.2-.2.6-.2.8 0z" />
      </svg>
    );
  }

  if (kind === 'instagram') {
    return (
      <svg {...props}>
        <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm10 1.8H7A2.2 2.2 0 0 0 4.8 7v10A2.2 2.2 0 0 0 7 19.2h10a2.2 2.2 0 0 0 2.2-2.2V7A2.2 2.2 0 0 0 17 4.8zM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8zm4.6-2.9a.9.9 0 1 1-.9.9.9.9 0 0 1 .9-.9z" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M10.6 13.4a4 4 0 0 1 0-5.6l2.1-2.1a4 4 0 0 1 5.7 5.6l-1.2 1.2-1.4-1.4 1.2-1.2a2 2 0 1 0-2.8-2.8l-2.1 2.1a2 2 0 0 0 0 2.8l.6.6-1.4 1.4-.7-.6zm2.8-2.8a4 4 0 0 1 0 5.6l-2.1 2.1a4 4 0 1 1-5.7-5.6l1.2-1.2 1.4 1.4-1.2 1.2a2 2 0 1 0 2.8 2.8l2.1-2.1a2 2 0 0 0 0-2.8l-.6-.6 1.4-1.4.7.6z" />
    </svg>
  );
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-[12px] leading-[22px] font-bold tracking-[0.3px] text-[#bac9de] uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  const className =
    'text-[14px] leading-[22px] font-bold text-[#002b50] hover:text-[#009cff]';

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function PokiFooter({
  siteName,
  footerDescription,
  navigation,
  popularLinks,
  socialLinks,
}: {
  siteName: string;
  footerDescription?: string;
  navigation?: PokiNavItem[];
  /** Fallback Popular column when CMS navigation is empty (usually category links). */
  popularLinks?: PokiNavItem[];
  socialLinks?: PokiSocialLink[];
}) {
  const popular = (
    (navigation && navigation.length > 0 ? navigation : popularLinks) || []
  )
    .filter(
      (item, index, list) =>
        list.findIndex((entry) => entry.href === item.href) === index
    )
    .slice(0, 6);
  const slogan =
    footerDescription && footerDescription.length <= 48
      ? footerDescription
      : null;
  const blurb =
    footerDescription && footerDescription.length > 48
      ? footerDescription
      : null;

  return (
    <footer className="relative mt-10">
      <div
        aria-hidden
        className="absolute inset-0 bg-white"
        style={{
          clipPath:
            'polygon(0 8%, 30.6% 0, 33.5% 8%, 100% 0, 100% 100%, 0 100%)',
        }}
      />
      <div className="relative z-[1] mx-auto grid max-w-[1440px] gap-8 px-8 py-14 lg:grid-cols-[minmax(240px,450px)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center gap-7">
              <Link href="/" className="text-[22px] leading-6 font-bold">
                {siteName}
              </Link>
              {slogan ? (
                <span className="text-[18px] leading-normal font-bold">
                  {slogan}
                </span>
              ) : null}
            </div>
            {blurb ? (
              <p className="max-w-md text-base leading-6 font-normal">
                {blurb}
              </p>
            ) : null}
            <LocaleSelector variant="poki" />
          </div>

          {socialLinks?.length ? (
            <div className="flex flex-wrap gap-4">
              {socialLinks.map((item) => {
                const label = item.displayName || item.name || item.url;
                return (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="flex size-9 items-center justify-center rounded-full bg-[#002b50] text-white"
                  >
                    <SocialGlyph kind={socialKind(item)} />
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="grid gap-8 sm:grid-cols-3 sm:gap-12">
          <Column title="Popular">
            {popular.length > 0 ? (
              popular.map((item) => (
                <FooterLink key={`${item.href}:${item.label}`} href={item.href}>
                  {item.label}
                </FooterLink>
              ))
            ) : (
              <FooterLink href="/">Games</FooterLink>
            )}
          </Column>
          <Column title="Help and support">
            <FooterLink href="/contact-us">Contact</FooterLink>
            <FooterLink href="/privacy-policy">Privacy</FooterLink>
            <FooterLink href="/terms-of-service">Terms</FooterLink>
          </Column>
          <Column title="Get to know us">
            <FooterLink href="/about-us">About</FooterLink>
          </Column>
        </div>
      </div>
    </footer>
  );
}
