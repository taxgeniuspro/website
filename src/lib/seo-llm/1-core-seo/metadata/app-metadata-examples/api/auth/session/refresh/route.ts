import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest, lucia } from '@/lib/auth'
import { authLogger } from '@/lib/logger-safe'
import { SESSION_CONFIG } from '@/lib/constants'

/**
 * POST /api/auth/session/refresh
 *
 * Refresh the current session to extend its lifetime.
 * This endpoint can be called by the frontend to keep active users logged in.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate the current session
    const { user, session } = await validateRequest()

    if (!user || !session) {
      authLogger.debug('Session refresh attempted without valid session')
      return NextResponse.json(
        {
          error: 'No valid session found',
          code: 'NO_SESSION',
        },
        { status: 401 }
      )
    }

    // Check if session is still valid and not expired
    const now = new Date()
    if (session.expiresAt <= now) {
      authLogger.debug(`Session refresh attempted on expired session: ${session.id}`)
      return NextResponse.json(
        {
          error: 'Session has expired',
          code: 'SESSION_EXPIRED',
        },
        { status: 401 }
      )
    }

    // Calculate time until expiry
    const timeUntilExpiry = session.expiresAt.getTime() - now.getTime()
    const hoursUntilExpiry = Math.round(timeUntilExpiry / (1000 * 60 * 60))

    // Always extend the session when explicitly requested
    const sessionCookie = lucia.createSessionCookie(session.id)

    // Set the new session cookie
    const response = NextResponse.json({
      success: true,
      session: {
        id: session.id,
        expiresAt: session.expiresAt.toISOString(),
        hoursUntilExpiry,
        extended: true,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    authLogger.debug(`Session ${session.id} refreshed for user ${user.email}`, {
      userId: user.id,
      sessionId: session.id,
      hoursUntilExpiry,
    })

    return response
  } catch (error) {
    authLogger.error('Session refresh error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error during session refresh',
        code: 'REFRESH_ERROR',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/session/refresh
 *
 * Get the current session status without refreshing it.
 * Useful for checking if a session is valid and how much time is left.
 */
export async function GET(): Promise<unknown> {
  try {
    const { user, session } = await validateRequest()

    if (!user || !session) {
      return NextResponse.json(
        {
          authenticated: false,
          session: null,
          user: null,
        },
        { status: 200 }
      )
    }

    const now = new Date()
    const timeUntilExpiry = session.expiresAt.getTime() - now.getTime()
    const hoursUntilExpiry = Math.round(timeUntilExpiry / (1000 * 60 * 60))
    const daysUntilExpiry = Math.round(timeUntilExpiry / (1000 * 60 * 60 * 24))

    // Determine if session should be refreshed soon
    const shouldRefreshSoon = timeUntilExpiry < SESSION_CONFIG.EXTENSION_WINDOW_MS
    const isExpiringSoon = timeUntilExpiry < 7 * 24 * 60 * 60 * 1000 // 7 days

    return NextResponse.json({
      authenticated: true,
      session: {
        id: session.id,
        expiresAt: session.expiresAt.toISOString(),
        timeUntilExpiry: Math.max(0, timeUntilExpiry),
        hoursUntilExpiry: Math.max(0, hoursUntilExpiry),
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
        shouldRefreshSoon,
        isExpiringSoon,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    })
  } catch (error) {
    authLogger.error('Session status check error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error during session check',
        code: 'STATUS_CHECK_ERROR',
      },
      { status: 500 }
    )
  }
}
