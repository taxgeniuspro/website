'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, Suspense } from 'react';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import dynamic from 'next/dynamic';

// Dynamically import DevTools to prevent chunk loading errors
const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools').then((mod) => ({ default: mod.ReactQueryDevtools })),
  {
    ssr: false,
    loading: () => null,
  }
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PWAInstallPrompt />
      {children}
      {process.env.NODE_ENV === 'development' && (
        <Suspense fallback={null}>
          <ReactQueryDevtools />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
