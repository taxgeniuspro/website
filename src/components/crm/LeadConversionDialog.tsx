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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  UserCheck,
  Users,
  Briefcase,
  DollarSign,
  Link2,
  FileText,
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

type ConversionType = 'client' | 'affiliate' | 'preparer';

const CONVERSION_OPTIONS = [
  {
    value: 'client' as ConversionType,
    label: 'Convert to Client',
    description: 'Standard client - gets their taxes prepared',
    icon: UserCheck,
    color: 'bg-purple-600',
    benefits: ['Full tax preparation service', 'Standard pricing', 'Assigned to your workload'],
  },
  {
    value: 'affiliate' as ConversionType,
    label: 'Convert to Affiliate Client',
    description: 'Client with referral benefits',
    icon: Users,
    color: 'bg-green-600',
    benefits: [
      'Tax preparation with affiliate discount',
      'Gets their own referral links',
      'Can earn commissions on referrals',
    ],
  },
  {
    value: 'preparer' as ConversionType,
    label: 'Convert to Tax Preparer',
    description: 'Creates application for admin approval',
    icon: Briefcase,
    color: 'bg-blue-600',
    benefits: [
      'Creates preparer application',
      'Pre-fills with lead info',
      'Routes to admin for approval',
    ],
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
      } else if (conversionType === 'preparer') {
        successMessage = `Tax preparer application created for ${lead.first_name} ${lead.last_name}. Awaiting admin approval.`;
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert Lead</DialogTitle>
          <DialogDescription>
            Choose how to convert{' '}
            <span className="font-semibold">
              {lead?.first_name} {lead?.last_name}
            </span>{' '}
            ({lead?.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Conversion Type Selection */}
          <RadioGroup
            value={conversionType}
            onValueChange={(value) => setConversionType(value as ConversionType)}
            className="space-y-3"
          >
            {CONVERSION_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = conversionType === option.value;

              return (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'ring-2 ring-primary border-primary'
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => setConversionType(option.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${option.color}`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <Label
                            htmlFor={option.value}
                            className="font-semibold cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                        {isSelected && (
                          <ul className="mt-2 space-y-1">
                            {option.benefits.map((benefit, idx) => (
                              <li
                                key={idx}
                                className="text-xs text-muted-foreground flex items-center gap-1"
                              >
                                <span className="text-green-600">✓</span> {benefit}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </RadioGroup>

          {/* Additional Info for Selected Type */}
          {conversionType === 'affiliate' && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-green-800 text-sm">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Affiliate Benefits:</span>
                </div>
                <ul className="mt-1 text-xs text-green-700 space-y-0.5 ml-6">
                  <li>• 15% discount on tax preparation services</li>
                  <li>• Personal referral links (lead, intake, appointment)</li>
                  <li>• Commission on successful referrals</li>
                </ul>
              </CardContent>
            </Card>
          )}

          {conversionType === 'preparer' && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-blue-800 text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Application Process:</span>
                </div>
                <ul className="mt-1 text-xs text-blue-700 space-y-0.5 ml-6">
                  <li>• Application created with lead's info pre-filled</li>
                  <li>• Admin reviews and approves/rejects</li>
                  <li>• If approved: account created with tax preparer role</li>
                  <li>• Gets tracking code, QR code, and referral links</li>
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="conversion-notes">Notes (optional)</Label>
            <Textarea
              id="conversion-notes"
              placeholder="Add any notes about this conversion..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1"
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
            className={selectedOption?.color}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                {selectedOption && <selectedOption.icon className="h-4 w-4 mr-2" />}
                {selectedOption?.label}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
