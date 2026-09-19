import { Check, ChevronDown, Globe, Languages } from 'lucide-react';

import { localeNames } from '@/config/locale';
import { cn } from '@/lib/utils';
import { getLocale, locales, setLocale } from '@/paraglide/runtime.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function LocaleFlag({ locale }: { locale: string }) {
  if (locale === 'zh') {
    return (
      <svg
        viewBox="0 0 16 16"
        className="size-4 shrink-0 rounded-[2px]"
        aria-hidden
      >
        <rect width="16" height="16" fill="#de2910" />
        <polygon
          fill="#ffde00"
          points="3.4,1.5 4.1,3.5 6.2,3.5 4.5,4.7 5.1,6.7 3.4,5.5 1.7,6.7 2.3,4.7 0.6,3.5 2.7,3.5"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4 shrink-0 rounded-[2px]"
      aria-hidden
    >
      <rect width="16" height="16" fill="#fff" />
      <g fill="#b22234">
        <rect width="16" height="1.23" />
        <rect y="2.46" width="16" height="1.23" />
        <rect y="4.92" width="16" height="1.23" />
        <rect y="7.38" width="16" height="1.23" />
        <rect y="9.85" width="16" height="1.23" />
        <rect y="12.31" width="16" height="1.23" />
        <rect y="14.77" width="16" height="1.23" />
      </g>
      <rect width="7" height="8.6" fill="#3c3b6e" />
    </svg>
  );
}

export function LocaleSelector({
  variant = 'icon',
  className,
}: {
  variant?: 'icon' | 'pill' | 'poki';
  className?: string;
}) {
  const locale = getLocale();

  function handleSwitch(newLocale: string) {
    // Writes the locale cookie and reloads on the localized URL.
    setLocale(newLocale as typeof locale);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center transition-colors outline-none',
          variant === 'icon'
            ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground size-8 justify-center rounded-md'
            : variant === 'poki'
              ? 'h-9 gap-2 rounded-full border-2 border-[#009cff] bg-transparent px-2 pb-px text-[16px] leading-4 font-bold text-[#009cff]'
              : 'h-9 gap-2 rounded-full border px-4 text-sm',
          className
        )}
      >
        {variant === 'icon' ? (
          <>
            <Languages className="size-4" />
            <span className="sr-only">Switch language</span>
          </>
        ) : variant === 'poki' ? (
          <>
            <LocaleFlag locale={locale} />
            <span>{localeNames[locale] || locale}</span>
            <ChevronDown className="size-4" />
          </>
        ) : (
          <>
            <Globe className="size-4" />
            <span>{localeNames[locale] || locale}</span>
            <ChevronDown className="size-4 opacity-70" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleSwitch(loc)}
            className="flex items-center justify-between gap-2"
          >
            {localeNames[loc] || loc}
            {loc === locale && <Check className="size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
