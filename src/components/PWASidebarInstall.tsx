'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'pwa_install_last_shown';
const COOLDOWN_HOURS = 36;

export function PWASidebarInstall() {
  const [showInstall, setShowInstall] = useState(false);
  const { isInstalled, canInstall, installApp } = usePWA();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  useEffect(() => {
    // Don't show if already installed
    if (isInstalled) {
      setShowInstall(false);
      return;
    }

    // Don't show if can't install
    if (!canInstall) {
      setShowInstall(false);
      return;
    }

    // Check cooldown
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (lastShown) {
      const lastShownTime = parseInt(lastShown, 10);
      const now = Date.now();
      const hoursSinceLastShown = (now - lastShownTime) / (1000 * 60 * 60);

      if (hoursSinceLastShown < COOLDOWN_HOURS) {
        setShowInstall(false);
        return;
      }
    }

    // Show the install prompt
    setShowInstall(true);

    // Update last shown timestamp
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }, [isInstalled, canInstall]);

  const handleInstall = async () => {
    await installApp();
    setShowInstall(false);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    // Update timestamp so it won't show again for 36 hours
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  // Don't render if shouldn't show
  if (!showInstall || isInstalled || !canInstall) {
    return null;
  }

  // Collapsed state - show compact icon button
  if (isCollapsed) {
    return (
      <div className="px-2 py-1.5">
        <Button
          variant="outline"
          size="icon"
          onClick={handleInstall}
          className="w-full h-10 relative group"
          title="Install Tax Genius Pro"
        >
          <Download className="h-4 w-4 text-primary" />
        </Button>
      </div>
    );
  }

  // Expanded state - show compact install button
  return (
    <div className="px-2 py-1">
      <div className="relative rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-2">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-1 right-1 p-0.5 rounded-md hover:bg-background/50 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>

        <div className="pr-5">
          <Button
            onClick={handleInstall}
            size="sm"
            variant="ghost"
            className="w-full h-8 text-xs justify-start gap-2 hover:bg-primary/10"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Install App</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
