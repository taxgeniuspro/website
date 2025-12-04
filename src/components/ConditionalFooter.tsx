'use client';

import { usePathname } from 'next/navigation';
import { Footer } from '@/components/footer';

/**
 * Conditionally renders the footer based on the current route.
 * Hides footer on lead/intake pages for a cleaner, distraction-free experience.
 */
export function ConditionalFooter() {
  const pathname = usePathname();

  // Routes where footer should be hidden (lead/intake pages)
  const hideFooterRoutes = ['/start-filing/form', '/book-appointment', '/book'];

  // Check if current route should hide footer
  const shouldHideFooter = hideFooterRoutes.some((route) => pathname?.startsWith(route));

  // Don't render footer on lead/intake pages
  if (shouldHideFooter) {
    return null;
  }

  return <Footer />;
}
