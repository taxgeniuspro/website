'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Search, Filter, Download, UserPlus, Trash2, ExternalLink } from 'lucide-react';
import { EditUserModal } from '@/components/admin/EditUserModal';
import { CreateTaxPreparerModal } from '@/components/admin/CreateTaxPreparerModal';
import { UserRole, UserPermissions } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Owliver Owl's profile ID - cannot be terminated
const OWLIVER_PROFILE_ID = 'p_086ccd7b-6a51-406a-b157-bfc8a743c676';

type AffiliateStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'INACTIVE';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: Record<string, boolean>;
  createdAt: string;
  isActive?: boolean;
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
  affiliateStatus?: AffiliateStatus;
}

interface UserManagementClientProps {
  users: User[];
  isSuperAdmin: boolean;
}

export function UserManagementClient({
  users: initialUsers,
  isSuperAdmin,
}: UserManagementClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [terminateUser, setTerminateUser] = useState<User | null>(null);
  const [isTerminating, setIsTerminating] = useState(false);
  const router = useRouter();

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (userData: {
    userId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    permissions: Partial<UserPermissions>;
    isActive?: boolean;
    affiliateStatus?: AffiliateStatus;
  }) => {
    try {
      const response = await fetch(`/api/admin/users/${userData.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          permissions: userData.permissions,
          isActive: userData.isActive,
          affiliateStatus: userData.affiliateStatus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      const data = await response.json();

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userData.userId
            ? {
                ...user,
                email: data.user.email || user.email,
                firstName: data.user.firstName || user.firstName,
                lastName: data.user.lastName || user.lastName,
                role: data.user.role,
                permissions: data.user.permissions,
                isActive: data.user.isActive,
                deactivatedAt: data.user.deactivatedAt,
                deactivatedBy: data.user.deactivatedBy,
                affiliateStatus: data.user.affiliateStatus,
              }
            : user
        )
      );

      toast.success('User updated successfully');
      router.refresh();
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  };

  const handleTerminatePreparer = async () => {
    if (!terminateUser) return;

    setIsTerminating(true);
    try {
      const response = await fetch(`/api/admin/preparers/${terminateUser.id}/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to terminate preparer');
      }

      // Remove from local state
      setUsers((prev) => prev.filter((user) => user.id !== terminateUser.id));

      toast.success(
        `${data.preparerName} has been terminated. ${data.clientsReassigned} clients and ${data.leadsReassigned} leads reassigned to Owliver Owl.`
      );
      router.refresh();
    } catch (error) {
      logger.error('Error terminating preparer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to terminate preparer');
    } finally {
      setIsTerminating(false);
      setTerminateUser(null);
    }
  };

  const canTerminate = (user: User): boolean => {
    // Can only terminate tax preparers
    if (user.role !== 'tax_preparer') return false;
    // Cannot terminate Owliver
    if (user.id === OWLIVER_PROFILE_ID) return false;
    return true;
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'tax_preparer':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'affiliate':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'client':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
  };

  const formatRole = (role?: string) => {
    if (!role) return 'No Role';
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Filter users based on search, role, and status
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === '' ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    const userIsActive = user.isActive ?? true;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && userIsActive) ||
      (statusFilter === 'inactive' && !userIsActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>
            View and manage all users in the system - Click Edit to update user information and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="tax_preparer">Tax Preparer</SelectItem>
                <SelectItem value="affiliate">Affiliate</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Create Tax Preparer
            </Button>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const createdAt = new Date(user.createdAt).toLocaleDateString();

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                            {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.firstName || user.lastName
                                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                : 'No Name'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {user.id.substring(0, 12)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {formatRole(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(user.isActive ?? true) ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{createdAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/crm/contacts?search=${encodeURIComponent(user.email)}`)}
                            title="View in People Hub"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            CRM
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </Button>
                          {canTerminate(user) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setTerminateUser(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      {selectedUser && (
        <EditUserModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          user={{
            id: selectedUser.id,
            email: selectedUser.email,
            firstName: selectedUser.firstName,
            lastName: selectedUser.lastName,
            role: selectedUser.role as UserRole,
            permissions: selectedUser.permissions as Partial<UserPermissions>,
            isActive: selectedUser.isActive,
            deactivatedAt: selectedUser.deactivatedAt,
            deactivatedBy: selectedUser.deactivatedBy,
            affiliateStatus: selectedUser.affiliateStatus,
          }}
          onSave={handleSaveUser}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Create Tax Preparer Modal */}
      <CreateTaxPreparerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Refresh the page to show new user
          router.refresh();
        }}
      />

      {/* Terminate Preparer Confirmation Dialog */}
      <AlertDialog open={!!terminateUser} onOpenChange={(open) => !open && setTerminateUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Terminate Tax Preparer
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to terminate{' '}
                  <span className="font-semibold">
                    {terminateUser?.firstName} {terminateUser?.lastName}
                  </span>
                  ?
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                  <p className="font-medium mb-1">This action will:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Reassign all their clients to Owliver Owl (Tax Genius)</li>
                    <li>Reassign all their leads to Owliver Owl</li>
                    <li>Delete their referral images and short links</li>
                    <li>Delete their profile and user account</li>
                  </ul>
                </div>
                <p className="text-red-600 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTerminating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminatePreparer}
              disabled={isTerminating}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isTerminating ? 'Terminating...' : 'Terminate Preparer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
