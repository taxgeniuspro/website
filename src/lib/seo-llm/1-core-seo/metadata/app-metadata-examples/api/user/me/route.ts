import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'

// GET - Get current user information
export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest()

    if (!user) {
      return NextResponse.json({ user: null })
    }

    // Return only safe user data
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
      },
    })
  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}
