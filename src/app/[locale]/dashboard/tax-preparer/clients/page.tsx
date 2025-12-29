/**
 * Tax Preparer - My Clients Page
 *
 * Shows all clients assigned to the logged-in tax preparer.
 * Includes:
 * - Registered clients (ClientPreparer relationships)
 * - Complete intake forms (TaxIntakeLead with completed=true)
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getUserPermissions } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  AlertCircle,
  Calendar,
  ExternalLink,
  UserPlus,
} from 'lucide-react';
import { db, firstOrNull } from '@/lib/db';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';

// TypeScript interfaces for Supabase data
interface ClientData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  assignedAt: Date;
  taxReturns: Array<{ taxYear: number; status: string }>;
  user: { email: string } | null;
  source: 'registered' | 'intake_form';
  intakeLeadId?: string;
}

export const metadata = {
  title: 'My Clients - Tax Preparer | Tax Genius Pro',
  description: 'View and manage your assigned clients',
};

// Status badge variants
const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  IN_REVIEW: 'default',
  FILED: 'default',
  ACCEPTED: 'default',
  REJECTED: 'destructive',
  AMENDED: 'secondary',
  INTAKE_RECEIVED: 'default',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  FILED: 'Filed',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  AMENDED: 'Amended',
  INTAKE_RECEIVED: 'Intake Received',
};

export default async function MyClientsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect('/auth/signin');
  }

  const role = user?.role as string;
  const permissions = getUserPermissions(role as any, undefined);

  // Only tax preparers can access this page
  if (role !== 'tax_preparer' || !permissions.clients) {
    redirect('/forbidden');
  }

  // Get preparer's profile
  const { data: preparerProfiles } = await db
    .from('profiles')
    .select('id, firstName, lastName')
    .eq('userId', user.id)
    .limit(1);

  const preparerProfile = firstOrNull(preparerProfiles);

  if (!preparerProfile) {
    redirect('/dashboard/tax-preparer');
  }

  // Fetch clients from TWO sources:
  // 1. ClientPreparer relationships (registered users)
  // 2. Complete TaxIntakeLead records (intake forms with completed=true)
  let clients: ClientData[] = [];

  try {
    // Source 1: Registered clients via ClientPreparer
    const { data: clientRelationshipsData } = await db
      .from('client_preparers')
      .select(`
        assignedAt,
        client:profiles!client_preparers_clientId_fkey(
          id,
          firstName,
          lastName,
          phone,
          avatarUrl,
          taxReturns:tax_returns(taxYear, status),
          user:users!profiles_userId_fkey(email)
        )
      `)
      .eq('preparerId', preparerProfile.id)
      .eq('isActive', true)
      .order('assignedAt', { ascending: false });

    const registeredClients: ClientData[] = (clientRelationshipsData || []).map((rel: Record<string, unknown>) => {
      const client = rel.client as {
        id: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        avatarUrl: string | null;
        taxReturns: Array<{ taxYear: number; status: string }>;
        user: { email: string } | null;
      };
      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
        assignedAt: new Date(rel.assignedAt as string),
        taxReturns: (client.taxReturns || []).slice(0, 1),
        user: client.user,
        source: 'registered' as const,
      };
    });

    // Source 2: Complete intake forms (TaxIntakeLead with completed=true)
    const { data: completeIntakeForms } = await db
      .from('tax_intake_leads')
      .select('*')
      .eq('assignedPreparerId', preparerProfile.id)
      .eq('completed', true)
      .order('created_at', { ascending: false });

    // Get emails of registered clients to avoid duplicates
    const registeredEmails = new Set(
      registeredClients.map(c => c.user?.email?.toLowerCase()).filter(Boolean)
    );

    const intakeFormClients: ClientData[] = (completeIntakeForms || [])
      // Filter out intake forms that are already registered clients
      .filter((intake: { email: string }) => !registeredEmails.has(intake.email.toLowerCase()))
      .map((intake: {
        id: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        email: string;
        created_at: string;
        tax_year: number;
      }) => ({
        id: `intake_${intake.id}`,
        firstName: intake.first_name,
        lastName: intake.last_name,
        phone: intake.phone,
        avatarUrl: null,
        assignedAt: new Date(intake.created_at),
        taxReturns: [{ taxYear: intake.tax_year, status: 'INTAKE_RECEIVED' }],
        user: { email: intake.email },
        source: 'intake_form' as const,
        intakeLeadId: intake.id,
      }));

    // Combine both sources
    clients = [...registeredClients, ...intakeFormClients];

    // Sort by assignedAt descending
    clients.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
  } catch (error) {
    console.error('Error fetching clients:', error);
    // Continue with empty clients array
  }

  // Calculate statistics
  const totalClients = clients.length;
  const intakeFormClients = clients.filter((c) => c.source === 'intake_form').length;
  const pendingReviews = clients.filter(
    (c) => c.taxReturns[0]?.status === 'IN_REVIEW'
  ).length;
  const completedReturns = clients.filter(
    (c) => c.taxReturns[0]?.status === 'FILED' || c.taxReturns[0]?.status === 'ACCEPTED'
  ).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8" />
            My Clients
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your assigned clients
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/tax-preparer/leads">
            <Button variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              View Leads
            </Button>
          </Link>
          <Link href="/dashboard/tax-preparer/calendar">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Intakes</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{intakeFormClients}</div>
            <p className="text-xs text-muted-foreground">Ready for tax prep</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingReviews}</div>
            <p className="text-xs text-muted-foreground">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedReturns}</div>
            <p className="text-xs text-muted-foreground">Returns filed</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
          <CardDescription>
            All clients currently assigned to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Clients Yet</h3>
              <p className="text-muted-foreground mb-4">
                You don&apos;t have any clients assigned to you yet.
              </p>
              <Link href="/dashboard/tax-preparer/leads">
                <Button>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Your Leads
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Tax Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => {
                    const currentReturn = client.taxReturns[0];
                    const initials = `${client.firstName?.[0] || ''}${client.lastName?.[0] || ''}`.toUpperCase() || '?';
                    const isIntakeForm = client.source === 'intake_form';
                    const viewLink = isIntakeForm
                      ? `/dashboard/tax-preparer/leads/${client.intakeLeadId}`
                      : `/dashboard/tax-preparer/clients/${client.id}`;

                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={client.avatarUrl || undefined} />
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {client.firstName} {client.lastName}
                                {isIntakeForm && (
                                  <Badge variant="outline" className="text-xs">
                                    <UserPlus className="w-3 h-3 mr-1" />
                                    New
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {client.user?.email || 'No email'}
                              </p>
                            </div>
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
                            {client.user?.email && (
                              <p className="text-sm flex items-center gap-1 text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">
                                  {client.user.email}
                                </span>
                              </p>
                            )}
                          </div>
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
                            <Badge variant={statusColors[currentReturn.status] || 'secondary'}>
                              {statusLabels[currentReturn.status] || currentReturn.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              No Return
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {new Date(client.assignedAt).toLocaleDateString()}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={viewLink}>
                                <FileText className="w-3 h-3 mr-1" />
                                View
                              </Link>
                            </Button>
                            {client.user?.email && (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <a href={`mailto:${client.user.email}`}>
                                  <Mail className="w-3 h-3" />
                                </a>
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
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {clients.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <Link href="/dashboard/tax-preparer/calendar">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Schedule Appointments
                </CardTitle>
                <CardDescription>
                  Book meetings with your clients
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <Link href="/admin/file-center">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Client Documents
                </CardTitle>
                <CardDescription>
                  Access client files and tax documents
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <Link href="/dashboard/tax-preparer/tickets">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Support Tickets
                </CardTitle>
                <CardDescription>
                  View and respond to client inquiries
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}
