import { db, firstOrNull } from '@/lib/db';
import { EmailService } from './email.service';
import { RealtimeService } from './realtime.service';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type NotificationType =
  | 'SYSTEM'
  | 'ALERT'
  | 'INFO'
  | 'WARNING'
  | 'SUCCESS'
  | 'ERROR'
  | 'MESSAGE'
  | 'TASK'
  | 'REMINDER'
  | 'UPDATE';

type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  readAt?: Date | string | null;
  channels: NotificationChannel[];
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date | string;
}

interface NotificationPreferenceRecord {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  statusUpdates: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

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
    const { data: notificationData, error } = await db
      .from('notifications')
      .insert({
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
        read: false,
        channels,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !notificationData) {
      logger.error('Failed to create notification:', error);
      throw new Error('Failed to create notification');
    }

    const notification = notificationData as Notification;

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
    const { data: userData } = await db
      .from('users')
      .select('email, firstName')
      .eq('id', userId)
      .limit(1);

    const user = firstOrNull(userData) as { email: string; firstName?: string } | null;

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
    const { data: pushSubscriptions } = await db
      .from('push_subscriptions')
      .select('*')
      .eq('userId', userId);

    if (!pushSubscriptions || pushSubscriptions.length === 0) return;

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

    const pushPromises = pushSubscriptions.map(async (sub: PushSubscriptionRecord) => {
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
          await db
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
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
    await db
      .from('notifications')
      .update({
        read: true,
        readAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('userId', userId);
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await db
      .from('notifications')
      .update({
        read: true,
        readAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('userId', userId)
      .eq('read', false);
  }

  static async getUserNotifications(userId: string, limit = 20, offset = 0) {
    const { data: notifications } = await db
      .from('notifications')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    const { count: unreadCount } = await db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('userId', userId)
      .eq('read', false);

    return {
      notifications: (notifications || []) as Notification[],
      unreadCount: unreadCount || 0,
    };
  }

  static async subscribeToPush(userId: string, subscription: PushSubscription): Promise<void> {
    // Check if subscription exists
    const { data: existingData } = await db
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .limit(1);

    const existing = firstOrNull(existingData);

    if (existing) {
      // Update existing
      await db
        .from('push_subscriptions')
        .update({
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userId,
        })
        .eq('endpoint', subscription.endpoint);
    } else {
      // Create new
      await db.from('push_subscriptions').insert({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
        createdAt: new Date().toISOString(),
      });
    }
  }

  static async unsubscribeFromPush(userId: string, endpoint: string): Promise<void> {
    await db
      .from('push_subscriptions')
      .delete()
      .eq('userId', userId)
      .eq('endpoint', endpoint);
  }

  static async getNotificationPreferences(userId: string) {
    const { data } = await db
      .from('notification_preferences')
      .select('*')
      .eq('userId', userId)
      .limit(1);

    return firstOrNull(data) as NotificationPreferenceRecord | null;
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
    // Check if preferences exist
    const { data: existingData } = await db
      .from('notification_preferences')
      .select('id')
      .eq('userId', userId)
      .limit(1);

    const existing = firstOrNull(existingData);

    if (existing) {
      // Update existing
      const { data: updated } = await db
        .from('notification_preferences')
        .update({
          ...preferences,
          updatedAt: new Date().toISOString(),
        })
        .eq('userId', userId)
        .select()
        .single();

      return updated as NotificationPreferenceRecord;
    } else {
      // Create new
      const { data: created } = await db
        .from('notification_preferences')
        .insert({
          userId,
          ...preferences,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      return created as NotificationPreferenceRecord;
    }
  }
}
