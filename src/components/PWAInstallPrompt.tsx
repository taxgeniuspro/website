'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Bell, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePWA } from '@/hooks/usePWA';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const {
    isInstalled,
    isOffline,
    canInstall,
    updateAvailable,
    pushSubscription,
    installApp,
    subscribeToPush,
    updateApp,
  } = usePWA();

  useEffect(() => {
    // Install prompt disabled - now shown in sidebar instead
    // if (!isInstalled && canInstall) {
    //   const timer = setTimeout(() => {
    //     setShowPrompt(true);
    //   }, 30000);
    //
    //   return () => clearTimeout(timer);
    // }
  }, [isInstalled, canInstall]);

  useEffect(() => {
    // Show notification prompt after install
    if (isInstalled && !pushSubscription) {
      const timer = setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isInstalled, pushSubscription]);

  const handleInstall = async () => {
    await installApp();
    setShowPrompt(false);

    // Show notification prompt after install
    setTimeout(() => {
      setShowNotificationPrompt(true);
    }, 2000);
  };

  const handleEnableNotifications = async () => {
    await subscribeToPush();
    setShowNotificationPrompt(false);
  };

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="fixed bottom-4 left-4 z-50">
      {isOffline && (
        <Badge variant="destructive" className="flex items-center gap-2">
          <WifiOff className="h-3 w-3" />
          Offline Mode
        </Badge>
      )}
      {!isOffline && updateAvailable && (
        <Badge
          variant="default"
          className="flex items-center gap-2 cursor-pointer"
          onClick={updateApp}
        >
          <Download className="h-3 w-3" />
          Update Available
        </Badge>
      )}
    </div>
  );

  return (
    <>
      <ConnectionStatus />

      {/* Install Prompt - DISABLED: Now shown in sidebar */}
      {/* {showPrompt && canInstall && !isInstalled && (
        ...
      )} */}

      {/* Notification Prompt */}
      {showNotificationPrompt && !pushSubscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setShowNotificationPrompt(false)}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Bell className="h-8 w-8 text-primary" />
              </div>

              <div>
                <h3 className="text-lg font-semibold">Stay Updated</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Enable notifications to receive important updates about your tax returns and
                  deadlines.
                </p>
              </div>

              <div className="space-y-2 w-full">
                <div className="flex items-start gap-3 text-left">
                  <Bell className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm">Tax return status updates</p>
                </div>
                <div className="flex items-start gap-3 text-left">
                  <Bell className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm">Important deadline reminders</p>
                </div>
                <div className="flex items-start gap-3 text-left">
                  <Bell className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm">Messages from your tax preparer</p>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowNotificationPrompt(false)}
                >
                  Maybe Later
                </Button>
                <Button className="flex-1" onClick={handleEnableNotifications}>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
