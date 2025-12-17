import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}

/**
 * Get the promotional image URL for the cash advance page.
 * Facebook/social crawlers don't follow redirects, so we need the direct image URL.
 */
async function getOgImageUrl(ref?: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
  const fallbackImage = `${appUrl}/og-cash-advance.jpg`;

  try {
    let preparerId: string | undefined;

    // If preparer code is provided, look up the preparer
    if (ref) {
      const preparer = await prisma.profile.findFirst({
        where: {
          OR: [{ customTrackingCode: ref }, { trackingCode: ref }],
          role: 'tax_preparer',
        },
        select: { id: true },
      });
      preparerId = preparer?.id;
    }

    // First, try preparer-specific images
    if (preparerId) {
      const preparerSet = await prisma.referralImageSet.findFirst({
        where: {
          preparerId,
          folderType: 'preseason_loans',
          category: 'preparer',
          isActive: true,
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
      });

      if (preparerSet?.images.length && preparerSet.images[0].imageUrl) {
        return preparerSet.images[0].imageUrl;
      }
    }

    // Fallback to default images
    const defaultSet = await prisma.referralImageSet.findFirst({
      where: {
        category: 'default',
        preparerId: null,
        folderType: 'preseason_loans',
        isActive: true,
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
    });

    if (defaultSet?.images.length && defaultSet.images[0].imageUrl) {
      return defaultSet.images[0].imageUrl;
    }

    return fallbackImage;
  } catch (error) {
    console.error('Error fetching OG image:', error);
    return fallbackImage;
  }
}

/**
 * Generate dynamic metadata for the cash advance page.
 * Uses the promotional images from the referral-images system.
 *
 * If a preparer ref code is provided:
 * - Uses their custom preseason_loans image if they have one
 * - Otherwise falls back to default preseason_loans images
 *
 * IMPORTANT: Returns direct Cloudinary URL, not a redirect.
 * Facebook/Twitter crawlers don't follow redirects for OG images.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const ref = resolvedSearchParams?.ref;

  // Get the actual image URL (direct Cloudinary URL, not a redirect)
  const ogImageUrl = await getOgImageUrl(ref || undefined);

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
