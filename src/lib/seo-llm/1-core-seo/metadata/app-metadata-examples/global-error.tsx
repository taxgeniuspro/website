'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Critical: Global errors indicate severe issues
    // Log to console instead of Sentry for now
    console.error('Global error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      severity: 'critical',
      component: 'global-error-boundary',
      timestamp: new Date().toISOString(),
    })
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-red-50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
            </div>

            <h1 className="mb-3 text-center text-3xl font-bold text-gray-900">
              Critical System Error
            </h1>

            <p className="mb-6 text-center text-gray-600">
              We're experiencing a critical issue. Our engineering team has been alerted and is
              investigating immediately.
            </p>

            <div className="mb-6 rounded-lg bg-red-50 p-4">
              <p className="text-sm text-red-700">
                <strong>What happened?</strong> The application encountered a critical error and
                cannot continue.
              </p>
              <p className="mt-2 text-sm text-red-700">
                <strong>What can you do?</strong> Please try refreshing the page or contact support
                if the issue persists.
              </p>
            </div>

            {error.digest && (
              <div className="mb-6 rounded-lg bg-gray-100 p-3">
                <p className="text-center text-xs text-gray-600">
                  Reference ID: <span className="font-mono">{error.digest}</span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="flex-1 rounded-lg bg-gray-600 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-gray-700"
                onClick={() => {
                  window.location.href = '/'
                }}
              >
                Return Home
              </button>
              <button
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-red-700"
                onClick={() => reset()}
              >
                Retry
              </button>
            </div>

            <div className="mt-6 text-center">
              <a
                className="text-sm text-blue-600 hover:text-blue-700"
                href="mailto:support@gangrunprinting.com"
              >
                Contact Support →
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
