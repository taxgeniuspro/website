import { type NextRequest, NextResponse } from 'next/server'
import { verifyMagicLink } from '@/lib/auth'
import { z } from 'zod'

const verifyMagicLinkSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, email } = verifyMagicLinkSchema.parse(body)

    const { user, session } = await verifyMagicLink(token, email)

    return NextResponse.json(
      {
        message: 'Authentication successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return NextResponse.json(
        {
          error: 'Invalid or expired magic link',
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        error: 'Authentication failed',
      },
      { status: 500 }
    )
  }
}
