'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Clear Session Page
 *
 * This page clears all cookies and redirects to login
 * Use this to break redirect loops
 */
export default function ClearSessionPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();

    // Redirect to login after 1 second
    setTimeout(() => {
      router.push('/auth/signin');
    }, 1000);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <h1 className="text-2xl font-bold">Clearing Session...</h1>
        <p className="text-muted-foreground">Redirecting you to login...</p>
      </div>
    </div>
  );
}
