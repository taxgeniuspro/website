/**
 * Role Switcher Component
 *
 * Allows admins to switch their viewing role to preview
 * the application from other roles' perspectives
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserRole } from '@/lib/permissions';
import { ROLE_DISPLAY_CONFIG, VIEWABLE_ROLES, type RoleDisplayInfo } from '@/types/role-switcher';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface RoleSwitcherProps {
  actualRole: UserRole;
  effectiveRole: UserRole;
  isViewingAsOtherRole: boolean;
}

export function RoleSwitcher({
  actualRole,
  effectiveRole,
  isViewingAsOtherRole,
}: RoleSwitcherProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentEffectiveRole, setCurrentEffectiveRole] = useState(effectiveRole);
  const router = useRouter();
  const { toast } = useToast();

  // Update current effective role when prop changes
  useEffect(() => {
    setCurrentEffectiveRole(effectiveRole);
  }, [effectiveRole]);

  const handleRoleSwitch = async (targetRole: UserRole) => {
    if (targetRole === currentEffectiveRole) {
      return; // Already viewing as this role
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/switch-view-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: targetRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch role');
      }

      // Update local state immediately for better UX
      setCurrentEffectiveRole(targetRole);

      // Show success toast
      toast({
        title: 'Role Switched',
        description: data.message || `Now viewing as ${ROLE_DISPLAY_CONFIG[targetRole].label}`,
      });

      // Refresh the page to apply new role permissions
      // Use hard refresh to force middleware to re-evaluate
      window.location.reload();
    } catch (error) {
      logger.error('Error switching role:', error);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to switch role',
        variant: 'destructive',
      });

      setIsLoading(false);
    }
  };

  const handleClearViewingRole = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/switch-view-role', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear viewing role');
      }

      // Update local state
      setCurrentEffectiveRole(actualRole);

      // Show success toast
      toast({
        title: 'Returned to Admin View',
        description: data.message || `Viewing as ${ROLE_DISPLAY_CONFIG[actualRole].label}`,
      });

      // Refresh the page
      router.refresh();
    } catch (error) {
      logger.error('Error clearing viewing role:', error);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clear viewing role',
        variant: 'destructive',
      });

      setIsLoading(false);
    }
  };

  // Get available roles based on actual role permissions
  const getAvailableRoles = (): UserRole[] => {
    if (actualRole === 'super_admin') {
      // Super admins can view as any role (including admin and themselves)
      return ['super_admin', 'admin', ...VIEWABLE_ROLES];
    } else if (actualRole === 'admin') {
      // Regular admins can view as limited roles (no super_admin, no self)
      // VIEWABLE_ROLES already excludes admin to prevent self-switching
      return VIEWABLE_ROLES;
    }
    // Non-admin users should not see the switcher (handled by return null below)
    return [actualRole];
  };

  const availableRoles = getAvailableRoles();

  // Don't show role switcher if user is not admin/super_admin
  if (actualRole !== 'super_admin' && actualRole !== 'admin') {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isViewingAsOtherRole ? 'default' : 'outline'}
          size="sm"
          className={`relative gap-2 ${isViewingAsOtherRole ? 'bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-600' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          <span className="hidden md:inline">
            {isViewingAsOtherRole
              ? `Viewing as ${ROLE_DISPLAY_CONFIG[currentEffectiveRole].label}`
              : 'Switch View'
            }
          </span>
          {isViewingAsOtherRole && (
            <span className="md:hidden absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          View As Role
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {availableRoles.map((role) => {
          const roleConfig: RoleDisplayInfo = ROLE_DISPLAY_CONFIG[role];
          const isCurrentRole = role === currentEffectiveRole;
          const isActualRole = role === actualRole;
          const isSuperAdminOnly = role === 'super_admin' && actualRole !== 'super_admin';

          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              disabled={isLoading || isCurrentRole}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{roleConfig.icon}</span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{roleConfig.label}</span>
                      {isActualRole && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                          YOUR ROLE
                        </span>
                      )}
                      {isSuperAdminOnly && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                          SUPER ADMIN ONLY
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{roleConfig.description}</span>
                  </div>
                </div>
                {isCurrentRole && <Check className="h-4 w-4 text-primary" />}
              </div>
            </DropdownMenuItem>
          );
        })}

        {isViewingAsOtherRole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleClearViewingRole}
              disabled={isLoading}
              className="cursor-pointer text-primary"
            >
              <div className="flex items-center gap-2 w-full">
                <Eye className="h-4 w-4" />
                <span className="font-medium">Exit Preview Mode</span>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
