import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { db, firstOrNull } from '@/lib/db';
import { LandingPageTemplate } from '@/components/landing-page/LandingPageTemplate';
import { logger } from '@/lib/logger';
import { generateTaxGeniusLocalBusinessSchema } from '@/lib/seo-llm/1-core-seo/schema/tax-genius-schemas';
import { normalizeState } from '@/lib/seo-llm/1-core-seo/utils/state-mapping';
import { safeJsonLdStringify } from '@/lib/utils/json-ld';

// LandingPage interface for type safety
interface LandingPage {
  id: string;
  slug: string;
  city: string;
  state: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
  created_at: string;
  // Add other fields as needed
  [key: string]: unknown;
}

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

  const { data: pageData, error } = await db
    .from('landing_pages')
    .select('*')
    .eq('slug', city)
    .eq('is_published', true)
    .single();

  if (error || !pageData) {
    return {};
  }

  const page = pageData as LandingPage;
  const url = `https://taxgeniuspro.tax/locations/${city}`;

  return {
    title: page.meta_title, // AC10
    description: page.meta_description, // AC10
    alternates: {
      canonical: url, // AC12
    },
    openGraph: {
      // AC11
      title: page.meta_title,
      description: page.meta_description,
      url: url,
      type: 'website',
      siteName: 'Tax Genius Pro',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.meta_title,
      description: page.meta_description,
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
    const { data: topCities, error } = await db
      .from('landing_pages')
      .select('slug')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (topCities || []).map((page: { slug: string }) => ({ city: page.slug }));
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
  const { data: pageData, error } = await db
    .from('landing_pages')
    .select('*')
    .eq('slug', city)
    .eq('is_published', true)
    .single();

  // Return 404 if page not found or not published (AC4)
  if (error || !pageData) {
    notFound();
  }

  const page = pageData as LandingPage;

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
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(localBusinessSchema) }}
      />
      <LandingPageTemplate data={page} />
    </>
  );
}
