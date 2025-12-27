'use client';

import { useSession } from '@/lib/supabase/useSession';
import { redirect } from 'next/navigation';
import { CreativesLibrary } from '@/components/affiliate/CreativesLibrary';
import { TierProgress } from '@/components/affiliate/TierProgress';

export default function AffiliateCreativesPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Marketing Materials</h1>
          <p className="text-muted-foreground">
            Access banners, email templates, and promotional content
          </p>
        </div>

        {/* Tier Progress */}
        <TierProgress />

        {/* Creatives Library */}
        <CreativesLibrary />
      </div>
    </div>
  );
}
