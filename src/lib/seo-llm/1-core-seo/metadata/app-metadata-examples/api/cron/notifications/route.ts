import { type NextRequest, NextResponse } from 'next/server'
import { processPendingNotifications } from '@/lib/notification-utils'

// This endpoint can be called by a cron job service
// or Vercel Cron Jobs if deployed on Vercel
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Process pending notifications
    const result = await processPendingNotifications()

    return NextResponse.json({
      success: true,
      message: 'Notifications processed',
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process notifications' }, { status: 500 })
  }
}

// For Vercel Cron Jobs
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
