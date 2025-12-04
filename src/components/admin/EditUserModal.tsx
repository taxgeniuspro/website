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
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, AlertTriangle, Loader2, User, Settings } from 'lucide-react';
import {
  UserRole,
  UserPermissions,
  getEditablePermissions,
  PERMISSION_LABELS,
  DEFAULT_PERMISSIONS,
} from '@/lib/permissions';

interface EditUserModalProps {
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
  onSave: (userData: {
    userId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    permissions: Partial<UserPermissions>;
  }) => Promise<void>;
  isSuperAdmin?: boolean;
}

export function EditUserModal({
  open,
  onOpenChange,
  user,
  onSave,
  isSuperAdmin = false,
}: EditUserModalProps) {
  const [email, setEmail] = useState(user.email);
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
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

      await onSave({
        userId: user.id,
        email: email !== user.email ? email : undefined,
        firstName: firstName !== user.firstName ? firstName : undefined,
        lastName: lastName !== user.lastName ? lastName : undefined,
        role: selectedRole,
        permissions,
      });

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setIsSaving(false);
    }
  };

  const userName = firstName && lastName ? `${firstName} ${lastName}` : email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Edit User: {userName}
          </DialogTitle>
          <DialogDescription>
            Update user information, role, and permissions. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Settings className="w-4 h-4 mr-2" />
              Role & Permissions
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* User ID */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">User ID</Label>
                <Input value={user.id} disabled className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (cannot be changed)
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Primary email for login and communications
                </p>
              </div>

              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4 mt-4">
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

              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
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
          </TabsContent>
        </Tabs>

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
