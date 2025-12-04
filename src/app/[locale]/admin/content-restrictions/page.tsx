/**
 * Content Restrictions Admin Page
 *
 * Manage role-based and username-based access control
 * Location: /admin/content-restrictions
 */

'use client';

import { useEffect, useState } from 'react';
import { Plus, Shield, Trash2, Edit, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface PageRestriction {
  id: string;
  routePath: string;
  allowedRoles: string[];
  blockedRoles: string[];
  allowedUsernames: string[];
  blockedUsernames: string[];
  allowNonLoggedIn: boolean;
  redirectUrl: string | null;
  hideFromNav: boolean;
  showInNavOverride: boolean;
  priority: number;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AccessLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  username: string | null;
  attemptedRoute: string;
  wasBlocked: boolean;
  blockReason: string | null;
  timestamp: string;
}

export default function ContentRestrictionsPage() {
  const [restrictions, setRestrictions] = useState<PageRestriction[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    routePath: '',
    allowedRoles: '',
    blockedRoles: '',
    allowedUsernames: '',
    blockedUsernames: '',
    allowNonLoggedIn: false,
    redirectUrl: '',
    hideFromNav: false,
    showInNavOverride: false,
    priority: 0,
    isActive: true,
    description: '',
  });

  // Fetch restrictions
  const fetchRestrictions = async () => {
    try {
      const res = await fetch('/api/restrictions/page');
      if (res.ok) {
        const data = await res.json();
        setRestrictions(data);
      }
    } catch (error) {
      toast.error('Failed to fetch restrictions');
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/restrictions/logs?blockedOnly=true&limit=50');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      toast.error('Failed to fetch logs');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRestrictions(), fetchLogs()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Create or update restriction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      allowedRoles: formData.allowedRoles
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
      blockedRoles: formData.blockedRoles
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
      allowedUsernames: formData.allowedUsernames
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean),
      blockedUsernames: formData.blockedUsernames
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean),
      id: editingId,
    };

    try {
      const res = await fetch('/api/restrictions/page', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingId ? 'Restriction updated!' : 'Restriction created!');
        setShowDialog(false);
        resetForm();
        await fetchRestrictions();

        // Refresh the page after a short delay to ensure changes are visible
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save restriction');
      }
    } catch (error) {
      toast.error('Failed to save restriction');
    }
  };

  // Delete restriction
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this restriction?')) return;

    try {
      const res = await fetch(`/api/restrictions/page?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Restriction deleted!');
        await fetchRestrictions();

        // Refresh the page after a short delay to ensure changes are visible
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Failed to delete restriction');
      }
    } catch (error) {
      toast.error('Failed to delete restriction');
    }
  };

  // Edit restriction
  const handleEdit = (restriction: PageRestriction) => {
    setEditingId(restriction.id);
    setFormData({
      routePath: restriction.routePath,
      allowedRoles: restriction.allowedRoles.join(', '),
      blockedRoles: restriction.blockedRoles.join(', '),
      allowedUsernames: restriction.allowedUsernames.join(', '),
      blockedUsernames: restriction.blockedUsernames.join(', '),
      allowNonLoggedIn: restriction.allowNonLoggedIn,
      redirectUrl: restriction.redirectUrl || '',
      hideFromNav: restriction.hideFromNav,
      showInNavOverride: restriction.showInNavOverride,
      priority: restriction.priority,
      isActive: restriction.isActive,
      description: restriction.description || '',
    });
    setShowDialog(true);
  };

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setFormData({
      routePath: '',
      allowedRoles: '',
      blockedRoles: '',
      allowedUsernames: '',
      blockedUsernames: '',
      allowNonLoggedIn: false,
      redirectUrl: '',
      hideFromNav: false,
      showInNavOverride: false,
      priority: 0,
      isActive: true,
      description: '',
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Content Restrictions
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage role-based and username-based access control
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Restriction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Restriction' : 'Create New Restriction'}</DialogTitle>
              <DialogDescription>
                Control access to routes based on user roles and usernames
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Route Path */}
              <div>
                <Label htmlFor="routePath">
                  Route Path <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="routePath"
                  value={formData.routePath}
                  onChange={(e) => setFormData({ ...formData, routePath: e.target.value })}
                  placeholder="/admin/users or /admin/*"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use * for wildcards (e.g., /admin/* matches all admin routes)
                </p>
              </div>

              {/* Allowed Roles */}
              <div>
                <Label htmlFor="allowedRoles">Allowed Roles</Label>
                <Input
                  id="allowedRoles"
                  value={formData.allowedRoles}
                  onChange={(e) => setFormData({ ...formData, allowedRoles: e.target.value })}
                  placeholder="admin, super_admin, tax_preparer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated. Leave empty to allow all authenticated users
                </p>
              </div>

              {/* Blocked Roles */}
              <div>
                <Label htmlFor="blockedRoles">Blocked Roles</Label>
                <Input
                  id="blockedRoles"
                  value={formData.blockedRoles}
                  onChange={(e) => setFormData({ ...formData, blockedRoles: e.target.value })}
                  placeholder="client, lead"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated. These roles will be blocked even if in allowed list
                </p>
              </div>

              {/* Allowed Usernames */}
              <div>
                <Label htmlFor="allowedUsernames">Allowed Usernames (Highest Priority)</Label>
                <Input
                  id="allowedUsernames"
                  value={formData.allowedUsernames}
                  onChange={(e) => setFormData({ ...formData, allowedUsernames: e.target.value })}
                  placeholder="admin_user, special_access"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated. These users always have access
                </p>
              </div>

              {/* Blocked Usernames */}
              <div>
                <Label htmlFor="blockedUsernames">Blocked Usernames (Highest Priority)</Label>
                <Input
                  id="blockedUsernames"
                  value={formData.blockedUsernames}
                  onChange={(e) => setFormData({ ...formData, blockedUsernames: e.target.value })}
                  placeholder="suspended_user, banned_admin"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated. These users are always blocked
                </p>
              </div>

              {/* Redirect URL */}
              <div>
                <Label htmlFor="redirectUrl">Redirect URL</Label>
                <Input
                  id="redirectUrl"
                  value={formData.redirectUrl}
                  onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                  placeholder="/forbidden or /upgrade"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Where to redirect unauthorized users
                </p>
              </div>

              {/* Priority */}
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher numbers = checked first (for pattern matching)
                </p>
              </div>

              {/* Switches */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="allowNonLoggedIn">Allow Non-Logged-In Users</Label>
                  <Switch
                    id="allowNonLoggedIn"
                    checked={formData.allowNonLoggedIn}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, allowNonLoggedIn: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="hideFromNav">Hide from Navigation</Label>
                  <Switch
                    id="hideFromNav"
                    checked={formData.hideFromNav}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hideFromNav: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showInNavOverride">Force Show in Nav</Label>
                  <Switch
                    id="showInNavOverride"
                    checked={formData.showInNavOverride}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, showInNavOverride: checked })
                    }
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description (Admin Note)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Internal note about this restriction"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Update' : 'Create'} Restriction
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="restrictions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="restrictions">Restrictions ({restrictions.length})</TabsTrigger>
          <TabsTrigger value="logs">Access Logs ({logs.length})</TabsTrigger>
        </TabsList>

        {/* Restrictions Tab */}
        <TabsContent value="restrictions" className="space-y-4">
          {restrictions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No restrictions configured yet.
                  <br />
                  Click "Add Restriction" to create your first rule.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Allowed Roles</TableHead>
                    <TableHead>Blocked</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restrictions.map((restriction) => (
                    <TableRow key={restriction.id}>
                      <TableCell className="font-mono text-sm">
                        {restriction.routePath}
                        {restriction.hideFromNav && (
                          <EyeOff className="inline h-3 w-3 ml-2 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {restriction.allowedRoles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {restriction.allowedRoles.map((role) => (
                              <Badge key={role} variant="secondary">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">All</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {restriction.blockedRoles.length > 0 ||
                        restriction.blockedUsernames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {restriction.blockedRoles.map((role) => (
                              <Badge key={role} variant="destructive">
                                {role}
                              </Badge>
                            ))}
                            {restriction.blockedUsernames.map((username) => (
                              <Badge key={username} variant="destructive">
                                @{username}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{restriction.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={restriction.isActive ? 'default' : 'secondary'}>
                          {restriction.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(restriction)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(restriction.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Access Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Blocked Access Attempts</CardTitle>
              <CardDescription>Shows the last 50 unauthorized access attempts</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No blocked access attempts recorded yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Attempted Route</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.userEmail || log.username || 'Anonymous'}
                        </TableCell>
                        <TableCell>
                          {log.userRole ? (
                            <Badge variant="secondary">{log.userRole}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.attemptedRoute}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{log.blockReason}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
