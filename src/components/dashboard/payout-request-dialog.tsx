'use client';

/**
 * Payout Request Dialog
 *
 * Dialog for requesting commission payouts with payment method selection
 * Validates available balance and payment details
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

interface PayoutRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  onSuccess?: () => void;
}

type PaymentMethod = 'PAYPAL' | 'BANK_TRANSFER' | 'CHECK' | 'VENMO' | 'CASHAPP';

const PAYMENT_METHODS = [
  { value: 'PAYPAL', label: 'PayPal', placeholder: 'your-email@example.com' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', placeholder: 'Account number or routing info' },
  { value: 'CHECK', label: 'Check (Mail)', placeholder: 'Mailing address' },
  { value: 'VENMO', label: 'Venmo', placeholder: '@username' },
  { value: 'CASHAPP', label: 'Cash App', placeholder: '$cashtag' },
];

export function PayoutRequestDialog({
  open,
  onOpenChange,
  availableBalance,
  onSuccess,
}: PayoutRequestDialogProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedMethod = PAYMENT_METHODS.find((m) => m.value === paymentMethod);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum > availableBalance) {
      setError(`Amount exceeds available balance ($${availableBalance.toFixed(2)})`);
      return;
    }

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    if (!paymentDetails.trim()) {
      setError('Please enter payment details');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountNum,
          paymentMethod,
          paymentDetails: paymentDetails.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request payout');
      }

      setSuccess(true);
      toast({
        title: 'Payout requested',
        description: `Your payout of $${amountNum.toFixed(2)} has been submitted for processing.`,
      });

      // Call onSuccess callback after a delay
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 2000);
    } catch (err) {
      logger.error('Failed to request payout', { error: err });
      setError(err.message || 'Failed to submit payout request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setPaymentMethod('');
    setPaymentDetails('');
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  const handleMaxAmount = () => {
    setAmount(availableBalance.toFixed(2));
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Payout Requested</h3>
              <p className="text-sm text-muted-foreground">
                Your payout request has been submitted successfully. You'll receive an email
                confirmation shortly.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Payout</DialogTitle>
          <DialogDescription>
            Request a payout from your approved earnings. Payouts are typically processed within 3-5
            business days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Available Balance */}
          <Alert>
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className="text-sm">Available Balance:</span>
                <span className="text-lg font-bold">${availableBalance.toFixed(2)}</span>
              </div>
            </AlertDescription>
          </Alert>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={availableBalance}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                required
              />
              <Button type="button" variant="outline" onClick={handleMaxAmount} disabled={loading}>
                Max
              </Button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              disabled={loading}
            >
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Details */}
          {paymentMethod && (
            <div className="space-y-2">
              <Label htmlFor="payment-details">{selectedMethod?.label} Details *</Label>
              <Input
                id="payment-details"
                type="text"
                placeholder={selectedMethod?.placeholder}
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter your {selectedMethod?.label.toLowerCase()} information for receiving payment
              </p>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !paymentMethod || !amount}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
