import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Calendar, DollarSign } from 'lucide-react';

export const metadata = {
  title: 'My Returns | Tax Genius Pro',
  description: 'View your tax returns',
};

async function isClient() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role;
  return role === 'client' || role === 'admin';
}

export default async function ClientReturnsPage() {
  const userIsClient = await isClient();

  if (!userIsClient) {
    redirect('/forbidden');
  }

  // Mock tax returns data
  const returns = [
    {
      id: '1',
      year: 2024,
      status: 'Filed',
      filedDate: '2024-04-10',
      refundAmount: 2450,
      preparer: 'Sarah Johnson, CPA',
    },
    {
      id: '2',
      year: 2023,
      status: 'Filed',
      filedDate: '2023-04-08',
      refundAmount: 1850,
      preparer: 'Sarah Johnson, CPA',
    },
    {
      id: '3',
      year: 2022,
      status: 'Filed',
      filedDate: '2022-04-12',
      refundAmount: 2100,
      preparer: 'Michael Chen, CPA',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Filed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tax Returns</h1>
          <p className="text-muted-foreground mt-1">View and download your tax returns</p>
        </div>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          Start New Return
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${returns.reduce((acc, r) => acc + r.refundAmount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across {returns.length} years</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returns Filed</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returns.length}</div>
            <p className="text-xs text-muted-foreground">All successfully filed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Return</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returns[0].year}</div>
            <p className="text-xs text-muted-foreground">
              Filed {new Date(returns[0].filedDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Returns List */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Return History</CardTitle>
          <CardDescription>View and download your past tax returns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {returns.map((taxReturn) => (
              <div
                key={taxReturn.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{taxReturn.year} Tax Return</h3>
                    <p className="text-sm text-muted-foreground">
                      Prepared by {taxReturn.preparer}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Filed: {new Date(taxReturn.filedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      Refund: ${taxReturn.refundAmount.toLocaleString()}
                    </p>
                    <Badge className={getStatusColor(taxReturn.status)}>{taxReturn.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
