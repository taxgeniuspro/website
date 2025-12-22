'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { FlexibleTierStructure, FlexibleTier } from '@/lib/types/commission-tiers';
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

interface AdminCommissionSettingsFormProps {
  initialTiers: FlexibleTierStructure;
}

const TIER_COLORS = [
  'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200',
  'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200',
  'bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200',
  'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200',
  'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200',
];

const TIER_BADGE_COLORS = [
  'bg-amber-100 text-amber-800',
  'bg-slate-100 text-slate-800',
  'bg-yellow-100 text-yellow-800',
  'bg-emerald-100 text-emerald-800',
  'bg-purple-100 text-purple-800',
];

const MAX_TIERS = 5;
const MIN_TIERS = 1;

export function AdminCommissionSettingsForm({
  initialTiers,
}: AdminCommissionSettingsFormProps) {
  const [tiers, setTiers] = useState<FlexibleTierStructure>(initialTiers);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleTierChange = (
    index: number,
    field: 'max' | 'rate',
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setTiers((prev) => {
      const updated = [...prev];
      if (field === 'max') {
        updated[index] = { ...updated[index], max: numValue };
      } else {
        updated[index] = { ...updated[index], rate: numValue };
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleAddTier = () => {
    if (tiers.length >= MAX_TIERS) return;

    const lastTier = tiers[tiers.length - 1];
    const previousMax = tiers.length > 1 ? tiers[tiers.length - 2].max ?? 0 : 0;

    const newTier: FlexibleTier = {
      max: (previousMax || 0) + 10 + 10,
      rate: lastTier.rate,
    };

    setTiers((prev) => {
      const updated = [...prev];
      updated.splice(prev.length - 1, 0, newTier);
      return updated;
    });
    setHasChanges(true);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= MIN_TIERS) return;

    setTiers((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    setHasChanges(true);
  };

  const handleReset = () => {
    setTiers(initialTiers);
    setHasChanges(false);
  };

  const handleSaveClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false);
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/commission-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      toast.success('Company commission settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Validate tiers
  const validateTiers = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (tiers.length < MIN_TIERS) {
      errors.push(`At least ${MIN_TIERS} tier is required`);
    }
    if (tiers.length > MAX_TIERS) {
      errors.push(`Maximum ${MAX_TIERS} tiers allowed`);
    }

    tiers.forEach((tier, i) => {
      if (tier.rate <= 0) {
        errors.push(`Tier ${i + 1} rate must be greater than 0`);
      }

      if (i < tiers.length - 1) {
        if (tier.max === null || tier.max === undefined || tier.max <= 0) {
          errors.push(`Tier ${i + 1} must have a max value greater than 0`);
        }

        if (i > 0 && tiers[i - 1].max !== null && tier.max !== null) {
          if (tier.max <= tiers[i - 1].max!) {
            errors.push(`Tier ${i + 1} max must be greater than Tier ${i} max`);
          }
        }
      }
    });

    if (tiers.length > 0 && tiers[tiers.length - 1].max !== null) {
      setTiers((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], max: null };
        return updated;
      });
    }

    return { valid: errors.length === 0, errors };
  };

  const validation = validateTiers();

  // Calculate preview earnings
  const calculatePreviewEarnings = (referralCount: number): { breakdown: Array<{ tier: string; count: number; rate: number; subtotal: number }>; total: number } => {
    const breakdown: Array<{ tier: string; count: number; rate: number; subtotal: number }> = [];
    let total = 0;
    let processed = 0;

    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const tierMin = i === 0 ? 1 : (tiers[i - 1].max ?? 0) + 1;
      const tierMax = tier.max ?? referralCount;

      if (referralCount < tierMin) break;

      const referralsInTier = Math.min(tierMax, referralCount) - Math.max(tierMin - 1, processed);
      if (referralsInTier > 0) {
        const subtotal = referralsInTier * tier.rate;
        breakdown.push({
          tier: `Tier ${i + 1}`,
          count: referralsInTier,
          rate: tier.rate,
          subtotal,
        });
        total += subtotal;
        processed = Math.min(tierMax, referralCount);
      }

      if (processed >= referralCount) break;
    }

    return { breakdown, total };
  };

  const getPreviewCount = (): number => {
    if (tiers.length === 0) return 10;
    const lastNonUnlimited = tiers.find((t, i) => i < tiers.length - 1 && t.max !== null);
    if (lastNonUnlimited && lastNonUnlimited.max) {
      return Math.min(lastNonUnlimited.max + 5, 100);
    }
    return 10;
  };

  const previewCount = getPreviewCount();
  const preview = calculatePreviewEarnings(previewCount);

  const getTierMin = (index: number): number => {
    if (index === 0) return 1;
    return (tiers[index - 1].max ?? 0) + 1;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Changes affect all tax preparers using company defaults
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Existing referral rates will be recalculated based on the new tier structure.
              Tax preparers with custom tiers will not be affected.
            </p>
          </div>
        </div>

        {/* Tier Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Tier Configuration</h3>
            <Badge variant="secondary">{tiers.length} / {MAX_TIERS} tiers</Badge>
          </div>

          {/* Tier Rows */}
          {tiers.map((tier, index) => {
            const isLastTier = index === tiers.length - 1;
            const tierMin = getTierMin(index);
            const colorClass = TIER_COLORS[index % TIER_COLORS.length];
            const badgeColor = TIER_BADGE_COLORS[index % TIER_BADGE_COLORS.length];

            return (
              <div
                key={index}
                className={`grid gap-4 p-4 border rounded-lg ${colorClass}`}
                style={{ gridTemplateColumns: 'auto 1fr 1fr auto' }}
              >
                <div className="flex items-center gap-2">
                  <Badge className={badgeColor}>Tier {index + 1}</Badge>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    Referrals {tierMin} to
                  </Label>
                  {isLastTier ? (
                    <div className="flex items-center h-10 px-3 rounded-md bg-muted/50 text-muted-foreground">
                      Unlimited
                    </div>
                  ) : (
                    <Input
                      type="number"
                      min={tierMin}
                      value={tier.max ?? ''}
                      onChange={(e) => handleTierChange(index, 'max', e.target.value)}
                      className="w-full"
                      placeholder="Max referrals"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    Rate per referral ($)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={tier.rate}
                    onChange={(e) => handleTierChange(index, 'rate', e.target.value)}
                    className="w-full"
                    placeholder="Rate"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTier(index)}
                    disabled={tiers.length <= MIN_TIERS || isLastTier}
                    className="text-muted-foreground hover:text-destructive"
                    title={isLastTier ? "Can't remove unlimited tier" : "Remove tier"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Add Tier Button */}
          {tiers.length < MAX_TIERS && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTier}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tier ({tiers.length}/{MAX_TIERS})
            </Button>
          )}

          {/* Validation Messages */}
          {!validation.valid && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium mb-1">Please fix the following issues:</p>
              <ul className="text-sm text-destructive list-disc list-inside">
                {validation.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Earnings Preview ({previewCount} referrals)</h4>
            {preview.breakdown.map((item, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {item.tier}: {item.count} x ${item.rate} = ${item.subtotal.toLocaleString()}
              </p>
            ))}
            <p className="text-sm font-medium mt-2">
              Total for {previewCount} referrals: ${preview.total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSaveClick}
            disabled={!hasChanges || isSaving || !validation.valid}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Company Defaults'}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Company Commission Defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the commission tier structure for all tax preparers using company defaults.
              Their referrers&apos; rates will be recalculated based on the new tiers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Update Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
