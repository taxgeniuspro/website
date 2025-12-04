'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * Legacy /auth/login route - Redirects to /auth/signin
 *
 * This page exists for backward compatibility.
 * All authentication now uses NextAuth at /auth/signin
 */
function LoginRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth.login');

  useEffect(() => {
    // Preserve all query parameters when redirecting
    const params = new URLSearchParams(searchParams.toString());
    const redirectUrl = `/auth/signin${params.toString() ? `?${params.toString()}` : ''}`;

    router.replace(redirectUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{t('redirecting')}</p>
      </div>
    </div>
  );
}

function LoginRedirectFallback() {
  const t = useTranslations('auth.login');

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    </div>
  );
}

export default function LoginRedirectPage() {
  return (
    <Suspense fallback={<LoginRedirectFallback />}>
      <LoginRedirectContent />
    </Suspense>
  );
}
