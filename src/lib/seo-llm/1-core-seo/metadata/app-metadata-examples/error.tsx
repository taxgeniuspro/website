'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console instead of Sentry for now
    console.error('App error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      component: 'app-error-boundary',
      timestamp: new Date().toISOString(),
    })
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">Something went wrong!</h1>

        <p className="mb-6 text-center text-gray-600">
          We've encountered an unexpected error. Our team has been notified and is working on a fix.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-4 rounded-lg bg-gray-100 p-4">
            <p className="text-sm font-mono text-gray-700">{error.message}</p>
            {error.digest && <p className="mt-2 text-xs text-gray-500">Error ID: {error.digest}</p>}
          </div>
        )}

        <div className="flex gap-3">
          <button
            className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-center font-medium text-gray-700 transition-colors hover:bg-gray-300"
            onClick={() => (window.location.href = '/')}
          >
            Go Home
          </button>
          <button
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-blue-700"
            onClick={() => reset()}
          >
            Try Again
          </button>
        </div>

        {error.digest && (
          <p className="mt-4 text-center text-xs text-gray-500">Error reference: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
