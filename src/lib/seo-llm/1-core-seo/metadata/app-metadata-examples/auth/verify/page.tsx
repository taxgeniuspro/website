import { Suspense } from 'react'
import Link from 'next/link'

function getErrorTitle(errorCode: string): string {
  switch (errorCode) {
    case 'TOKEN_NOT_FOUND':
      return 'Magic Link Invalid'
    case 'TOKEN_EXPIRED':
      return 'Magic Link Expired'
    case 'INVALID_TOKEN_FORMAT':
    case 'INVALID_EMAIL_FORMAT':
      return 'Magic Link Corrupted'
    case 'USER_CREATION_FAILED':
      return 'Account Error'
    case 'SESSION_CREATION_FAILED':
      return 'Authentication Error'
    case 'missing_params':
      return 'Invalid Link'
    default:
      return 'Invalid or Expired Link'
  }
}

function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'TOKEN_NOT_FOUND':
      return 'This magic link is invalid or has already been used. Please request a new one.'
    case 'TOKEN_EXPIRED':
      return 'This magic link has expired. Please request a new one.'
    case 'INVALID_TOKEN_FORMAT':
    case 'INVALID_EMAIL_FORMAT':
      return 'This magic link appears to be corrupted. Please request a new one.'
    case 'USER_CREATION_FAILED':
      return 'There was a problem with your account. Please try again or contact support.'
    case 'SESSION_CREATION_FAILED':
      return 'Authentication succeeded but failed to create session. Please try signing in again.'
    case 'missing_params':
      return 'The magic link is missing required information. Please request a new one.'
    default:
      return 'The magic link has expired or is invalid. Please request a new one.'
  }
}

interface VerifyPageProps {
  searchParams: Promise<{
    error?: string
  }>
}

async function VerifyContent({ searchParams }: VerifyPageProps) {
  const { error } = await searchParams

  if (!error) {
    // If no error, show loading/processing state (shouldn't normally reach here)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing magic link...</p>
        </div>
      </div>
    )
  }

  const errorTitle = getErrorTitle(error)
  const errorMessage = getErrorMessage(error)

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">{errorTitle}</h1>
        <p className="text-gray-600 mb-6">{errorMessage}</p>
        <Link
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          href="/auth/signin"
        >
          Request New Magic Link
        </Link>
      </div>
    </div>
  )
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying your magic link...</p>
          </div>
        </div>
      }
    >
      <VerifyContent searchParams={searchParams} />
    </Suspense>
  )
}
