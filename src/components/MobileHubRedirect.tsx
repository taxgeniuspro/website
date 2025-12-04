'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * Mobile Hub Redirect Component
 *
 * Redirects logged-in mobile users to /quick-share from homepage
 * (previously redirected to /mobile-hub)
 */
export function MobileHubRedirect() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoaded = status !== 'loading';
  const isSignedIn = !!session?.user;

  useEffect(() => {
    // Wait for auth to load
    if (!isLoaded) return;

    // Only redirect if signed in
    if (!isSignedIn) return;

    // Check if on mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Check if user disabled mobile redirect (localStorage)
    const mobileRedirectDisabled = localStorage.getItem('mobile_redirect_disabled') === 'true';

    // Redirect mobile users to quick share page
    if (isMobile && !mobileRedirectDisabled) {
      router.push('/quick-share');
    }
  }, [isLoaded, isSignedIn, router]);

  return null; // This component doesn't render anything
}
