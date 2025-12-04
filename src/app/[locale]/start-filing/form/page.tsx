import { Metadata } from 'next';
import { Suspense } from 'react';
import SimpleTaxForm from '@/components/SimpleTaxForm';
import { ShortLinkTracker } from '@/components/tracking/ShortLinkTracker';
import { prisma } from '@/lib/prisma';

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
  if (!ref) return null;

  try {
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { trackingCode: ref },
          { customTrackingCode: ref },
        ],
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!profile) return null;

    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      email: profile.user?.email,
    };
  } catch (error) {
    console.error('Error fetching preparer:', error);
    return null;
  }
}

export default async function TaxFormPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preparer = await getPreparerByRef(params.ref);

  return (
    <div className="min-h-screen bg-background py-12">
      {/* Track short link clicks */}
      <Suspense fallback={null}>
        <ShortLinkTracker />
      </Suspense>

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3">Start Your Tax Return</h1>
          <p className="text-lg text-muted-foreground">
            Answer a few quick questions. No signup required to start.
          </p>
        </div>

        <SimpleTaxForm preparer={preparer} />
      </div>
    </div>
  );
}
