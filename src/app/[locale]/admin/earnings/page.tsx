import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  Users,
  Award,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react';
import {
  getAdminEarningsStats,
  getTopEarners,
  getRecentPayouts,
} from '@/lib/services/admin-analytics.service';

export const metadata = {
  title: 'Earnings Overview - Admin | Tax Genius Pro',
  description: 'Platform-wide earnings and commission tracking',
};

async function isAdmin() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role as string;
  return role === 'admin' || role === 'super_admin';
}

export default async function AdminEarningsPage() {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect('/forbidden');
  }

  const currentUserData = await auth();
  const isSuperAdmin = currentUserData?.publicMetadata?.role === 'super_admin';

  // Fetch real data from database
  const platformStats = await getAdminEarningsStats();
  const topEarners = await getTopEarners(5);
  const recentPayouts = await getRecentPayouts(5);

  const getRoleBadge = (role: string) => {
    const badges = {
      tax_preparer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      affiliate: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      client: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      lead: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
    return badges[role as keyof typeof badges] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings Overview</h1>
          <p className="text-muted-foreground mt-1">
            Platform-wide earnings, commissions, and payout tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="30">
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${platformStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+12.5%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${platformStats.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+8.3%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${platformStats.totalCommissions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ${platformStats.monthlyCommissions.toLocaleString()} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${platformStats.pendingPayouts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Earners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Earners
            </CardTitle>
            <CardDescription>Highest earning users this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topEarners.length > 0 ? (
                topEarners.map((earner, index) => (
                  <div key={earner.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-white font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{earner.name}</p>
                        <Badge className={getRoleBadge(earner.role)}>
                          {earner.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${earner.earnings.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {earner.returns && <span>{earner.returns} returns</span>}
                        {earner.referrals && <span>{earner.referrals} referrals</span>}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No earnings data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payouts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payouts</CardTitle>
            <CardDescription>Latest commission payouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayouts.length > 0 ? (
                recentPayouts.map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{payout.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payout.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className="font-semibold">${payout.amount.toLocaleString()}</p>
                        <Badge
                          variant={payout.status === 'completed' ? 'default' : 'secondary'}
                          className={
                            payout.status === 'completed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100'
                              : ''
                          }
                        >
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No payout history yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Breakdown by Role</CardTitle>
          <CardDescription>Commission distribution across user types</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Active Users</TableHead>
                <TableHead>Total Earnings</TableHead>
                <TableHead>Avg Per User</TableHead>
                <TableHead>Paid Out</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Badge className={getRoleBadge('tax_preparer')}>Tax Preparers</Badge>
                </TableCell>
                <TableCell>24</TableCell>
                <TableCell className="font-semibold">$18,450</TableCell>
                <TableCell>$769</TableCell>
                <TableCell>$16,200</TableCell>
                <TableCell>$2,250</TableCell>
                <TableCell>
                  <span className="text-green-500 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +15%
                  </span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Badge className={getRoleBadge('client')}>Clients (Referring)</Badge>
                </TableCell>
                <TableCell>38</TableCell>
                <TableCell className="font-semibold">$14,200</TableCell>
                <TableCell>$374</TableCell>
                <TableCell>$12,800</TableCell>
                <TableCell>$1,400</TableCell>
                <TableCell>
                  <span className="text-green-500 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +22%
                  </span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Badge className={getRoleBadge('affiliate')}>Affiliates</Badge>
                </TableCell>
                <TableCell>15</TableCell>
                <TableCell className="font-semibold">$10,200</TableCell>
                <TableCell>$680</TableCell>
                <TableCell>$9,200</TableCell>
                <TableCell>$1,000</TableCell>
                <TableCell>
                  <span className="text-red-500 flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" />
                    -5%
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Super Admin Earnings
            </CardTitle>
            <CardDescription>Your personal commission from platform operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-3xl font-bold mt-1">$24,580</p>
                <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-3xl font-bold mt-1">$4,820</p>
                <p className="text-xs text-green-500 mt-1">+18% from last month</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Payout</p>
                <p className="text-3xl font-bold mt-1">$4,820</p>
                <p className="text-xs text-muted-foreground mt-1">March 1, 2024</p>
              </div>
            </div>
            <Button className="w-full mt-4" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Request Payout
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
