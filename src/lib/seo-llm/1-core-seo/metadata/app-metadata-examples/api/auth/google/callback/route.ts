import { google, type GoogleUser } from '@/lib/google-oauth'
import { cookies } from 'next/headers'
import { OAuth2RequestError, decodeIdToken } from 'arctic'
import { lucia } from '@/lib/auth'
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const storedState = (await cookies()).get('google_oauth_state')?.value ?? null
  const storedCodeVerifier = (await cookies()).get('google_oauth_code_verifier')?.value ?? null

  if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://gangrunprinting.com'
    return NextResponse.redirect(`${baseUrl}/auth/signin?error=invalid_request`)
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier)

    // Arctic returns tokens as methods, not properties
    let accessToken: string
    let idToken: string | null = null
    let refreshToken: string | null = null
    let expiresAt: Date | null = null

    try {
      accessToken = tokens.accessToken()
    } catch (e) {
      throw new Error('Failed to extract access token from OAuth response')
    }

    try {
      idToken = tokens.idToken()
    } catch (e) {}

    try {
      refreshToken = tokens.refreshToken()
    } catch (e) {}

    try {
      expiresAt = tokens.accessTokenExpiresAt()
    } catch (e) {}

    // Try to get user info from ID token first
    let googleUser: GoogleUser | undefined

    if (idToken) {
      try {
        const claims = decodeIdToken(idToken) as any

        googleUser = {
          sub: claims.sub,
          email: claims.email,
          email_verified: claims.email_verified || false,
          name: claims.name || claims.email,
          given_name: claims.given_name || '',
          family_name: claims.family_name || '',
          picture: claims.picture || '',
          locale: claims.locale || 'en',
        }
      } catch (e) {
        idToken = null // Reset to trigger API call below
      }
    }

    // Fall back to fetching from userinfo endpoint if no ID token or if decoding failed
    if (!googleUser) {
      const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`)
      }

      googleUser = await response.json()
    }

    if (!googleUser || !googleUser.email) {
      throw new Error('No email received from Google OAuth')
    }

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    })

    if (!user) {
      // Create new user
      const role = googleUser.email === 'iradwatkins@gmail.com' ? 'ADMIN' : 'CUSTOMER'

      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`
      user = await prisma.user.create({
        data: {
          id: userId,
          email: googleUser.email,
          name: googleUser.name,
          image: googleUser.picture,
          emailVerified: googleUser.email_verified,
          role,
          updatedAt: new Date(),
        },
      })

      // Create Google account link
      const accountId = `account_${Date.now()}_${Math.random().toString(36).substring(7)}`
      await prisma.account.create({
        data: {
          id: accountId,
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: googleUser.sub,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null,
          token_type: 'Bearer',
          scope: 'profile email',
          updatedAt: new Date(),
        },
      })
    } else {
      // Update existing user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: googleUser.name,
          image: googleUser.picture,
          emailVerified: googleUser.email_verified,
        },
      })

      // Update or create account link
      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: googleUser.sub,
          },
        },
      })

      if (!existingAccount) {
        const accountId2 = `account_${Date.now()}_${Math.random().toString(36).substring(7)}`
        await prisma.account.create({
          data: {
            id: accountId2,
            userId: user.id,
            type: 'oauth',
            provider: 'google',
            providerAccountId: googleUser.sub,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null,
            token_type: 'Bearer',
            scope: 'profile email',
            updatedAt: new Date(),
          },
        })
      } else {
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null,
          },
        })
      }
    }

    // Create session with enhanced cookie settings
    const session = await lucia.createSession(user.id, {})
    const sessionCookie = lucia.createSessionCookie(session.id)

    // Redirect based on user role with improved logic
    const redirectPath = user.role === 'ADMIN' ? '/admin/dashboard' : '/account/dashboard'

    // Use consistent base URL resolution
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://gangrunprinting.com'

    // CRITICAL FIX: Create response with redirect FIRST, then set cookie on the response
    const response = NextResponse.redirect(`${baseUrl}${redirectPath}`)

    // Build cookie string manually for Set-Cookie header (Next.js 15 requirement)
    const cookieValue = `${sessionCookie.name}=${sessionCookie.value}`
    const cookieAttributes = [
      `Max-Age=${60 * 60 * 24 * 90}`, // 90 days
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
    ]

    if (process.env.NODE_ENV === 'production') {
      cookieAttributes.push('Secure')
      cookieAttributes.push('Domain=gangrunprinting.com')
    }

    const cookieString = `${cookieValue}; ${cookieAttributes.join('; ')}`

    // Set cookie on response object
    response.headers.set('Set-Cookie', cookieString)

    //   cookieName: sessionCookie.name,
    //   cookieLength: sessionCookie.value.length,
    //   domain: process.env.NODE_ENV === 'production' ? 'gangrunprinting.com' : 'localhost',
    //   redirectTo: redirectPath,
    // })

    return response
  } catch (error) {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://gangrunprinting.com'

    // Enhanced error logging for debugging
    console.error('[Google OAuth] Authentication failed:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })

    if (error instanceof OAuth2RequestError) {
      console.error('[Google OAuth] OAuth2RequestError details:', {
        code: error.code,
        description: error.description,
      })
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=oauth_error`)
    }

    return NextResponse.redirect(`${baseUrl}/auth/signin?error=server_error`)
  }
}
