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
  Calendar,
  Download,
  Eye,
  ArrowUp,
  CreditCard,
  FileText,
  CheckCircle2,
  Clock,
  Users,
} from 'lucide-react';

export const metadata = {
  title: 'Earnings | Tax Genius Pro',
  description: 'Track your affiliate commissions',
};

async function isAffiliate() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role;
  return role === 'affiliate' || role === 'admin';
}

export default async function AffiliateEarningsPage() {
  const userIsAffiliate = await isAffiliate();

  if (!userIsAffiliate) {
    redirect('/forbidden');
  }

  // Mock earnings data
  const commissions = [
    {
      id: '1',
      lead: 'Jennifer Williams',
      service: 'Personal Tax Return',
      commission: 70,
      date: '2024-03-15',
      status: 'Paid',
      tier: 'Standard',
    },
    {
      id: '2',
      lead: 'Ashley Garcia',
      service: 'Business Tax Return',
      commission: 150,
      date: '2024-03-18',
      status: 'Paid',
      tier: 'Premium',
    },
    {
      id: '3',
      lead: 'Michael Torres',
      service: 'Tax Planning',
      commission: 40,
      date: '2024-03-20',
      status: 'Pending',
      tier: 'Standard',
    },
    {
      id: '4',
      lead: 'Rebecca Johnson',
      service: 'Personal Tax Return',
      commission: 70,
      date: '2024-03-22',
      status: 'Processing',
      tier: 'Standard',
    },
  ];

  const monthlyData = [
    { month: 'Jan', earnings: 420 },
    { month: 'Feb', earnings: 680 },
    { month: 'Mar', earnings: 330 },
  ];

  const totalEarnings = commissions.reduce((sum, c) => sum + c.commission, 0);
  const paidEarnings = commissions
    .filter((c) => c.status === 'Paid')
    .reduce((sum, c) => sum + c.commission, 0);
  const pendingEarnings = commissions
    .filter((c) => c.status === 'Pending' || c.status === 'Processing')
    .reduce((sum, c) => sum + c.commission, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'Processing':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getTierBadgeColor = (tier: string) => {
    return tier === 'Premium' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Earnings</h1>
          <p className="text-muted-foreground mt-1">Track your commission earnings and payouts</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="this-month">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${paidEarnings}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUp className="w-3 h-3 mr-1" />
              {commissions.filter((c) => c.status === 'Paid').length} commissions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pendingEarnings}</div>
            <p className="text-xs text-muted-foreground">
              {commissions.filter((c) => c.status !== 'Paid').length} pending payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Commission</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(totalEarnings / commissions.length)}
            </div>
            <p className="text-xs text-muted-foreground">Per conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Tiers</CardTitle>
          <CardDescription>Earn higher rates as you convert more leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-100 text-blue-700">Standard</Badge>
                <span className="text-2xl font-bold text-blue-600">20%</span>
              </div>
              <p className="text-sm text-muted-foreground">0-10 conversions/month</p>
              <div className="pt-2 border-t">
                <p className="text-xs font-medium">Current Tier</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-2 bg-primary/5 border-primary">
              <div className="flex items-center justify-between">
                <Badge className="bg-purple-100 text-purple-700">Premium</Badge>
                <span className="text-2xl font-bold text-purple-600">25%</span>
              </div>
              <p className="text-sm text-muted-foreground">11-25 conversions/month</p>
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-primary">3 more to unlock</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-yellow-100 text-yellow-700">Elite</Badge>
                <span className="text-2xl font-bold text-yellow-600">30%</span>
              </div>
              <p className="text-sm text-muted-foreground">26+ conversions/month</p>
              <div className="pt-2 border-t">
                <p className="text-xs font-medium">19 more to unlock</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Earnings</CardTitle>
          <CardDescription>Your commission earnings over the past 3 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-end justify-between gap-4">
            {monthlyData.map((data) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-primary rounded-t-lg transition-all hover:bg-primary/80"
                  style={{ height: `${(data.earnings / 1000) * 100}%` }}
                />
                <div className="text-sm font-medium">{data.month}</div>
                <div className="text-xs text-muted-foreground">${data.earnings}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commission History</CardTitle>
              <CardDescription>Your latest commission earnings</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{commission.lead}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{commission.service}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTierBadgeColor(commission.tier)}>{commission.tier}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-green-600">${commission.commission}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3" />
                      {new Date(commission.date).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(commission.status)}>{commission.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              <CardTitle>Payment Method</CardTitle>
            </div>
            <CardDescription>How you receive your commissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Direct Deposit</p>
                    <p className="text-sm text-muted-foreground">Bank Account •••• 4567</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700">Active</Badge>
              </div>
              <Button variant="outline" className="w-full">
                Update Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <CardTitle>Tax Documents</CardTitle>
            </div>
            <CardDescription>Your 1099 forms and records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm">1099-NEC 2024</p>
                    <p className="text-xs text-muted-foreground">Year-to-date earnings</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm">1099-NEC 2023</p>
                    <p className="text-xs text-muted-foreground">Previous year</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
