import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Dynamic sitemap generation (AC20)
 * Includes all published landing pages with i18n support (en/es)
 * Returns only static pages during Docker build (no DB connection available)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://taxgeniuspro.tax';
  const locales = ['en', 'es'];

  // Fetch all published landing pages (with fallback for build time)
  let landingPageEntries: MetadataRoute.Sitemap = [];

  try {
    const landingPages = await prisma.landingPage.findMany({
      where: { isPublished: true },
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    // Generate sitemap entries for landing pages (both languages)
    landingPages.forEach((page) => {
      locales.forEach((locale) => {
        landingPageEntries.push({
          url: `${baseUrl}/${locale}/locations/${page.slug}`,
          lastModified: page.updatedAt,
          changeFrequency: 'monthly',
          priority: 0.8,
        });
      });
    });
  } catch (error) {
    // During Docker build, database isn't available - return empty array
    // Sitemap will be regenerated at runtime with actual data
    logger.info('Database not available during build, skipping dynamic sitemap entries');
  }

  // Static pages with i18n support
  const staticPagePaths = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/services', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/personal-tax-filing', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/business-tax', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/tax-planning', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/audit-protection', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/irs-resolution', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/tax-guide', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/blog', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/help', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/tax-calculator', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/refund-advance', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' as const },
  ];

  // Generate entries for both English and Spanish
  const staticPages: MetadataRoute.Sitemap = [];
  staticPagePaths.forEach(({ path, priority, changeFrequency }) => {
    locales.forEach((locale) => {
      staticPages.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency,
        priority,
      });
    });
  });

  return [...staticPages, ...landingPageEntries];
}
