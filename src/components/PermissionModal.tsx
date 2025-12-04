'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import {
  UserRole,
  UserPermissions,
  getEditablePermissions,
  PERMISSION_LABELS,
  DEFAULT_PERMISSIONS,
} from '@/lib/permissions';

interface PermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    permissions?: Partial<UserPermissions>;
  };
  onSave: (userId: string, role: UserRole, permissions: Partial<UserPermissions>) => Promise<void>;
  isSuperAdmin?: boolean; // Whether the current user is a super_admin
}

export function PermissionModal({
  open,
  onOpenChange,
  user,
  onSave,
  isSuperAdmin = false,
}: PermissionModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [permissions, setPermissions] = useState<Partial<UserPermissions>>(
    user.permissions || DEFAULT_PERMISSIONS[user.role] || {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editablePermissions = getEditablePermissions(selectedRole);

  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    // Reset permissions to default for new role
    setPermissions(DEFAULT_PERMISSIONS[newRole] || {});
  };

  const handlePermissionToggle = (permission: string) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission as keyof UserPermissions],
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await onSave(user.id, selectedRole, permissions);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const userName =
    user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Edit Permissions: {userName}
          </DialogTitle>
          <DialogDescription>
            Customize user role and access permissions. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium">
              User Role
            </Label>
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead (Pending Approval)</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="affiliate">Affiliate</SelectItem>
                <SelectItem value="tax_preparer">Tax Preparer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Changing the role will reset permissions to default for that role.
            </p>
          </div>

          {/* Role Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current Role:</span>
            <Badge variant={selectedRole === 'super_admin' ? 'default' : 'secondary'}>
              {selectedRole.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Permission Toggles */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Permissions</Label>
            <p className="text-xs text-muted-foreground">
              Toggle features this user can access in their dashboard.
            </p>

            <div className="border rounded-lg divide-y">
              {editablePermissions.map((permission) => {
                const isEnabled = permissions[permission] === true;
                const label = PERMISSION_LABELS[permission];

                return (
                  <div
                    key={permission}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <Label htmlFor={permission} className="text-sm font-medium cursor-pointer">
                        {label}
                      </Label>
                      {permission === 'adminManagement' && (
                        <p className="text-xs text-muted-foreground">
                          Super Admin only - manage other admins
                        </p>
                      )}
                      {permission === 'database' && (
                        <p className="text-xs text-muted-foreground">
                          Direct database access - use with caution
                        </p>
                      )}
                    </div>
                    <Switch
                      id={permission}
                      checked={isEnabled}
                      onCheckedChange={() => handlePermissionToggle(permission)}
                      disabled={selectedRole === 'super_admin'} // Super admin always has all permissions
                    />
                  </div>
                );
              })}
            </div>

            {selectedRole === 'super_admin' && (
              <Alert>
                <AlertDescription className="text-xs">
                  Super Admins have all permissions enabled by default and cannot be restricted.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
