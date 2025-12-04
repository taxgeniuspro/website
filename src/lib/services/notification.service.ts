import { prisma as db } from '@/lib/db';
import { NotificationType, NotificationChannel, type Notification } from '@prisma/client';
import { EmailService } from './email.service';
import { RealtimeService } from './realtime.service';
import { logger } from '@/lib/logger';

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
  actionUrl?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class NotificationService {
  private static vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  private static vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
  private static vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@taxgenius.com';

  static async send(payload: NotificationPayload): Promise<void> {
    const { userId, type, title, message, channels = ['IN_APP'], metadata, actionUrl } = payload;

    // Create notification in database
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
        read: false,
        channels,
      },
    });

    // Send through each channel
    const promises: Promise<void>[] = [];

    if (channels.includes('IN_APP')) {
      promises.push(this.sendInApp(userId, notification));
    }

    if (channels.includes('EMAIL')) {
      promises.push(this.sendEmail(userId, notification));
    }

    if (channels.includes('PUSH')) {
      promises.push(this.sendPush(userId, notification));
    }

    if (channels.includes('SMS')) {
      promises.push(this.sendSMS(userId, notification));
    }

    await Promise.all(promises);
  }

  private static async sendInApp(userId: string, notification: Notification): Promise<void> {
    // Send via Socket.io for real-time delivery
    RealtimeService.sendNotification(userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    });
  }

  private static async sendEmail(userId: string, notification: Notification): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user?.email) return;

    await EmailService.sendNotificationEmail({
      to: user.email,
      subject: notification.title,
      userName: user.firstName || 'User',
      notificationTitle: notification.title,
      notificationMessage: notification.message,
      actionUrl: notification.metadata?.actionUrl,
    });
  }

  private static async sendPush(userId: string, notification: Notification): Promise<void> {
    // Get user's push subscriptions
    const pushSubscriptions = await db.pushSubscription.findMany({
      where: { userId },
    });

    if (pushSubscriptions.length === 0) return;

    const webpush = await import('web-push');

    webpush.setVapidDetails(this.vapidSubject, this.vapidPublicKey, this.vapidPrivateKey);

    const pushPayload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: notification.id,
      data: {
        notificationId: notification.id,
        actionUrl: notification.metadata?.actionUrl || '/dashboard',
      },
    });

    const pushPromises = pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload
        );
      } catch (error) {
        // Remove invalid subscriptions
        if (
          error &&
          typeof error === 'object' &&
          'statusCode' in error &&
          error.statusCode === 410
        ) {
          await db.pushSubscription.delete({
            where: { id: sub.id },
          });
        }
      }
    });

    await Promise.all(pushPromises);
  }

  private static async sendSMS(userId: string, notification: Notification): Promise<void> {
    // Placeholder for SMS integration (Twilio, etc.)
    logger.info('SMS notification not implemented yet');
  }

  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await db.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await db.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  static async getUserNotifications(userId: string, limit = 20, offset = 0) {
    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const unreadCount = await db.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    return {
      notifications,
      unreadCount,
    };
  }

  static async subscribeToPush(userId: string, subscription: PushSubscription): Promise<void> {
    await db.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
      },
    });
  }

  static async unsubscribeFromPush(userId: string, endpoint: string): Promise<void> {
    await db.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint,
      },
    });
  }

  static async getNotificationPreferences(userId: string) {
    return await db.notificationPreference.findUnique({
      where: { userId },
    });
  }

  static async updateNotificationPreferences(
    userId: string,
    preferences: {
      emailEnabled?: boolean;
      pushEnabled?: boolean;
      smsEnabled?: boolean;
      inAppEnabled?: boolean;
      statusUpdates?: boolean;
      marketingEmails?: boolean;
      securityAlerts?: boolean;
    }
  ) {
    return await db.notificationPreference.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences,
      },
    });
  }
}
