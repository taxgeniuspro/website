'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  // Check if app is installed
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if app is installed via beforeinstallprompt
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };

    window.addEventListener('appinstalled', checkInstalled);
    return () => window.removeEventListener('appinstalled', checkInstalled);
  }, []);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    // PWA/Service Worker temporarily disabled
    // TODO: Re-enable once sw.js is properly configured
    // if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    //   navigator.serviceWorker
    //     .register('/sw.js')
    //     .then((reg) => {
    //       setRegistration(reg);
    //
    //       // Check for updates
    //       reg.addEventListener('updatefound', () => {
    //         const newWorker = reg.installing;
    //         if (newWorker) {
    //           newWorker.addEventListener('statechange', () => {
    //             if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
    //               setUpdateAvailable(true);
    //               toast({
    //                 title: 'Update Available',
    //                 description: 'A new version is available. Refresh to update.',
    //                 action: {
    //                   label: 'Refresh',
    //                   onClick: () => window.location.reload(),
    //                 },
    //               });
    //             }
    //           });
    //         }
    //       });
    //     })
    //     .catch((error) => {
    //       logger.error('Service worker registration failed:', error);
    //     });
    // }
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast({
        title: 'Back Online',
        description: 'Your connection has been restored.',
      });

      // Trigger background sync
      if (registration?.sync) {
        registration.sync.register('sync-documents');
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast({
        title: "You're Offline",
        description: "Don't worry, your work will be saved locally.",
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [registration]);

  // Install app
  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      toast({
        title: 'Already Installed',
        description: 'Tax Genius Pro is already installed on your device.',
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      toast({
        title: 'App Installed',
        description: 'Tax Genius Pro has been added to your home screen.',
      });
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    if (!registration) {
      toast({
        title: 'Not Ready',
        description: 'Service worker is not registered yet.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        logger.error('VAPID public key not configured');
        return null;
      }

      // Convert VAPID key from base64 to Uint8Array
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      setPushSubscription(subscription);

      // Send subscription to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      toast({
        title: 'Notifications Enabled',
        description: "You'll receive important updates and reminders.",
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to subscribe to push notifications:', error);
      toast({
        title: 'Notification Error',
        description: 'Could not enable push notifications.',
        variant: 'destructive',
      });
      return null;
    }
  }, [registration]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async () => {
    if (!pushSubscription) return;

    try {
      await pushSubscription.unsubscribe();
      setPushSubscription(null);

      // Notify server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: pushSubscription.endpoint,
        }),
      });

      toast({
        title: 'Notifications Disabled',
        description: "You won't receive push notifications anymore.",
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications:', error);
      toast({
        title: 'Error',
        description: 'Could not disable push notifications.',
        variant: 'destructive',
      });
    }
  }, [pushSubscription]);

  // Clear cache
  const clearCache = useCallback(async () => {
    if (!registration) return;

    try {
      // Send message to service worker to clear cache
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CACHE',
        });
      }

      // Also clear from the main thread
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      toast({
        title: 'Cache Cleared',
        description: 'All cached data has been removed.',
      });
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      toast({
        title: 'Error',
        description: 'Could not clear cache.',
        variant: 'destructive',
      });
    }
  }, [registration]);

  // Update app
  const updateApp = useCallback(() => {
    if (updateAvailable && registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [updateAvailable, registration]);

  return {
    isInstalled,
    isOffline,
    canInstall: !!deferredPrompt,
    updateAvailable,
    pushSubscription,
    installApp,
    subscribeToPush,
    unsubscribeFromPush,
    clearCache,
    updateApp,
  };
}

// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
