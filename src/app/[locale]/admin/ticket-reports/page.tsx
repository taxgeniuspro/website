import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketReportsOverview } from '@/components/admin/ticket-reports-overview';
import { TicketReportsCharts } from '@/components/admin/ticket-reports-charts';
import { TicketReportsTable } from '@/components/admin/ticket-reports-table';
import { BarChart3, TrendingUp, Clock, Users } from 'lucide-react';

export const metadata = {
  title: 'Ticket Reports & Analytics | Tax Genius Pro',
  description: 'Analyze support ticket metrics and performance',
};

async function isAdmin() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role;
  return role === 'admin' || role === 'super_admin';
}

export default async function TicketReportsPage() {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect('/forbidden');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ticket Reports & Analytics
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Monitor support performance and ticket metrics
          </p>
        </div>

        {/* Overview Stats */}
        <TicketReportsOverview />

        {/* Reports Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance">
              <TrendingUp className="w-4 h-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="preparers">
              <Users className="w-4 h-4 mr-2" />
              Preparers
            </TabsTrigger>
            <TabsTrigger value="trends">
              <Clock className="w-4 h-4 mr-2" />
              Trends
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <TicketReportsCharts type="overview" />

            <Card>
              <CardHeader>
                <CardTitle>Recent Tickets</CardTitle>
                <CardDescription>Latest support tickets across all preparers</CardDescription>
              </CardHeader>
              <CardContent>
                <TicketReportsTable view="recent" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.4h</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">↓ 15%</span> from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">18.3h</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">↓ 8%</span> from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">94.2%</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">↑ 3%</span> from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            <TicketReportsCharts type="performance" />

            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
                <CardDescription>How quickly tickets receive their first response</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Under 1 hour</span>
                    <div className="flex items-center gap-2">
                      <div className="w-64 bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }} />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">45%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">1-4 hours</span>
                    <div className="flex items-center gap-2">
                      <div className="w-64 bg-muted rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '35%' }} />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">35%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">4-24 hours</span>
                    <div className="flex items-center gap-2">
                      <div className="w-64 bg-muted rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '15%' }} />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">15%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Over 24 hours</span>
                    <div className="flex items-center gap-2">
                      <div className="w-64 bg-muted rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '5%' }} />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">5%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preparers Tab */}
          <TabsContent value="preparers" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preparer Performance</CardTitle>
                <CardDescription>Individual metrics for each tax preparer</CardDescription>
              </CardHeader>
              <CardContent>
                <TicketReportsTable view="preparers" />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>Preparers with highest resolution rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: 'Sarah Johnson', resolved: 156, rate: 98.1 },
                      { name: 'Michael Chen', resolved: 143, rate: 96.6 },
                      { name: 'Emily Davis', resolved: 128, rate: 95.5 },
                    ].map((preparer, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{preparer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {preparer.resolved} tickets resolved
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">{preparer.rate}%</p>
                          <p className="text-xs text-muted-foreground">success rate</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fastest Responders</CardTitle>
                  <CardDescription>Preparers with lowest response times</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: 'Michael Chen', avgTime: '1.2h' },
                      { name: 'Sarah Johnson', avgTime: '1.8h' },
                      { name: 'Robert Williams', avgTime: '2.1h' },
                    ].map((preparer, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{preparer.name}</p>
                          <p className="text-sm text-muted-foreground">Average response time</p>
                        </div>
                        <div className="text-lg font-bold text-blue-600">{preparer.avgTime}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="mt-6 space-y-6">
            <TicketReportsCharts type="trends" />

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Most Common Tags</CardTitle>
                  <CardDescription>Popular ticket categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { tag: 'tax-deductions', count: 89 },
                      { tag: 'document-request', count: 67 },
                      { tag: 'refund-status', count: 54 },
                      { tag: 'filing-extension', count: 42 },
                      { tag: 'amendment', count: 31 },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{item.tag}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${(item.count / 89) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Busiest Times</CardTitle>
                  <CardDescription>When tickets are created most often</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { time: '9 AM - 12 PM', percentage: 35 },
                      { time: '12 PM - 3 PM', percentage: 28 },
                      { time: '3 PM - 6 PM', percentage: 22 },
                      { time: '6 PM - 9 PM', percentage: 10 },
                      { time: 'Other hours', percentage: 5 },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{item.time}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
