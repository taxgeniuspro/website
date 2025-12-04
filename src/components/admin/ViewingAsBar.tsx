/**
 * Viewing As Bar Component
 *
 * Prominent banner that appears when admin is viewing as another role
 * Provides clear visual indicator and quick exit option
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/lib/permissions';
import { ROLE_DISPLAY_CONFIG } from '@/types/role-switcher';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';

interface ViewingAsBarProps {
  actualRole: UserRole;
  effectiveRole: UserRole;
  viewingRoleName?: string;
}

export function ViewingAsBar({ actualRole, effectiveRole, viewingRoleName }: ViewingAsBarProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Don't show if not viewing as another role
  if (actualRole === effectiveRole || isDismissed) {
    return null;
  }

  const handleExitPreview = async () => {
    setIsExiting(true);

    try {
      const response = await fetch('/api/admin/switch-view-role', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to exit preview mode');
      }

      toast({
        title: 'Returned to Admin View',
        description: data.message || `Viewing as ${ROLE_DISPLAY_CONFIG[actualRole].label}`,
      });

      // Refresh the page to apply admin role permissions
      router.refresh();
    } catch (error) {
      logger.error('Error exiting preview mode:', error);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to exit preview mode',
        variant: 'destructive',
      });

      setIsExiting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const roleConfig = ROLE_DISPLAY_CONFIG[effectiveRole];

  return (
    <Alert className="border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 mb-0 rounded-none border-x-0 border-t-0">
      <div className="flex items-center justify-between w-full gap-4">
        {/* Left side - Warning icon and message */}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/10 dark:bg-yellow-500/20">
            <Eye className="h-5 w-5 text-yellow-700 dark:text-yellow-500" />
          </div>
          <AlertDescription className="text-base font-medium text-foreground m-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-700 dark:text-yellow-500" />
                <span className="font-bold">Preview Mode:</span>
              </span>
              <span>
                Viewing as{' '}
                <span className="inline-flex items-center gap-1 font-bold text-yellow-800 dark:text-yellow-400">
                  {roleConfig.icon} {viewingRoleName || roleConfig.label}
                </span>
              </span>
              <span className="hidden sm:inline text-sm text-muted-foreground">
                • Some admin functions may be restricted in preview mode
              </span>
            </div>
          </AlertDescription>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Exit Preview Button */}
          <Button
            onClick={handleExitPreview}
            disabled={isExiting}
            variant="default"
            size="default"
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold shadow-md whitespace-nowrap"
          >
            {isExiting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exiting...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Exit Preview Mode
              </>
            )}
          </Button>

          {/* Dismiss Button (just hides the banner for current session) */}
          <Button
            onClick={handleDismiss}
            disabled={isExiting}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Hide banner (you're still in preview mode)"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Hide banner</span>
          </Button>
        </div>
      </div>
    </Alert>
  );
}
