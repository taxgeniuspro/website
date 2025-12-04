/**
 * next-intl Configuration
 * Main i18n setup for TaxGeniusPro bilingual support (English/Spanish)
 */

import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Supported locales
export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'en';

// Locale labels for UI
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

export default getRequestConfig(async (params) => {
  // Extract locale from params which can come from requestLocale or routing
  const requestLocale = params.requestLocale;
  const locale = await requestLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
