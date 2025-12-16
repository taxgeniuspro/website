import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentImageSet } from '@/lib/services/client-referral.service';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// Generate dynamic metadata based on referral parameters
export async function generateMetadata({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tp?: string; cl?: string; co?: string }>;
}): Promise<Metadata> {
  const { tp, cl } = await searchParams;

  // Default metadata
  const defaultMetadata: Metadata = {
    title: 'Get Your Taxes Done Fast | Tax Genius Pro',
    description:
      'Fast refunds, expert tax preparation, and professional service. Start your free tax quote today!',
    openGraph: {
      title: 'Get Your Taxes Done Fast | Tax Genius Pro',
      description:
        'Fast refunds, expert tax preparation, and professional service. Start your free tax quote today!',
      type: 'website',
      url: 'https://taxgeniuspro.tax/new',
      images: [
        {
          url: 'https://taxgeniuspro.tax/images/og-default.png',
          width: 1200,
          height: 630,
          alt: 'Tax Genius Pro - Fast Tax Refunds',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Get Your Taxes Done Fast | Tax Genius Pro',
      description: 'Fast refunds and professional tax preparation service.',
      images: ['https://taxgeniuspro.tax/images/og-default.png'],
    },
  };

  // If no preparer code, return default
  if (!tp) {
    return defaultMetadata;
  }

  try {
    // Look up preparer by tracking code
    const preparer = await prisma.profile.findFirst({
      where: {
        OR: [
          { trackingCode: tp },
          { customTrackingCode: tp },
          { shortLinkUsername: tp },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        customTrackingCode: true,
      },
    });

    if (!preparer) {
      return defaultMetadata;
    }

    const preparerName = `${preparer.firstName} ${preparer.lastName}`;
    const clientName = cl ? decodeURIComponent(cl) : null;

    // Get promotional images for this preparer
    const imageSet = await getCurrentImageSet(preparer.id, 'client_referral');
    const ogImage = imageSet?.images[0]?.url || 'https://taxgeniuspro.tax/images/og-default.png';

    // Build personalized title and description
    const title = clientName
      ? `${clientName} Recommends Tax Genius Pro`
      : `Get Your Taxes Done by ${preparerName} | Tax Genius Pro`;

    const description = clientName
      ? `${clientName} thinks you'll love our tax services! Get your taxes done by ${preparerName} - fast refunds and professional service.`
      : `Get your taxes done by ${preparerName} at Tax Genius Pro. Fast refunds, expert preparation, and professional service.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `https://taxgeniuspro.tax/new/?tp=${tp}${cl ? `&cl=${encodeURIComponent(cl)}` : ''}`,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `Get your taxes done by ${preparerName} at Tax Genius Pro`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch (error) {
    console.error('Error generating metadata for /new page:', error);
    return defaultMetadata;
  }
}

export default function NewLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
