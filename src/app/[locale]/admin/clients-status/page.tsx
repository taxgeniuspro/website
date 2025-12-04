import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ClientsManagement } from '@/components/admin/ClientsManagement';
import { logger } from '@/lib/logger';

// Status badge colors
const statusColors: Record<string, string> = {
  DRAFT: 'secondary',
  IN_REVIEW: 'default',
  FILED: 'success',
  ACCEPTED: 'success',
  REJECTED: 'destructive',
  AMENDED: 'warning',
};

export default async function ClientsStatusPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Get authenticated user
  const session = await auth(); const user = session?.user;

  if (!user) {
    redirect('/auth/signin');
  }

  // Check permissions
  const role = user?.role as UserRole | undefined;
  const customPermissions = user?.permissions as any;
  const permissions = getUserPermissions(role || 'client', customPermissions);

  // Check if user has access to this page
  if (!permissions.clientsStatus) {
    redirect('/forbidden');
  }

  // Get filter parameters
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const statusFilter = typeof searchParams.status === 'string' ? searchParams.status : '';
  const preparerFilter = typeof searchParams.preparer === 'string' ? searchParams.preparer : '';

  // Initialize with empty arrays in case of errors
  let preparers: any[] = [];
  let clients: any[] = [];

  try {
    // Fetch all tax preparers for the filter dropdown
    preparers = await prisma.profile.findMany({
      where: {
        role: 'TAX_PREPARER',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    // Build where clause for clients
    const clientsWhere: any = {
      role: 'CLIENT',
    };

    // Apply search filter
    if (search) {
      clientsWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch all clients with their tax return status
    clients = await prisma.profile.findMany({
      where: clientsWhere,
      include: {
        taxReturns: {
          where: statusFilter ? { status: statusFilter.toUpperCase() as any } : undefined,
          orderBy: {
            taxYear: 'desc',
          },
          take: 1, // Get the most recent tax return
        },
        clientPreparers: {
          where: {
            isActive: true,
            ...(preparerFilter && preparerFilter !== 'all' && preparerFilter !== 'unassigned'
              ? { preparerId: preparerFilter }
              : {}),
          },
          include: {
            preparer: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error) {
    logger.error('Error fetching clients data:', error);
    // Continue with empty arrays - will show "No clients found" message
  }

  // Filter clients based on preparer assignment
  let filteredClients = clients;

  if (preparerFilter === 'unassigned') {
    filteredClients = clients.filter((c) => c.clientPreparers.length === 0);
  } else if (preparerFilter && preparerFilter !== 'all') {
    filteredClients = clients.filter((c) =>
      c.clientPreparers.some((cp) => cp.preparerId === preparerFilter)
    );
  }

  // Filter by status if needed (for clients without returns)
  if (statusFilter) {
    filteredClients = filteredClients.filter((c) => c.taxReturns.length > 0);
  }

  // Get statistics from filtered clients
  const totalClients = filteredClients.length;
  const activeClients = filteredClients.filter((c) => c.taxReturns.length > 0).length;
  const pendingReviews = filteredClients.filter(
    (c) => c.taxReturns[0]?.status === 'IN_REVIEW'
  ).length;
  const completedReturns = filteredClients.filter(
    (c) => c.taxReturns[0]?.status === 'FILED' || c.taxReturns[0]?.status === 'ACCEPTED'
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <UserCheck className="w-8 h-8" />
            Clients Status
          </h1>
          <p className="text-muted-foreground">
            Manage and track all client tax preparation statuses
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
              <p className="text-xs text-muted-foreground">All registered clients</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeClients}</div>
              <p className="text-xs text-muted-foreground">With tax returns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingReviews}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedReturns}</div>
              <p className="text-xs text-muted-foreground">Returns filed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Filters & Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientsManagement preparers={preparers} />
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Clients</CardTitle>
            <CardDescription>Click on any client to view detailed information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Assigned Preparer</TableHead>
                    <TableHead>Tax Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No clients found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => {
                      const currentReturn = client.taxReturns[0];
                      const assignedPreparer = client.clientPreparers[0]?.preparer;

                      return (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p>
                                {client.firstName} {client.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ID: {client.userId || client.id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {client.phone && (
                                <p className="text-sm flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {client.phone}
                                </p>
                              )}
                              {client.userId && (
                                <p className="text-sm flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  Contact via system
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignedPreparer ? (
                              <div>
                                <p className="font-medium">
                                  {assignedPreparer.firstName} {assignedPreparer.lastName}
                                </p>
                                {assignedPreparer.companyName && (
                                  <p className="text-xs text-muted-foreground">
                                    {assignedPreparer.companyName}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline">Unassigned</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {currentReturn ? (
                              <Badge variant="outline">{currentReturn.taxYear}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {currentReturn ? (
                              <Badge variant={statusColors[currentReturn.status] as any}>
                                {currentReturn.status}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">No Return</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {new Date(client.updatedAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(client.updatedAt).toLocaleTimeString()}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <FileText className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline">
                                <Mail className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
