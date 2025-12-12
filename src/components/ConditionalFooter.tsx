'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Footer, type FooterPreparerInfo } from '@/components/footer';

/**
 * Inner component that uses useSearchParams
 */
function ConditionalFooterInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [preparer, setPreparer] = useState<FooterPreparerInfo | null>(null);

  // Get preparer ref from URL (used on intake forms, booking pages, etc.)
  const preparerRef = searchParams?.get('ref');

  // Fetch preparer data when ref is present
  useEffect(() => {
    async function fetchPreparerData() {
      if (!preparerRef) {
        setPreparer(null);
        return;
      }

      try {
        // Fetch preparer data by tracking code or username
        const response = await fetch(`/api/preparers/by-ref/${preparerRef}`);
        if (response.ok) {
          const data = await response.json();
          setPreparer({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.user?.email,
            phone: data.phone,
            publicAddress: data.publicAddress,
            facebookUrl: data.facebookUrl,
            instagramUrl: data.instagramUrl,
            linkedinUrl: data.linkedinUrl,
            twitterUrl: data.twitterUrl,
            youtubeUrl: data.youtubeUrl,
            tiktokUrl: data.tiktokUrl,
          });
        }
      } catch (error) {
        console.error('Failed to fetch preparer data for footer:', error);
        setPreparer(null);
      }
    }

    fetchPreparerData();
  }, [preparerRef]);

  // Routes where footer should be hidden (lead/intake pages)
  const hideFooterRoutes = ['/start-filing/form', '/book-appointment', '/book'];

  // Check if current route should hide footer
  const shouldHideFooter = hideFooterRoutes.some((route) => pathname?.startsWith(route));

  // Don't render footer on lead/intake pages
  if (shouldHideFooter) {
    return null;
  }

  return <Footer preparer={preparer} />;
}

/**
 * Conditionally renders the footer based on the current route.
 * Hides footer on lead/intake pages for a cleaner, distraction-free experience.
 * Fetches preparer data when a ref parameter is present in the URL.
 * Wrapped in Suspense boundary for Next.js 15 compatibility with useSearchParams.
 */
export function ConditionalFooter() {
  return (
    <Suspense fallback={<Footer />}>
      <ConditionalFooterInner />
    </Suspense>
  );
}
