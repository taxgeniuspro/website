'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Bell, Loader2 } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function NotificationSettingsCard() {
  const { pushSubscription, subscribeToPush, unsubscribeFromPush } = usePWA();
  const [isLoading, setIsLoading] = useState(false);

  const handlePushToggle = async (checked: boolean) => {
    setIsLoading(true);
    try {
      if (checked) {
        await subscribeToPush();
      } else {
        await unsubscribeFromPush();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <CardTitle>Push Notifications</CardTitle>
        </div>
        <CardDescription>Receive instant updates on your device</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              Enable Push Notifications
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified about important updates, messages, and deadlines
            </p>
          </div>
          <Switch
            checked={!!pushSubscription}
            onCheckedChange={handlePushToggle}
            disabled={isLoading}
          />
        </div>

        <Separator />

        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">When enabled, you&apos;ll receive:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Tax return status updates</li>
            <li>Important deadline reminders</li>
            <li>Messages from your tax preparer</li>
            <li>Document request notifications</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
