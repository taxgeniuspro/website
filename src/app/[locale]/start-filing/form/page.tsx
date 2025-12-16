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
      phone: profile.phone,
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
  const preparerName = preparer ? `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim() : null;

  return (
    <div className="min-h-screen bg-background py-12">
      {/* Track short link clicks */}
      <Suspense fallback={null}>
        <ShortLinkTracker />
      </Suspense>

      <div className="container mx-auto px-4">
        {/* Mobile-first: Preparer card prominently at top on mobile */}
        {preparer && (
          <div className="lg:hidden max-w-4xl mx-auto mb-6">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-4">
                {preparer.avatarUrl ? (
                  <img
                    src={preparer.avatarUrl}
                    alt={preparerName || 'Tax Preparer'}
                    className="w-16 h-16 rounded-full object-cover border-3 border-primary/30 shadow-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-3 border-primary/30 flex-shrink-0">
                    <span className="text-lg font-bold text-primary">
                      {preparer.firstName?.[0]}{preparer.lastName?.[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Your Tax Professional</p>
                  <p className="font-bold text-lg text-foreground truncate">{preparerName}</p>
                  {preparer.phone && (
                    <a
                      href={`tel:${preparer.phone.replace(/[^+\d]/g, '')}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {preparer.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
