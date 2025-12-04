import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { LandingPageTemplate } from '@/components/landing-page/LandingPageTemplate';
import { logger } from '@/lib/logger';
import { generateTaxGeniusLocalBusinessSchema } from '@/lib/seo-llm/1-core-seo/schema/tax-genius-schemas';
import { normalizeState } from '@/lib/seo-llm/1-core-seo/utils/state-mapping';

// ISR: Revalidate every 1 hour (AC8)
export const revalidate = 3600;

// Slug validation regex (AC24 - MANDATORY)
const VALID_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface PageProps {
  params: Promise<{ city: string }>;
}

/**
 * Generate metadata for SEO (AC9-13)
 * Server-rendered metadata visible to search engine crawlers
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;

  // MANDATORY: Validate slug before database query (AC24)
  if (!VALID_SLUG_PATTERN.test(city)) {
    return {};
  }

  const page = await prisma.landingPage.findUnique({
    where: {
      slug: city,
      isPublished: true, // AC6
    },
  });

  if (!page) {
    return {};
  }

  const url = `https://taxgeniuspro.tax/locations/${city}`;

  return {
    title: page.metaTitle, // AC10
    description: page.metaDescription, // AC10
    alternates: {
      canonical: url, // AC12
    },
    openGraph: {
      // AC11
      title: page.metaTitle,
      description: page.metaDescription,
      url: url,
      type: 'website',
      siteName: 'Tax Genius Pro',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle,
      description: page.metaDescription,
    },
  };
}

/**
 * Pre-render top 50 cities at build time (AC18)
 * Remaining cities use ISR (AC19)
 * Returns empty array during Docker build (no DB connection available)
 */
export async function generateStaticParams() {
  try {
    const topCities = await prisma.landingPage.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { slug: true },
    });

    return topCities.map((page) => ({ city: page.slug }));
  } catch (error) {
    // During Docker build, database isn't available - return empty array
    // Pages will be generated on-demand via ISR instead
    logger.info('Database not available during build, skipping static generation');
    return [];
  }
}

/**
 * Dynamic Landing Page Route
 * Server Component for optimal SEO (AC3, AC7)
 */
export default async function CityLandingPage({ params }: PageProps) {
  const { city } = await params;

  // MANDATORY: Validate slug pattern before database query (AC24)
  // Prevents path traversal attacks (../, %00, etc.)
  if (!VALID_SLUG_PATTERN.test(city)) {
    notFound(); // Return 404 for invalid slugs
  }

  // Fetch landing page data from database (AC5, AC6, AC7)
  const page = await prisma.landingPage.findUnique({
    where: {
      slug: city,
      isPublished: true, // AC6: Only show published pages
    },
  });

  // Return 404 if page not found or not published (AC4)
  if (!page) {
    notFound();
  }

  // Generate LocalBusiness schema for SEO
  const stateData = normalizeState(page.state);
  const localBusinessSchema = generateTaxGeniusLocalBusinessSchema(
    page.city,
    stateData.name,
    stateData.code
  );

  // Render landing page template (AC14)
  return (
    <>
      {/* LocalBusiness Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <LandingPageTemplate data={page} />
    </>
  );
}
