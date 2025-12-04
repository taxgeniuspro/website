import { type NextRequest, NextResponse } from 'next/server'
import { verifyMagicLink, lucia } from '@/lib/auth'
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // Apply rate limiting for auth endpoints
  const rateLimitResponse = await withRateLimit(request, {
    ...RateLimitPresets.auth,
    prefix: 'auth-verify',
  })
  if (rateLimitResponse) return rateLimitResponse

  const requestId = Math.random().toString(36).substring(7)
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  // Security: Don't log sensitive user information
  if (!token || !email) {
    return NextResponse.redirect(new URL('/auth/verify?error=missing_params', request.url))
  }

  try {
    const { user, session } = await verifyMagicLink(token, email)

    // Log success without exposing user ID

    // Create the redirect response
    const redirectUrl = new URL('/account/dashboard', request.url)
    const response = NextResponse.redirect(redirectUrl)

    // Manually set the session cookie to ensure it's properly included in the redirect
    const sessionCookie = lucia.createSessionCookie(session.id)
    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    // Log cookie set without exposing details

    // Add a small delay to ensure database operations are committed
    // This prevents race conditions where the redirect happens before session is fully committed
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Log completion

    return response
  } catch (error) {
    let errorCode = 'unknown'
    if (error && typeof error === 'object' && 'code' in error) {
      errorCode = String(error.code)
    }

    return NextResponse.redirect(new URL(`/auth/verify?error=${errorCode}`, request.url))
  }
}
