import type { Metadata } from 'next';

// Force dynamic rendering so OG images are fetched fresh based on ref parameter
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}

/**
 * Generate dynamic metadata for the cash advance page.
 *
 * NOTE: In Next.js App Router, layouts receive searchParams but they may not
 * always work correctly. We use a dynamic opengraph-image route that accepts
 * the ref parameter and proxies the actual image.
 */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const ref = resolvedSearchParams?.ref;
  const locale = resolvedParams?.locale || 'en';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

  // Use the opengraph-image route which proxies the actual image
  // This route fetches from Cloudinary and returns the image bytes directly
  const ogImageUrl = ref
    ? `${appUrl}/${locale}/cash-advance/opengraph-image?ref=${encodeURIComponent(ref)}`
    : `${appUrl}/${locale}/cash-advance/opengraph-image`;

  return {
    title: 'Preseason Tax Advance - Get Up to $7,000 | Tax Genius Pro',
    description:
      'Get up to $7,000 preseason tax advance starting January 2, 2025. No credit check, same-day funding available. Apply now with Tax Genius Pro!',
    keywords: [
      'preseason tax advance',
      'tax advance',
      'refund advance',
      'early tax refund',
      '$7000 advance',
      'no credit check tax advance',
      'same day tax advance',
      'Atlanta tax preparer',
      'Tax Genius Pro',
    ],
    openGraph: {
      url: ref ? `${appUrl}/${locale}/cash-advance?ref=${ref}` : `${appUrl}/${locale}/cash-advance`,
      title: 'Get Up to $7,000 Preseason Tax Advance | Tax Genius Pro',
      description:
        'Need cash fast? Get up to $7,000 preseason advance on your tax refund starting January 2. No credit check, same-day funding. Apply now!',
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'Tax Genius Pro - Get Up to $7,000 Tax Advance',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Get Up to $7,000 Preseason Tax Advance | Tax Genius Pro',
      description:
        'Need cash fast? Get up to $7,000 preseason advance on your tax refund. No credit check, same-day funding available.',
      images: [ogImageUrl],
    },
  };
}

export default function CashAdvanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
