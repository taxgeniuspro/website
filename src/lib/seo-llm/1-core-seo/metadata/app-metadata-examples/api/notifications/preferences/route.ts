import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In a real app, you'd fetch from database
    // For now, return default preferences
    const defaultPreferences = {
      'order-updates': true,
      'shipping-updates': true,
      promotional: false,
      'design-ready': true,
    }

    return NextResponse.json({
      preferences: defaultPreferences,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { preferences } = await request.json()

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences data' }, { status: 400 })
    }

    // In a real app, you'd save to database
    // For now, just return success

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
