import { Metadata } from 'next';
import { Suspense } from 'react';
import SimpleTaxForm from '@/components/SimpleTaxForm';
import { ShortLinkTracker } from '@/components/tracking/ShortLinkTracker';
import { ReferralBanner } from '@/components/ReferralBanner';
import { prisma } from '@/lib/prisma';

// Default preparer (Owliver Owl)
const DEFAULT_PREPARER = {
  firstName: 'Owliver',
  lastName: 'Owl',
  phone: '1 (404) 627-1015',
  email: 'taxgenius.tax@gmail.com',
  avatarUrl:
    'https://res.cloudinary.com/dhktmiigh/image/upload/v1765487894/taxgeniuspro/preparers/preparer_ow.jpg',
  trackingCode: 'ow',
};

export const metadata: Metadata = {
  title: 'File Your Tax Return - Tax Genius Pro',
  description:
    'Complete your tax return in minutes. Simple questions, expert review, maximum refund guaranteed.',
  robots: {
    index: true,
    follow: true,
  },
};

interface PageProps {
  searchParams: Promise<{ ref?: string }>;
}

async function getPreparerByRef(ref: string | undefined) {
  // If no ref, return default preparer (Owliver)
  if (!ref) return DEFAULT_PREPARER;

  try {
    // First try to find a tax preparer or admin with this code
    const preparerProfile = await prisma.profile.findFirst({
      where: {
        OR: [
          { trackingCode: ref },
          { customTrackingCode: ref },
          { shortLinkUsername: ref },
        ],
        role: { in: ['tax_preparer', 'admin'] },
      },
      include: {
        user: { select: { email: true } },
      },
    });

    if (preparerProfile && preparerProfile.firstName && preparerProfile.lastName) {
      return {
        firstName: preparerProfile.firstName,
        lastName: preparerProfile.lastName,
        avatarUrl: preparerProfile.avatarUrl,
        phone: preparerProfile.phone,
        email: preparerProfile.user?.email,
        trackingCode: preparerProfile.customTrackingCode || preparerProfile.trackingCode,
      };
    }

    // Check if it's an affiliate code - if so, return default preparer (Owliver)
    const affiliateProfile = await prisma.profile.findFirst({
      where: {
        OR: [
          { trackingCode: ref },
          { customTrackingCode: ref },
        ],
        role: { in: ['client', 'affiliate'] },
      },
      select: {
        id: true,
        affiliateBondedToPreparerId: true,
      },
    });

    if (affiliateProfile) {
      // If affiliate is bonded to a preparer, return that preparer
      if (affiliateProfile.affiliateBondedToPreparerId) {
        const bondedPreparer = await prisma.profile.findUnique({
          where: { id: affiliateProfile.affiliateBondedToPreparerId },
          include: { user: { select: { email: true } } },
        });

        if (bondedPreparer && bondedPreparer.firstName && bondedPreparer.lastName) {
          return {
            firstName: bondedPreparer.firstName,
            lastName: bondedPreparer.lastName,
            avatarUrl: bondedPreparer.avatarUrl,
            phone: bondedPreparer.phone,
            email: bondedPreparer.user?.email,
            trackingCode: bondedPreparer.customTrackingCode || bondedPreparer.trackingCode,
          };
        }
      }
      // Affiliate not bonded - return default preparer
      return DEFAULT_PREPARER;
    }

    // Code not found - return default preparer
    return DEFAULT_PREPARER;
  } catch (error) {
    console.error('Error fetching preparer:', error);
    return DEFAULT_PREPARER;
  }
}

export default async function TaxFormPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preparer = await getPreparerByRef(params.ref);
  const preparerName = `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim();

  return (
    <div className="min-h-screen bg-background py-12">
      {/* Track short link clicks */}
      <Suspense fallback={null}>
        <ShortLinkTracker />
      </Suspense>

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3">Start Your Tax Return</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Answer a few quick questions. No signup required to start.
          </p>

          {/* Referral Banner - Shows preparer who will help */}
          <ReferralBanner
            preparerName={preparerName}
            preparerAvatar={preparer.avatarUrl}
            className="max-w-xl mx-auto"
          />
        </div>

        <SimpleTaxForm preparer={preparer} />
      </div>
    </div>
  );
}
