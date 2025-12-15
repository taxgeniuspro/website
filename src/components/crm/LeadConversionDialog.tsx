'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
  UserCheck,
  Users,
  DollarSign,
} from 'lucide-react';

interface TaxIntakeLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  convertedToClient: boolean;
}

interface LeadConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: TaxIntakeLead | null;
  onConversionComplete: () => void;
}

type ConversionType = 'client' | 'affiliate';

const CONVERSION_OPTIONS: {
  value: ConversionType;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof UserCheck;
  color: string;
  bgColor: string;
}[] = [
  {
    value: 'client',
    label: 'Client (Standard Pricing)',
    shortLabel: 'Client',
    description: 'Standard client - gets their taxes prepared with regular pricing',
    icon: UserCheck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-600',
  },
  {
    value: 'affiliate',
    label: 'Client/Affiliate (Special Pricing)',
    shortLabel: 'Affiliate Client',
    description: 'Client with affiliate discount, personal referral links, and commission on referrals',
    icon: Users,
    color: 'text-green-600',
    bgColor: 'bg-green-600',
  },
];

export function LeadConversionDialog({
  open,
  onOpenChange,
  lead,
  onConversionComplete,
}: LeadConversionDialogProps) {
  const [conversionType, setConversionType] = useState<ConversionType>('client');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!lead) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/tax-preparer/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversionType,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert lead');
      }

      // Show success message based on conversion type
      let successMessage = '';
      if (conversionType === 'client') {
        successMessage = data.requiresSignup
          ? `Invitation sent to ${lead.email}. They'll become a client after signing up.`
          : 'Lead successfully converted to client!';
      } else if (conversionType === 'affiliate') {
        successMessage = data.requiresSignup
          ? `Invitation sent to ${lead.email}. They'll become an affiliate client after signing up.`
          : 'Lead converted to affiliate client with referral benefits!';
      }

      alert(successMessage);
      onOpenChange(false);
      onConversionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setConversionType('client');
      setNotes('');
      setError(null);
      onOpenChange(false);
    }
  };

  const selectedOption = CONVERSION_OPTIONS.find((opt) => opt.value === conversionType);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Lead</DialogTitle>
          <DialogDescription>
            Convert{' '}
            <span className="font-semibold">
              {lead?.first_name} {lead?.last_name}
            </span>{' '}
            to a client or affiliate client with special pricing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Conversion Type Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="conversion-type">Convert To</Label>
            <Select
              value={conversionType}
              onValueChange={(value) => setConversionType(value as ConversionType)}
            >
              <SelectTrigger id="conversion-type" className="w-full">
                <SelectValue placeholder="Select conversion type..." />
              </SelectTrigger>
              <SelectContent>
                {CONVERSION_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${option.color}`} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedOption && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedOption.description}
              </p>
            )}
          </div>

          {/* Info Card for Affiliate */}
          {conversionType === 'affiliate' && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-green-800 text-sm font-medium">
                  <DollarSign className="h-4 w-4" />
                  Affiliate Benefits
                </div>
                <ul className="mt-2 text-xs text-green-700 space-y-1">
                  <li>• Special affiliate pricing/discount</li>
                  <li>• Personal referral links (lead, intake, appointment)</li>
                  <li>• Commission on successful referrals</li>
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="conversion-notes">Notes (optional)</Label>
            <Textarea
              id="conversion-notes"
              placeholder="Add any notes about this conversion..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={submitting}
            className={selectedOption?.bgColor}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                {selectedOption && <selectedOption.icon className="h-4 w-4 mr-2" />}
                Convert to {selectedOption?.shortLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
