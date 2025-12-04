import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()

  try {
    const requestSource = request.headers.get('X-Request-Source') || 'unknown'
    const userAgent = request.headers.get('User-Agent') || 'unknown'
    const referer = request.headers.get('Referer') || 'unknown'

    // Get all cookies for debugging
    const cookieHeader = request.headers.get('Cookie') || ''
    const cookies = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)

    //   requestId,
    //   cookies: cookies.slice(0),
    //   hasAuthSession: cookies.some((c) => c.startsWith('auth_session=')),
    //   cookieHeader: cookieHeader.substring(0, 200) + (cookieHeader.length > 200 ? '...' : ''),
    // })

    const { user, session } = await validateRequest()

    const responseTime = Date.now() - startTime

    //   requestId,
    //   responseTimeMs: responseTime,
    // })

    if (!user || !session) {
      return NextResponse.json(
        {
          user: null,
          session: null,
          debug: {
            requestId,
            timestamp: new Date().toISOString(),
            reason: !user ? 'no_user' : 'no_session',
            source: requestSource,
          },
        },
        {
          status: 200,
          headers: {
            'X-Request-ID': requestId,
            'X-Response-Time': responseTime.toString(),
            'X-Auth-Status': 'unauthenticated',
          },
        }
      )
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
        debug: {
          requestId,
          timestamp: new Date().toISOString(),
          source: requestSource,
        },
      },
      {
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': responseTime.toString(),
          'X-Auth-Status': 'authenticated',
        },
      }
    )
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorDetails = {
      requestId,
      message: error instanceof Error ? error.message : 'Unknown error',
      code: error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined,
      name: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
      responseTime,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
        timestamp: new Date().toISOString(),
        debug: errorDetails,
      },
      {
        status: 500,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': responseTime.toString(),
          'X-Auth-Status': 'error',
        },
      }
    )
  }
}
