import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

// Force all routes to be dynamic to fix build issue
export { dynamic, dynamicParams, revalidate } from './force-dynamic'
import { Providers } from './providers'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { OfflineIndicator } from '@/components/pwa/offline-indicator'
import GoogleAnalytics from '@/components/GoogleAnalytics'
// Performance monitor temporarily disabled to fix signin page issues
// import { ErrorBoundary } from '@/components/error-boundary'
import { ThemeInjector } from '@/components/theme/theme-injector'
// import { ErrorHandler } from '@/components/error-handler' // TEMPORARILY DISABLED TO FIX WEBPACK ERROR

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'], // Only load needed weights for optimal performance
  variable: '--font-sans',
  display: 'swap', // Prevents font preload warnings and improves performance
})

export const metadata: Metadata = {
  title: 'GangRun Printing - Professional Print Services',
  description: 'High-quality printing services for all your business and personal needs',
  icons: {
    icon: '/favicon-100x100.png',
    apple: '/gangrunprinting_logo_new_1448921366__42384-200x200.png',
  },
  verification: {
    other: {
      'msvalidate.01': '19980A99065099539727B74085BF9DB9',
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Use environment-specific Square SDK URL
  const squareSdkUrl =
    process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js'

  return (
    <html suppressHydrationWarning lang="en">
      <head>
        {/* Square Web Payments SDK - Load early for checkout performance */}
        <Script src={squareSdkUrl} strategy="beforeInteractive" />

        {/* Ahrefs Web Analytics - Track backlinks, LLM traffic, and referrers */}
        <Script
          data-key="xmoVXl4/lDVkojG39HWDvQ"
          src="https://analytics.ahrefs.com/analytics.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <GoogleAnalytics />
        <ThemeInjector />
        {/* <ErrorHandler /> TEMPORARILY DISABLED TO FIX WEBPACK ERROR */}
        <OfflineIndicator />
        {/* Performance monitor disabled to fix signin issues */}
        {/* ErrorBoundary temporarily disabled for build */}
        <Providers>{children}</Providers>
        <InstallPrompt />
      </body>
    </html>
  )
}
