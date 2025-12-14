'use client';

/**
 * Payout Obligations Client Component
 *
 * Shows Tax Preparer what they owe to referrers and allows marking as paid
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Loader2,
  CreditCard,
  Users,
  TrendingUp,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface Commission {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  sourceType: string;
  sourceId: string;
  clientName: string;
  clientEmail: string;
  tier: string;
  rateSource: string;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
}

interface PayoutStats {
  totalOwed: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  paidCount: number;
  paidAmount: number;
  thisMonthPaid: number;
}

interface PayoutObligationsClientProps {
  preparerId: string;
}

export function PayoutObligationsClient({ preparerId }: PayoutObligationsClientProps) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mark as Paid dialog state
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tax-preparer/payout-obligations?status=${statusFilter}`);

      if (!response.ok) {
        throw new Error('Failed to fetch payout obligations');
      }

      const data = await response.json();
      setCommissions(data.commissions || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message);
      logger.error('Error fetching payout obligations:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAsPaid = async () => {
    if (!selectedCommission || !paymentMethod) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/tax-preparer/payout-obligations/${selectedCommission.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          paymentReference,
          notes: paymentNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark as paid');
      }

      alert(`Successfully marked $${selectedCommission.amount} commission to ${selectedCommission.referrerName} as PAID!`);
      setMarkPaidDialogOpen(false);
      setSelectedCommission(null);
      setPaymentMethod('');
      setPaymentReference('');
      setPaymentNotes('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as paid');
    } finally {
      setSubmitting(false);
    }
  };

  const openMarkPaidDialog = (commission: Commission) => {
    setSelectedCommission(commission);
    setMarkPaidDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready to Pay
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

  const filteredCommissions = commissions.filter((c) => {
    const matchesSearch =
      searchTerm === '' ||
      c.referrerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.referrerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payout Obligations</h1>
          <p className="text-muted-foreground mt-1">
            Commissions you owe to your referrers (clients & affiliates)
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchData()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Owed</CardTitle>
              <DollarSign className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${stats.totalOwed.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingCount + stats.approvedCount} unpaid commissions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready to Pay</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${stats.approvedAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.approvedCount} approved commissions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${stats.pendingAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingCount} pending (30-day hold)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.thisMonthPaid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ${stats.paidAmount.toLocaleString()} total paid
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commission Payouts</CardTitle>
              <CardDescription>
                Track and pay commissions to your referrers
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search referrer or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="APPROVED">
                Ready to Pay ({stats?.approvedCount || 0})
              </TabsTrigger>
              <TabsTrigger value="PENDING">
                Pending ({stats?.pendingCount || 0})
              </TabsTrigger>
              <TabsTrigger value="PAID">Paid ({stats?.paidCount || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="mt-4">
              {filteredCommissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No commissions found</p>
                  <p className="text-sm mt-1">
                    Commissions will appear here when referrers bring in clients
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCommissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{commission.referrerName}</p>
                            <p className="text-sm text-muted-foreground">
                              {commission.referrerEmail}
                            </p>
                          </div>
                        </TableCell>
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
                          <p className="text-xs text-muted-foreground mt-1">
                            {commission.rateSource}
                          </p>
                        </TableCell>
                        <TableCell>{getStatusBadge(commission.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(commission.createdAt).toLocaleDateString()}
                          </div>
                          {commission.paidAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Paid: {new Date(commission.paidAt).toLocaleDateString()}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {commission.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => openMarkPaidDialog(commission)}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                          {commission.status === 'PENDING' && (
                            <span className="text-xs text-muted-foreground">
                              30-day hold
                            </span>
                          )}
                          {commission.status === 'PAID' && commission.paymentMethod && (
                            <span className="text-xs text-muted-foreground">
                              via {commission.paymentMethod}
                            </span>
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

      {/* Mark as Paid Dialog */}
      <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Commission as Paid</DialogTitle>
            <DialogDescription>
              Record payment of ${selectedCommission?.amount} to{' '}
              {selectedCommission?.referrerName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Referrer:</span>
                <span className="font-medium">{selectedCommission?.referrerName}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Client:</span>
                <span>{selectedCommission?.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="font-bold text-lg text-green-600">
                  ${selectedCommission?.amount}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method *</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="ZELLE">Zelle</SelectItem>
                  <SelectItem value="VENMO">Venmo</SelectItem>
                  <SelectItem value="CASHAPP">Cash App</SelectItem>
                  <SelectItem value="PAYPAL">PayPal</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Reference (optional)</label>
              <Input
                placeholder="e.g., Check #1234, Zelle confirmation"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Any additional notes about this payment..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkPaidDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleMarkAsPaid}
              disabled={submitting || !paymentMethod}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
