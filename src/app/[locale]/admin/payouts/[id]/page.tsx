'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  XCircle,
  ArrowLeft,
  AlertCircle,
  User,
  Mail,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface PayoutRequest {
  id: string;
  referrer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  amount: number;
  commissionIds: string[];
  commissions: Array<{
    id: string;
    amount: number;
    clientName: string;
    createdAt: string;
  }>;
  status: string;
  paymentMethod: string;
  notes: string | null;
  requestedAt: string;
  processedAt: string | null;
  paymentRef: string | null;
}

export default function PayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [payout, setPayout] = useState<PayoutRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');

  useEffect(() => {
    fetchPayoutDetails();
  }, [resolvedParams.id]);

  const fetchPayoutDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/payouts/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setPayout(data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load payout details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error fetching payout:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payout details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayout = async () => {
    if (!paymentRef.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a payment reference number',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/payouts/${resolvedParams.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentRef }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Payout approved and processed successfully',
        });
        router.push('/admin/payouts');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to approve payout',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve payout',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
      setShowApproveDialog(false);
    }
  };

  const handleRejectPayout = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/payouts/${resolvedParams.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rejectionNotes }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Payout rejected',
        });
        router.push('/admin/payouts');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to reject payout',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject payout',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
      setShowRejectDialog(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }
    > = {
      PENDING: { variant: 'outline', icon: Clock },
      APPROVED: { variant: 'secondary', icon: CheckCircle },
      PAID: { variant: 'default', icon: CheckCircle },
      REJECTED: { variant: 'destructive', icon: XCircle },
    };

    const config = variants[status] || variants.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!payout) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Payout request not found</p>
            <Button className="mt-4" onClick={() => router.push('/admin/payouts')}>
              Back to Payouts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isPending = payout.status === 'PENDING';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/admin/payouts')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Payout Request Details</h1>
              <p className="text-muted-foreground">ID: {payout.id}</p>
            </div>
          </div>
          {getStatusBadge(payout.status)}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Payout Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payout Information</CardTitle>
              <CardDescription>Request details and amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg border-2 border-green-200 dark:border-green-800">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payout Amount</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(payout.amount)}
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-green-600 opacity-50" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Requested At</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(payout.requestedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Payment Method</p>
                    <p className="text-sm text-muted-foreground">
                      {payout.paymentMethod.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                {payout.processedAt && (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Processed At</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payout.processedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {payout.paymentRef && (
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Payment Reference</p>
                      <p className="text-sm font-mono text-muted-foreground">{payout.paymentRef}</p>
                    </div>
                  </div>
                )}

                {payout.notes && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{payout.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Referrer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Referrer Information</CardTitle>
              <CardDescription>Contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">
                    {payout.referrer.firstName} {payout.referrer.lastName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{payout.referrer.email}</p>
                </div>
              </div>

              {payout.referrer.phone && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{payout.referrer.phone}</p>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/admin/referrers/${payout.referrer.id}`)}
                >
                  View Referrer Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Included Commissions</CardTitle>
            <CardDescription>
              {payout.commissions.length} commission(s) included in this payout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commission ID</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Earned Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payout.commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-mono text-xs">
                        {commission.id.substring(0, 12)}...
                      </TableCell>
                      <TableCell>{commission.clientName}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(commission.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(commission.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg flex items-center justify-between">
              <span className="font-medium">Total Payout:</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(payout.amount)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {isPending && (
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Approve or reject this payout request</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  className="flex-1"
                  onClick={() => setShowApproveDialog(true)}
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Mark as Paid
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Payout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approve Dialog */}
        <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Payout Request</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to approve a payout of{' '}
                <strong>{formatCurrency(payout.amount)}</strong> to{' '}
                <strong>
                  {payout.referrer.firstName} {payout.referrer.lastName}
                </strong>
                .
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="paymentRef">Payment Reference Number *</Label>
                <Input
                  id="paymentRef"
                  placeholder="e.g., sq_abc123 or bank_transfer_456"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the Square, PayPal, or bank transfer reference number
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApprovePayout} disabled={processing}>
                {processing ? 'Processing...' : 'Approve Payout'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Dialog */}
        <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Payout Request</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to reject the payout request from{' '}
                <strong>
                  {payout.referrer.firstName} {payout.referrer.lastName}
                </strong>
                . This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejectionNotes">Reason for Rejection (Optional)</Label>
                <Textarea
                  id="rejectionNotes"
                  placeholder="Explain why this payout is being rejected..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRejectPayout}
                disabled={processing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {processing ? 'Processing...' : 'Reject Payout'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
