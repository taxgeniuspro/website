'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  PERMISSION_LABELS,
  SECTION_NAMES,
  SECTION_PERMISSIONS,
  type SectionPermission,
  type Permission,
  type UserPermissions,
} from '@/lib/permissions';
import { Layers, Key, Save, ToggleLeft, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

interface PermissionManagerProps {
  defaultPermissions: Partial<UserPermissions>;
  targetUserId?: string;
  targetRole?: string;
  roleDisplayName?: string; // Display name for the role
  roleDescription?: string; // Description of the role
  readOnly?: boolean; // Whether this is read-only mode
  affectedUsersCount?: number; // How many users will be affected
}

export function PermissionManager({
  defaultPermissions,
  targetUserId,
  targetRole = 'admin',
  roleDisplayName,
  roleDescription,
  readOnly = false,
  affectedUsersCount = 0,
}: PermissionManagerProps) {
  const [permissions, setPermissions] = useState<Partial<UserPermissions>>(defaultPermissions);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const sections = Object.keys(SECTION_NAMES) as SectionPermission[];

  // Check if all permissions in a section are enabled
  const isSectionEnabled = useCallback(
    (section: SectionPermission) => {
      const sectionPerms = SECTION_PERMISSIONS[section];
      return sectionPerms.every((p) => permissions[p] === true);
    },
    [permissions]
  );

  // Check if some (but not all) permissions in a section are enabled
  const isSectionPartial = useCallback(
    (section: SectionPermission) => {
      const sectionPerms = SECTION_PERMISSIONS[section];
      const enabledCount = sectionPerms.filter((p) => permissions[p] === true).length;
      return enabledCount > 0 && enabledCount < sectionPerms.length;
    },
    [permissions]
  );

  // Toggle entire section
  const toggleSection = useCallback(
    (section: SectionPermission, enabled: boolean) => {
      if (readOnly) return; // Don't allow changes in read-only mode

      const sectionPerms = SECTION_PERMISSIONS[section];
      const newPermissions = { ...permissions };

      sectionPerms.forEach((perm) => {
        newPermissions[perm] = enabled;
      });

      setPermissions(newPermissions);
      setHasChanges(true);
    },
    [permissions, readOnly]
  );

  // Toggle individual permission
  const togglePermission = useCallback(
    (permission: Permission, enabled: boolean) => {
      if (readOnly) return; // Don't allow changes in read-only mode

      setPermissions((prev) => ({
        ...prev,
        [permission]: enabled,
      }));
      setHasChanges(true);
    },
    [readOnly]
  );

  // Save permissions
  const savePermissions = async () => {
    if (readOnly) return; // Don't allow saving in read-only mode

    const roleName = roleDisplayName || targetRole;

    toast({
      title: 'Saving Permissions',
      description: `Updating permissions for ${roleName}${affectedUsersCount > 0 ? ` (affects ${affectedUsersCount} users)` : ''}...`,
    });

    setLoading(true);

    try {
      // Use new role-permissions API endpoint
      const response = await fetch('/api/admin/role-permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetRole: targetRole,
          permissions: permissions,
          updateExistingUsers: true, // Always update existing users
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update permissions');
      }

      const result = await response.json();

      // Show success or warning message
      if (result.warning) {
        toast({
          title: 'Template Saved',
          description: result.warning,
          duration: 7000,
        });
      } else {
        toast({
          title: 'Success',
          description:
            result.message ||
            `Permissions updated for ${roleName}. ${result.usersUpdated || 0} users affected.`,
          duration: 5000,
        });
      }

      setHasChanges(false);

      // Refresh the page after a short delay to show updated permissions
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      logger.error('Error saving permissions:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Warning banner for super_admin or read-only mode */}
      {(targetRole === 'super_admin' || readOnly) && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">
                {targetRole === 'super_admin'
                  ? 'Caution: Super Admin Permissions'
                  : 'Read-Only Mode'}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                {targetRole === 'super_admin'
                  ? 'Modifying super_admin permissions affects system security. Changes will apply to ALL super admin users immediately.'
                  : 'These permissions are in read-only mode and cannot be modified.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Role description */}
      {roleDescription && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">{roleDescription}</p>
        </div>
      )}

      <div className="space-y-6">
        {sections.map((section) => {
          const sectionName = SECTION_NAMES[section];
          const sectionPermissions = SECTION_PERMISSIONS[section];
          const isEnabled = isSectionEnabled(section);
          const isPartial = isSectionPartial(section);

          return (
            <div key={section} className="border rounded-lg p-4">
              {/* Section Header with Master Toggle */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-medium text-lg">{sectionName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {sectionPermissions.length} items in this section
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isPartial && (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Partial
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">Enable Section</span>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => toggleSection(section, checked)}
                    disabled={readOnly}
                    className={cn(
                      'data-[state=checked]:bg-green-600',
                      isPartial && 'data-[state=unchecked]:bg-amber-200'
                    )}
                  />
                </div>
              </div>

              {/* Individual Permissions */}
              <div className="grid md:grid-cols-2 gap-3 mt-4">
                {sectionPermissions.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Key className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">
                        {PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS]}
                      </span>
                    </div>
                    <Switch
                      checked={permissions[permission] === true}
                      onCheckedChange={(checked) => togglePermission(permission, checked)}
                      disabled={readOnly}
                      className="scale-90 data-[state=checked]:bg-green-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-start gap-3">
          <ToggleLeft className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Section Controls</p>
            <p className="text-sm text-muted-foreground mt-1">
              Toggle entire sections on/off to quickly manage admin access. Individual permissions
              can still be customized within each section.
            </p>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {hasChanges && (
              <span className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                You have unsaved changes
                {affectedUsersCount > 0 && ` (will affect ${affectedUsersCount} users)`}
              </span>
            )}
          </div>
          <Button
            onClick={savePermissions}
            disabled={!hasChanges || loading || readOnly}
            className="min-w-[150px]"
          >
            {loading ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Permissions
              </>
            )}
          </Button>
        </div>
      )}

      {/* Visual feedback when saved */}
      {!hasChanges && !loading && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800 dark:text-green-300">
              All permissions are saved and up to date
            </span>
          </div>
        </div>
      )}
    </>
  );
}
