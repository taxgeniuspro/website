import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { processPendingNotifications, sendTestEmail } from '@/lib/notification-utils'

export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()

    // Only admins can manually trigger notification processing
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await processPendingNotifications()

    return NextResponse.json({
      success: true,
      message: 'Notifications processed successfully',
      ...result,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process notifications' }, { status: 500 })
  }
}

// Test endpoint for email
export async function GET(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()

    // Only admins can send test emails
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    const result = await sendTestEmail(email)

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Test email sent to ${email}`
        : `Failed to send email: ${result.error}`,
      messageId: result.messageId,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
