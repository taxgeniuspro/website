import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  UserPlus,
  Link2,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Status badge colors
const statusColors: Record<string, string> = {
  PENDING: 'secondary',
  ACTIVE: 'default',
  COMPLETED: 'success',
  INACTIVE: 'destructive',
};

export default async function ReferralsStatusPage() {
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
  if (!permissions.referralsStatus) {
    redirect('/forbidden');
  }

  // Initialize with empty arrays in case of errors
  let referrals: any[] = [];
  let topReferrers: any[] = [];

  try {
    // Fetch all referrals with related data
    referrals = await prisma.referral.findMany({
      include: {
        referrer: true,
        client: true,
        commissions: true,
        analytics: {
          where: {
            eventType: 'LINK_CLICK',
          },
          orderBy: {
            eventDate: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        signupDate: 'desc',
      },
    });

    // Get top referrers
    topReferrers = await prisma.profile.findMany({
      where: {
        role: 'REFERRER',
      },
      include: {
        referrerReferrals: {
          where: {
            status: 'COMPLETED',
          },
        },
      },
      orderBy: {
        referrerReferrals: {
          _count: 'desc',
        },
      },
      take: 5,
    });
  } catch (error) {
    logger.error('Error fetching referrals data:', error);
    // Continue with empty arrays - will show "No referrals found" message
  }

  // Get statistics
  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter((r) => r.status === 'ACTIVE').length;
  const completedReferrals = referrals.filter((r) => r.status === 'COMPLETED').length;
  const totalCommissions = referrals.reduce((sum, r) => {
    const commissionAmount = r.commissions.reduce(
      (cSum, c) => cSum + parseFloat(c.amount.toString()),
      0
    );
    return sum + commissionAmount;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserPlus className="w-8 h-8" />
              Referrals Status
            </h1>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <p className="text-muted-foreground">
            Track and manage all referral activities and commissions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReferrals}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Referrals</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeReferrals}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedReferrals}</div>
              <p className="text-xs text-muted-foreground">Returns filed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
              <DollarSign className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalCommissions.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Earned so far</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Referrers */}
        {topReferrers.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Top Referrers</CardTitle>
              <CardDescription>Best performing referrers by completed referrals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                {topReferrers.map((referrer, index) => (
                  <div key={referrer.id} className="text-center">
                    <div className="relative">
                      <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <span className="text-2xl font-bold">{index + 1}</span>
                      </div>
                      {index === 0 && (
                        <Badge className="absolute -top-2 -right-2" variant="default">
                          Top
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">
                      {referrer.firstName} {referrer.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {referrer.referrerReferrals.length} referrals
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by referrer, client, or code..." className="pl-8" />
                </div>
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referrals Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Referrals</CardTitle>
            <CardDescription>
              Complete list of all referral relationships and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signup Date</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No referrals found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    referrals.map((referral) => {
                      const lastActivity = referral.analytics[0];
                      const totalCommission = referral.commissions.reduce(
                        (sum, c) => sum + parseFloat(c.amount.toString()),
                        0
                      );

                      return (
                        <TableRow key={referral.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {referral.referrer.firstName} {referral.referrer.lastName}
                              </p>
                              {referral.referrer.vanitySlug && (
                                <p className="text-xs text-muted-foreground">
                                  @{referral.referrer.vanitySlug}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {referral.client.firstName} {referral.client.lastName}
                              </p>
                              {referral.client.phone && (
                                <p className="text-xs text-muted-foreground">
                                  {referral.client.phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {referral.referralCode}
                              </code>
                              <Button size="sm" variant="ghost">
                                <Link2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColors[referral.status] as any}>
                              {referral.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {new Date(referral.signupDate).toLocaleDateString()}
                            </p>
                          </TableCell>
                          <TableCell>
                            {totalCommission > 0 ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-green-600" />
                                <span className="font-medium">{totalCommission.toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {lastActivity ? (
                              <p className="text-sm">
                                {new Date(lastActivity.eventDate).toLocaleDateString()}
                              </p>
                            ) : (
                              <span className="text-muted-foreground">No activity</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
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
