'use client';

import { useRouter, usePathname, useParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { locales, localeLabels, type Locale } from '@/i18n';
import { trackLanguageSwitch } from '@/lib/analytics/ga4';

interface LocaleSwitcherProps {
  variant?: 'default' | 'dropdown' | 'compact';
  className?: string;
  showLabel?: boolean;
  trackingMethod?: 'header_dropdown' | 'mobile_menu' | 'footer_compact' | 'custom';
}

export function LocaleSwitcher({
  variant = 'default',
  className = '',
  showLabel = true,
  trackingMethod = 'custom'
}: LocaleSwitcherProps) {
  const params = useParams();
  const locale = (params.locale as Locale) || 'en';
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Track language switch analytics
    trackLanguageSwitch({
      fromLocale: locale,
      toLocale: newLocale,
      currentPage: pathname,
      switchMethod: trackingMethod,
      userAuthenticated: !!session?.user,
      userRole: session?.user?.role,
    });

    startTransition(() => {
      // Replace the locale in the pathname
      // e.g., /en/dashboard -> /es/dashboard
      const segments = pathname.split('/');
      segments[1] = newLocale; // Replace locale segment
      const newPath = segments.join('/');

      router.push(newPath);
      setIsOpen(false);
    });
  };

  // Default variant - Toggle button
  if (variant === 'default') {
    const otherLocale = locale === 'en' ? 'es' : 'en';

    return (
      <button
        onClick={() => switchLocale(otherLocale as Locale)}
        disabled={isPending}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg
          bg-white dark:bg-gray-800
          border border-gray-300 dark:border-gray-600
          text-gray-700 dark:text-gray-200
          hover:bg-gray-50 dark:hover:bg-gray-700
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          font-medium text-sm
          ${className}
        `}
        aria-label={`Switch to ${localeLabels[otherLocale as Locale]}`}
      >
        {/* Globe Icon */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>

        {showLabel && (
          <span className="hidden sm:inline">
            {isPending ? '...' : localeLabels[otherLocale as Locale]}
          </span>
        )}

        {/* Flag Emoji */}
        <span className="text-lg" role="img" aria-label={localeLabels[otherLocale as Locale]}>
          {otherLocale === 'es' ? '🇪🇸' : '🇺🇸'}
        </span>
      </button>
    );
  }

  // Dropdown variant - Dropdown menu
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          className="
            inline-flex items-center gap-2 px-3 py-2 rounded-lg
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            text-gray-700 dark:text-gray-200
            hover:bg-gray-50 dark:hover:bg-gray-700
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            font-medium text-sm
          "
          aria-label="Select language"
          aria-expanded={isOpen}
        >
          {/* Current locale flag */}
          <span className="text-lg" role="img" aria-label={localeLabels[locale as Locale]}>
            {locale === 'es' ? '🇪🇸' : '🇺🇸'}
          </span>

          {showLabel && (
            <span className="hidden sm:inline">
              {localeLabels[locale as Locale]}
            </span>
          )}

          {/* Chevron */}
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <div className="
              absolute right-0 mt-2 w-48 z-20
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-lg shadow-lg
              overflow-hidden
            ">
              {locales.map((loc) => (
                <button
                  key={loc}
                  onClick={() => switchLocale(loc)}
                  disabled={isPending}
                  className={`
                    w-full px-4 py-3 flex items-center gap-3
                    text-left text-sm
                    transition-colors duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      loc === locale
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <span className="text-xl" role="img" aria-label={localeLabels[loc]}>
                    {loc === 'es' ? '🇪🇸' : '🇺🇸'}
                  </span>
                  <span className="flex-1">{localeLabels[loc]}</span>
                  {loc === locale && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Compact variant - Icon only
  if (variant === 'compact') {
    const otherLocale = locale === 'en' ? 'es' : 'en';

    return (
      <button
        onClick={() => switchLocale(otherLocale as Locale)}
        disabled={isPending}
        className={`
          inline-flex items-center justify-center
          w-10 h-10 rounded-full
          bg-white dark:bg-gray-800
          border border-gray-300 dark:border-gray-600
          text-gray-700 dark:text-gray-200
          hover:bg-gray-50 dark:hover:bg-gray-700
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        aria-label={`Switch to ${localeLabels[otherLocale as Locale]}`}
        title={`Switch to ${localeLabels[otherLocale as Locale]}`}
      >
        <span className="text-xl" role="img" aria-label={localeLabels[otherLocale as Locale]}>
          {otherLocale === 'es' ? '🇪🇸' : '🇺🇸'}
        </span>
      </button>
    );
  }

  return null;
}

// Mobile-optimized variant
export function MobileLocaleSwitcher({ className = '' }: { className?: string }) {
  const params = useParams();
  const locale = (params.locale as Locale) || 'en';
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Track language switch analytics
    trackLanguageSwitch({
      fromLocale: locale,
      toLocale: newLocale,
      currentPage: pathname,
      switchMethod: 'mobile_menu',
      userAuthenticated: !!session?.user,
      userRole: session?.user?.role,
    });

    startTransition(() => {
      const segments = pathname.split('/');
      segments[1] = newLocale;
      const newPath = segments.join('/');
      router.push(newPath);
    });
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-2 gap-2">
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => switchLocale(loc)}
            disabled={isPending}
            className={`
              flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              text-sm font-medium transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                loc === locale
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
          >
            <span className="text-xl" role="img" aria-label={localeLabels[loc]}>
              {loc === 'es' ? '🇪🇸' : '🇺🇸'}
            </span>
            <span>{localeLabels[loc]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
