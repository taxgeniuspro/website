import { getRequestConfig } from 'next-intl/server'

// Supported locales
export const locales = ['en', 'es'] as const
export type Locale = (typeof locales)[number]

// Default locale
export const defaultLocale: Locale = 'en'

export default getRequestConfig(async ({ requestLocale }) => {
  // CRITICAL: Next-Intl v3.x uses requestLocale (returns a promise) not locale
  // Get the requested locale (await the promise)
  let locale = await requestLocale

  // Ensure locale is valid, fallback to default if not
  const validLocale =
    locale && locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  }
})
// Build $(date +%s)
