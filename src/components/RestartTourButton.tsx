'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, HelpCircle } from 'lucide-react';
import { resetOnboarding } from '@/lib/onboarding';
import { UserRole } from '@/lib/permissions';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface RestartTourButtonProps {
  role: UserRole;
}

export function RestartTourButton({ role }: RestartTourButtonProps) {
  const [isRestarting, setIsRestarting] = useState(false);
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleRestart = () => {
    setIsRestarting(true);
    resetOnboarding(role);
    // Reload the page to show the tour
    window.location.reload();
  };

  // Collapsed state - show icon button with tooltip
  if (isCollapsed) {
    return (
      <div className="px-2 py-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRestart}
          disabled={isRestarting}
          className="w-full h-9"
          title="Restart Tour"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Expanded state - show full button
  return (
    <div className="px-2 py-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRestart}
        disabled={isRestarting}
        className="w-full h-9 text-xs justify-start gap-2 text-muted-foreground hover:text-foreground"
      >
        <HelpCircle className="h-4 w-4" />
        <span>Restart Tour</span>
      </Button>
    </div>
  );
}
