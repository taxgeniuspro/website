import { type NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const result = await signOut()

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    return NextResponse.json({ message: 'Successfully signed out' }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }
}
