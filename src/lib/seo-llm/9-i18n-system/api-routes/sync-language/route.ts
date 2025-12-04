import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { cookies } from 'next/headers'

/**
 * Sync user's preferred language to NEXT_LOCALE cookie
 * This endpoint should be called after login to apply the user's saved language preference
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // User's preferred language is already available from validateRequest
    // Set the NEXT_LOCALE cookie to match user's preference
    const preferredLanguage = user.preferredLanguage || 'en'

    const cookieStore = await cookies()
    cookieStore.set('NEXT_LOCALE', preferredLanguage, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
      sameSite: 'lax',
    })

    return NextResponse.json({
      success: true,
      locale: preferredLanguage,
    })
  } catch (error) {
    console.error('Error syncing language preference:', error)
    return NextResponse.json({ error: 'Failed to sync language' }, { status: 500 })
  }
}
