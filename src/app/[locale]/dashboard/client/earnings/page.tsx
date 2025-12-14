'use client';

/**
 * Client Earnings Page
 *
 * Shows referrers (clients) their commission earnings from referrals
 * Displays: Pending, Approved (ready for payout), Paid breakdown
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Clock,
  CheckCircle,
  Wallet,
  TrendingUp,
  Calendar,
  RefreshCw,
  Loader2,
  AlertCircle,
  Gift,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { EarningsOverviewCard } from '@/components/dashboard/earnings-overview-card';
import { PayoutRequestDialog } from '@/components/dashboard/payout-request-dialog';

interface Commission {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  clientName: string;
  clientEmail: string;
  tier: string;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  paymentMethod?: string;
}

interface EarningsStats {
  totalEarnings: number;
  pendingEarnings: number;
  approvedEarnings: number;
  paidEarnings: number;
  thisMonthEarnings: number;
  totalReferrals: number;
}

export default function ClientEarningsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/client/earnings?status=${statusFilter}`);

      if (!response.ok) {
        throw new Error('Failed to fetch earnings');
      }

      const data = await response.json();
      setCommissions(data.commissions || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message);
      logger.error('Error fetching earnings:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending (30-day hold)
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready for Payout
          </Badge>
        );
      case 'PAID':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <DollarSign className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Earnings</h1>
            <p className="text-muted-foreground">
              Track your referral commissions and payouts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => fetchData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {stats && stats.approvedEarnings > 0 && (
            <Button onClick={() => setShowPayoutDialog(true)}>
              <Wallet className="h-4 w-4 mr-2" />
              Request Payout
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalEarnings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                From {stats.totalReferrals} referrals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready for Payout</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${stats.approvedEarnings.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Available to withdraw</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${stats.pendingEarnings.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">30-day verification hold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Already Paid</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.paidEarnings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ${stats.thisMonthEarnings} this month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Commission Tiers Info */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Tiers</CardTitle>
          <CardDescription>
            Earn more as you refer more people!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">$50</p>
              <p className="text-sm text-muted-foreground">Referrals 1-5</p>
              <Badge variant="outline" className="mt-2">Tier 1</Badge>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">$75</p>
              <p className="text-sm text-muted-foreground">Referrals 6-10</p>
              <Badge variant="outline" className="mt-2">Tier 2</Badge>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">$100</p>
              <p className="text-sm text-muted-foreground">Referrals 11+</p>
              <Badge variant="outline" className="mt-2">Tier 3</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commission History</CardTitle>
              <CardDescription>
                Track the status of each commission
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="APPROVED">Ready for Payout</TabsTrigger>
              <TabsTrigger value="PENDING">Pending</TabsTrigger>
              <TabsTrigger value="PAID">Paid</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="mt-4">
              {commissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No commissions yet</p>
                  <p className="text-sm mt-1">
                    Share your referral link to start earning!
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Referred</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{commission.clientName}</p>
                            <p className="text-sm text-muted-foreground">
                              {commission.clientEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-lg">${commission.amount}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{commission.tier}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(commission.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(commission.createdAt).toLocaleDateString()}
                          </div>
                          {commission.paidAt && (
                            <p className="text-xs text-green-600 mt-1">
                              Paid: {new Date(commission.paidAt).toLocaleDateString()}
                              {commission.paymentMethod && ` via ${commission.paymentMethod}`}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Payout Request Dialog */}
      <PayoutRequestDialog
        open={showPayoutDialog}
        onOpenChange={setShowPayoutDialog}
        availableBalance={stats?.approvedEarnings || 0}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
