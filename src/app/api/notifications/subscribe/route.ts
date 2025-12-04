import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { NotificationService } from '@/lib/services/notification.service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await request.json();

    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    // Save subscription to database
    await NotificationService.subscribeToPush(user.id, subscription);

    // Send welcome notification
    await NotificationService.send({
      userId: user.id,
      type: 'SYSTEM',
      title: 'Notifications Enabled',
      message: "You'll now receive important updates about your tax returns.",
      channels: ['PUSH'],
    });

    return NextResponse.json({
      success: true,
      message: 'Push subscription saved successfully',
    });
  } catch (error) {
    logger.error('Push subscription error:', error);
    return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 });
  }
}
