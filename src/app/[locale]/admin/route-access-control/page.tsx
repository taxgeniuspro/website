'use client';

/**
 * Route Access Control Management Page
 *
 * Inspired by WordPress "Pages by User Role" plugin
 * Allows super_admin to manage per-route access restrictions
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, ShieldAlert, TestTube2, Info } from 'lucide-react';
import { PageRestrictionResponse } from '@/types/route-access-control';
import { logger } from '@/lib/logger';

export default function RouteAccessControlPage() {
  const router = useRouter();
  const [restrictions, setRestrictions] = useState<PageRestrictionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [selectedRestriction, setSelectedRestriction] = useState<PageRestrictionResponse | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState({
    routePath: '',
    description: '',
    allowedRoles: '',
    blockedRoles: '',
    allowedUsernames: '',
    blockedUsernames: '',
    allowNonLoggedIn: false,
    redirectUrl: '',
    hideFromNav: false,
    priority: 0,
    isActive: true,
  });

  // Test form state
  const [testData, setTestData] = useState({
    routePath: '',
    username: '',
    role: 'client',
  });

  // Test result
  const [testResult, setTestResult] = useState<any>(null);

  // Fetch restrictions
  const fetchRestrictions = async () => {
    try {
      const res = await fetch('/api/admin/route-access-control');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRestrictions(data.data || []);
    } catch (error) {
      toast.error('Failed to load route restrictions');
      logger.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestrictions();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      routePath: '',
      description: '',
      allowedRoles: '',
      blockedRoles: '',
      allowedUsernames: '',
      blockedUsernames: '',
      allowNonLoggedIn: false,
      redirectUrl: '',
      hideFromNav: false,
      priority: 0,
      isActive: true,
    });
  };

  // Open create dialog
  const handleCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  // Open edit dialog
  const handleEdit = (restriction: PageRestrictionResponse) => {
    setSelectedRestriction(restriction);
    setFormData({
      routePath: restriction.routePath,
      description: restriction.description || '',
      allowedRoles: restriction.allowedRoles.join(', '),
      blockedRoles: restriction.blockedRoles.join(', '),
      allowedUsernames: restriction.allowedUsernames.join(', '),
      blockedUsernames: restriction.blockedUsernames.join(', '),
      allowNonLoggedIn: restriction.allowNonLoggedIn,
      redirectUrl: restriction.redirectUrl || '',
      hideFromNav: restriction.hideFromNav,
      priority: restriction.priority,
      isActive: restriction.isActive,
    });
    setShowEditDialog(true);
  };

  // Open delete dialog
  const handleDelete = (restriction: PageRestrictionResponse) => {
    setSelectedRestriction(restriction);
    setShowDeleteDialog(true);
  };

  // Open test dialog
  const handleTest = (restriction?: PageRestrictionResponse) => {
    if (restriction) {
      setTestData({
        ...testData,
        routePath: restriction.routePath,
      });
    }
    setTestResult(null);
    setShowTestDialog(true);
  };

  // Submit create
  const submitCreate = async () => {
    try {
      const payload = {
        routePath: formData.routePath.trim(),
        description: formData.description.trim() || null,
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
        allowNonLoggedIn: formData.allowNonLoggedIn,
        redirectUrl: formData.redirectUrl.trim() || null,
        hideFromNav: formData.hideFromNav,
        priority: formData.priority,
        isActive: formData.isActive,
      };

      const res = await fetch('/api/admin/route-access-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create');
      }

      toast.success('Route restriction created successfully');
      setShowCreateDialog(false);
      fetchRestrictions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create restriction');
    }
  };

  // Submit edit
  const submitEdit = async () => {
    if (!selectedRestriction) return;

    try {
      const payload = {
        routePath: formData.routePath.trim(),
        description: formData.description.trim() || null,
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
        allowNonLoggedIn: formData.allowNonLoggedIn,
        redirectUrl: formData.redirectUrl.trim() || null,
        hideFromNav: formData.hideFromNav,
        priority: formData.priority,
        isActive: formData.isActive,
      };

      const res = await fetch(`/api/admin/route-access-control/${selectedRestriction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update');
      }

      toast.success('Route restriction updated successfully');
      setShowEditDialog(false);
      setSelectedRestriction(null);
      fetchRestrictions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update restriction');
    }
  };

  // Submit delete
  const submitDelete = async () => {
    if (!selectedRestriction) return;

    try {
      const res = await fetch(`/api/admin/route-access-control/${selectedRestriction.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete');
      }

      toast.success('Route restriction deleted successfully');
      setShowDeleteDialog(false);
      setSelectedRestriction(null);
      fetchRestrictions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete restriction');
    }
  };

  // Submit test
  const submitTest = async () => {
    try {
      const res = await fetch('/api/admin/route-access-control/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });

      if (!res.ok) throw new Error('Failed to test');

      const result = await res.json();
      setTestResult(result.data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to test route access');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Route Access Control</h1>
          <p className="text-muted-foreground mt-2">
            Manage per-route access restrictions with pattern matching (inspired by WordPress Pages
            by User Role plugin)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleTest()}>
            <TestTube2 className="w-4 h-4 mr-2" />
            Test Access
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Restriction
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Pattern Matching Support
          </CardTitle>
          <CardDescription>
            Use wildcards (*) in route patterns for flexible matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1">
            <div>
              <code className="bg-muted px-2 py-1 rounded">/admin/users</code> - Exact match only
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded">/admin/*</code> - Matches all admin
              routes
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded">/dashboard/*/settings</code> - Matches
              settings for all roles
            </div>
            <div className="pt-2 text-muted-foreground">
              Higher priority rules are checked first when multiple patterns match.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Restrictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{restrictions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {restrictions.filter((r) => r.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {restrictions.filter((r) => !r.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {restrictions.filter((r) => r.routePath.includes('*')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route Pattern</TableHead>
                <TableHead>Allowed Roles</TableHead>
                <TableHead>Blocked Roles</TableHead>
                <TableHead className="text-center">Priority</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restrictions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No route restrictions configured. Click &quot;Add Restriction&quot; to get
                    started.
                  </TableCell>
                </TableRow>
              ) : (
                restrictions
                  .sort((a, b) => b.priority - a.priority)
                  .map((restriction) => (
                    <TableRow key={restriction.id}>
                      <TableCell className="font-mono text-sm">
                        {restriction.routePath}
                        {restriction.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {restriction.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {restriction.allowedRoles.length === 0 ? (
                          <span className="text-muted-foreground text-sm">All</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {restriction.allowedRoles.map((role) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {restriction.blockedRoles.length === 0 ? (
                          <span className="text-muted-foreground text-sm">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {restriction.blockedRoles.map((role) => (
                              <Badge key={role} variant="destructive" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {restriction.priority}
                      </TableCell>
                      <TableCell className="text-center">
                        {restriction.isActive ? (
                          <Badge variant="default" className="bg-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTest(restriction)}
                            title="Test this restriction"
                          >
                            <TestTube2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(restriction)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(restriction)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Route Restriction</DialogTitle>
            <DialogDescription>
              Add a new route access control rule with role and username-based restrictions
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="routePath">Route Pattern *</Label>
              <Input
                id="routePath"
                placeholder="/admin/users or /admin/* for patterns"
                value={formData.routePath}
                onChange={(e) => setFormData({ ...formData, routePath: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this restriction"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="allowedRoles">Allowed Roles (comma-separated)</Label>
                <Input
                  id="allowedRoles"
                  placeholder="super_admin, admin"
                  value={formData.allowedRoles}
                  onChange={(e) => setFormData({ ...formData, allowedRoles: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Empty = all authenticated users</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="blockedRoles">Blocked Roles (comma-separated)</Label>
                <Input
                  id="blockedRoles"
                  placeholder="client, lead"
                  value={formData.blockedRoles}
                  onChange={(e) => setFormData({ ...formData, blockedRoles: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Takes priority over allowed</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="allowedUsernames">Allowed Usernames (comma-separated)</Label>
                <Input
                  id="allowedUsernames"
                  placeholder="user@example.com"
                  value={formData.allowedUsernames}
                  onChange={(e) => setFormData({ ...formData, allowedUsernames: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Highest priority - always allowed</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="blockedUsernames">Blocked Usernames (comma-separated)</Label>
                <Input
                  id="blockedUsernames"
                  placeholder="blocked@example.com"
                  value={formData.blockedUsernames}
                  onChange={(e) => setFormData({ ...formData, blockedUsernames: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Highest priority - always blocked</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="redirectUrl">Custom Redirect URL (optional)</Label>
              <Input
                id="redirectUrl"
                placeholder="/forbidden or /upgrade"
                value={formData.redirectUrl}
                onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority (higher = checked first)</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                />
              </div>

              <div className="flex flex-col gap-4 pt-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="allowNonLoggedIn"
                    checked={formData.allowNonLoggedIn}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, allowNonLoggedIn: checked })
                    }
                  />
                  <Label htmlFor="allowNonLoggedIn" className="cursor-pointer">
                    Allow non-logged-in users
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="hideFromNav"
                    checked={formData.hideFromNav}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hideFromNav: checked })
                    }
                  />
                  <Label htmlFor="hideFromNav" className="cursor-pointer">
                    Hide from navigation
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={!formData.routePath.trim()}>
              Create Restriction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Same as Create but with Update */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Route Restriction</DialogTitle>
            <DialogDescription>Modify the route access control rule</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Same form fields as Create Dialog */}
            <div className="grid gap-2">
              <Label htmlFor="editRoutePath">Route Pattern *</Label>
              <Input
                id="editRoutePath"
                placeholder="/admin/users or /admin/* for patterns"
                value={formData.routePath}
                onChange={(e) => setFormData({ ...formData, routePath: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                placeholder="Brief description of this restriction"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="editAllowedRoles">Allowed Roles (comma-separated)</Label>
                <Input
                  id="editAllowedRoles"
                  placeholder="super_admin, admin"
                  value={formData.allowedRoles}
                  onChange={(e) => setFormData({ ...formData, allowedRoles: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="editBlockedRoles">Blocked Roles (comma-separated)</Label>
                <Input
                  id="editBlockedRoles"
                  placeholder="client, lead"
                  value={formData.blockedRoles}
                  onChange={(e) => setFormData({ ...formData, blockedRoles: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="editAllowedUsernames">Allowed Usernames (comma-separated)</Label>
                <Input
                  id="editAllowedUsernames"
                  placeholder="user@example.com"
                  value={formData.allowedUsernames}
                  onChange={(e) => setFormData({ ...formData, allowedUsernames: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="editBlockedUsernames">Blocked Usernames (comma-separated)</Label>
                <Input
                  id="editBlockedUsernames"
                  placeholder="blocked@example.com"
                  value={formData.blockedUsernames}
                  onChange={(e) => setFormData({ ...formData, blockedUsernames: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editRedirectUrl">Custom Redirect URL (optional)</Label>
              <Input
                id="editRedirectUrl"
                placeholder="/forbidden or /upgrade"
                value={formData.redirectUrl}
                onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="editPriority">Priority (higher = checked first)</Label>
                <Input
                  id="editPriority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                />
              </div>

              <div className="flex flex-col gap-4 pt-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="editAllowNonLoggedIn"
                    checked={formData.allowNonLoggedIn}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, allowNonLoggedIn: checked })
                    }
                  />
                  <Label htmlFor="editAllowNonLoggedIn" className="cursor-pointer">
                    Allow non-logged-in users
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="editHideFromNav"
                    checked={formData.hideFromNav}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hideFromNav: checked })
                    }
                  />
                  <Label htmlFor="editHideFromNav" className="cursor-pointer">
                    Hide from navigation
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="editIsActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="editIsActive" className="cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={!formData.routePath.trim()}>
              Update Restriction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Route Restriction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this route restriction?
            </DialogDescription>
          </DialogHeader>

          {selectedRestriction && (
            <div className="py-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-mono text-sm font-medium">{selectedRestriction.routePath}</div>
                {selectedRestriction.description && (
                  <div className="text-sm text-muted-foreground mt-2">
                    {selectedRestriction.description}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                This action cannot be undone. The route will no longer have access restrictions.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitDelete}>
              Delete Restriction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Access Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Route Access</DialogTitle>
            <DialogDescription>
              Test if a user with specific role/username can access a route
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="testRoutePath">Route Path</Label>
              <Input
                id="testRoutePath"
                placeholder="/admin/users"
                value={testData.routePath}
                onChange={(e) => setTestData({ ...testData, routePath: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="testUsername">Username/Email (optional)</Label>
              <Input
                id="testUsername"
                placeholder="user@example.com"
                value={testData.username}
                onChange={(e) => setTestData({ ...testData, username: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="testRole">User Role</Label>
              <select
                id="testRole"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={testData.role}
                onChange={(e) => setTestData({ ...testData, role: e.target.value })}
              >
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="tax_preparer">Tax Preparer</option>
                <option value="affiliate">Affiliate</option>
                <option value="client">Client</option>
                <option value="lead">Lead</option>
              </select>
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.allowed ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.allowed ? (
                    <>
                      <ShieldAlert className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-900">Access Allowed</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-900">Access Denied</span>
                    </>
                  )}
                </div>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium">Reason:</span> {testResult.reason}
                  </div>
                  {testResult.matchedPattern && (
                    <div>
                      <span className="font-medium">Matched Pattern:</span>{' '}
                      <code className="bg-white px-2 py-0.5 rounded">
                        {testResult.matchedPattern}
                      </code>
                    </div>
                  )}
                  {testResult.redirectUrl && (
                    <div>
                      <span className="font-medium">Redirect URL:</span> {testResult.redirectUrl}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Close
            </Button>
            <Button onClick={submitTest} disabled={!testData.routePath.trim()}>
              Test Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
