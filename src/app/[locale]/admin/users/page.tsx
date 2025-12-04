import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
import { Users, Search, Filter, Download, UserPlus, Mail, Shield } from 'lucide-react';
import { UserManagementClient } from '@/components/UserManagementClient';

export const metadata = {
  title: 'User Management - Admin | Tax Genius Pro',
  description: 'Manage users and roles',
};

async function isAdmin() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role as string;
  return role === 'admin' || role === 'super_admin';
}

export default async function AdminUsersPage() {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect('/forbidden');
  }

  const currentUserData = await auth();
  const isSuperAdmin = currentUserData?.publicMetadata?.role === 'super_admin';

  // Fetch all users with profiles from database
  const usersWithProfiles = await prisma.user.findMany({
    take: 100,
    include: {
      profile: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Format users data for client component
  const formattedUsers = usersWithProfiles.map((user) => ({
    id: user.id,
    email: user.email,
    firstName: user.profile?.firstName || '',
    lastName: user.profile?.lastName || '',
    role: user.profile?.role ? String(user.profile.role) : 'CLIENT',
    permissions: user.profile?.customPermissions as Record<string, boolean> | undefined,
    createdAt: user.createdAt.toISOString(),
  }));

  // Count users by role
  const usersByRole = usersWithProfiles.reduce(
    (acc, user) => {
      const role = user.profile?.role ? String(user.profile.role) : 'no_role';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and permissions across the platform
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formattedUsers.length}</div>
            <p className="text-xs text-muted-foreground">Across all roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Preparers</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersByRole['tax_preparer'] || 0}</div>
            <p className="text-xs text-muted-foreground">Professional tax preparers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersByRole['lead'] || 0}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Mail className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersByRole['client'] || 0}</div>
            <p className="text-xs text-muted-foreground">Active clients</p>
          </CardContent>
        </Card>
      </div>

      {/* User Table - Client Component */}
      <UserManagementClient users={formattedUsers} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
