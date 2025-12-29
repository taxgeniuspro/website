import { Metadata } from 'next';
import { Suspense } from 'react';
import SimpleTaxForm from '@/components/SimpleTaxForm';
import { ShortLinkTracker } from '@/components/tracking/ShortLinkTracker';
import { ReferralBanner } from '@/components/ReferralBanner';
import { db, firstOrNull } from '@/lib/db';

// Profile interface for type safety
interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  trackingCode: string | null;
  customTrackingCode: string | null;
  shortLinkUsername: string | null;
  role: string;
  affiliateBondedToPreparerId: string | null;
  userId: string | null;
}

interface User {
  email: string;
}

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
  searchParams: Promise<{
    ref?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    zipCode?: string;
  }>;
}

async function getPreparerByRef(ref: string | undefined) {
  // If no ref, return default preparer (Owliver)
  if (!ref) return DEFAULT_PREPARER;

  try {
    // First try to find a tax preparer or admin with this code
    const { data: preparerProfiles, error: preparerError } = await db
      .from('profiles')
      .select('*, users!inner(email)')
      .or(`tracking_code.eq.${ref},custom_tracking_code.eq.${ref},short_link_username.eq.${ref}`)
      .in('role', ['tax_preparer', 'admin']);

    if (preparerError) throw preparerError;

    const preparerProfile = firstOrNull(preparerProfiles);
    if (preparerProfile && preparerProfile.first_name && preparerProfile.last_name) {
      return {
        firstName: preparerProfile.first_name,
        lastName: preparerProfile.last_name,
        avatarUrl: preparerProfile.avatar_url,
        phone: preparerProfile.phone,
        email: preparerProfile.users?.email,
        trackingCode: preparerProfile.custom_tracking_code || preparerProfile.tracking_code,
      };
    }

    // Check if it's an affiliate code - if so, return default preparer (Owliver)
    const { data: affiliateProfiles, error: affiliateError } = await db
      .from('profiles')
      .select('id, affiliate_bonded_to_preparer_id')
      .or(`tracking_code.eq.${ref},custom_tracking_code.eq.${ref}`)
      .in('role', ['client', 'affiliate']);

    if (affiliateError) throw affiliateError;

    const affiliateProfile = firstOrNull(affiliateProfiles);
    if (affiliateProfile) {
      // If affiliate is bonded to a preparer, return that preparer
      if (affiliateProfile.affiliate_bonded_to_preparer_id) {
        const { data: bondedPreparerData, error: bondedError } = await db
          .from('profiles')
          .select('*, users!inner(email)')
          .eq('id', affiliateProfile.affiliate_bonded_to_preparer_id)
          .single();

        if (bondedError) throw bondedError;

        if (bondedPreparerData && bondedPreparerData.first_name && bondedPreparerData.last_name) {
          return {
            firstName: bondedPreparerData.first_name,
            lastName: bondedPreparerData.last_name,
            avatarUrl: bondedPreparerData.avatar_url,
            phone: bondedPreparerData.phone,
            email: bondedPreparerData.users?.email,
            trackingCode: bondedPreparerData.custom_tracking_code || bondedPreparerData.tracking_code,
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

  // Pre-fill data from landing page
  const initialData = {
    firstName: params.firstName || '',
    lastName: params.lastName || '',
    phone: params.phone || '',
    email: params.email || '',
    zipCode: params.zipCode || '',
  };

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

        <SimpleTaxForm preparer={preparer} initialData={initialData} />
      </div>
    </div>
  );
}
