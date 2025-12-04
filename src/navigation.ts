/**
 * i18n-aware navigation utilities
 * Wraps next-intl navigation for type-safe, locale-aware routing
 */

import { createSharedPathnamesNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './i18n';

export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation({ locales, localePrefix: 'always' });
