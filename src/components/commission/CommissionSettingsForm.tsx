'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';

interface TierStructure {
  tier1: { max: number; rate: number };
  tier2: { max: number; rate: number };
  tier3: { rate: number };
}

interface CommissionSettingsFormProps {
  initialSettings: {
    useCompanyDefaults: boolean;
    customTierStructure: TierStructure | null;
  };
  companyDefaultTiers: TierStructure;
}

export function CommissionSettingsForm({
  initialSettings,
  companyDefaultTiers,
}: CommissionSettingsFormProps) {
  const [useCompanyDefaults, setUseCompanyDefaults] = useState(
    initialSettings.useCompanyDefaults
  );
  const [customTiers, setCustomTiers] = useState<TierStructure>(
    initialSettings.customTierStructure || {
      tier1: { max: 5, rate: 50 },
      tier2: { max: 10, rate: 75 },
      tier3: { rate: 100 },
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggleDefaults = (checked: boolean) => {
    setUseCompanyDefaults(checked);
    setHasChanges(true);
  };

  const handleTierChange = (
    tier: 'tier1' | 'tier2' | 'tier3',
    field: 'max' | 'rate',
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setCustomTiers((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: numValue,
      },
    }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setUseCompanyDefaults(initialSettings.useCompanyDefaults);
    setCustomTiers(
      initialSettings.customTierStructure || {
        tier1: { max: 5, rate: 50 },
        tier2: { max: 10, rate: 75 },
        tier3: { rate: 100 },
      }
    );
    setHasChanges(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/tax-preparer/commission-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useCompanyDefaults,
          customTierStructure: useCompanyDefaults ? null : customTiers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast.success('Commission settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Validate tiers
  const tier1Valid = customTiers.tier1.max > 0 && customTiers.tier1.rate > 0;
  const tier2Valid =
    customTiers.tier2.max > customTiers.tier1.max && customTiers.tier2.rate > 0;
  const tier3Valid = customTiers.tier3.rate > 0;
  const allTiersValid = tier1Valid && tier2Valid && tier3Valid;

  return (
    <div className="space-y-6">
      {/* Toggle for Company Defaults */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
        <div className="space-y-0.5">
          <Label className="text-base font-medium">Use Company Default Rates</Label>
          <p className="text-sm text-muted-foreground">
            When enabled, referrers earn commissions based on Tax Genius standard tiers
          </p>
        </div>
        <Switch
          checked={useCompanyDefaults}
          onCheckedChange={handleToggleDefaults}
        />
      </div>

      {/* Custom Tier Configuration */}
      {!useCompanyDefaults && (
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Custom Tier Configuration</h3>
            <Badge variant="outline">Custom rates active</Badge>
          </div>

          {/* Tier 1 */}
          <div className="grid sm:grid-cols-3 gap-4 p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-100 text-amber-800">Tier 1</Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier1-max" className="text-sm">
                Referrals 1 to
              </Label>
              <Input
                id="tier1-max"
                type="number"
                min="1"
                value={customTiers.tier1.max}
                onChange={(e) => handleTierChange('tier1', 'max', e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier1-rate" className="text-sm">
                Rate per referral ($)
              </Label>
              <Input
                id="tier1-rate"
                type="number"
                min="1"
                value={customTiers.tier1.rate}
                onChange={(e) => handleTierChange('tier1', 'rate', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Tier 2 */}
          <div className="grid sm:grid-cols-3 gap-4 p-4 border rounded-lg bg-slate-50/50 dark:bg-slate-950/20">
            <div className="flex items-center gap-2">
              <Badge className="bg-slate-100 text-slate-800">Tier 2</Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier2-max" className="text-sm">
                Referrals {customTiers.tier1.max + 1} to
              </Label>
              <Input
                id="tier2-max"
                type="number"
                min={customTiers.tier1.max + 1}
                value={customTiers.tier2.max}
                onChange={(e) => handleTierChange('tier2', 'max', e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier2-rate" className="text-sm">
                Rate per referral ($)
              </Label>
              <Input
                id="tier2-rate"
                type="number"
                min="1"
                value={customTiers.tier2.rate}
                onChange={(e) => handleTierChange('tier2', 'rate', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Tier 3 */}
          <div className="grid sm:grid-cols-3 gap-4 p-4 border rounded-lg bg-yellow-50/50 dark:bg-yellow-950/20">
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800">Tier 3</Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Referrals {customTiers.tier2.max + 1}+</Label>
              <p className="text-xs text-muted-foreground">Unlimited referrals</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier3-rate" className="text-sm">
                Rate per referral ($)
              </Label>
              <Input
                id="tier3-rate"
                type="number"
                min="1"
                value={customTiers.tier3.rate}
                onChange={(e) => handleTierChange('tier3', 'rate', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Validation Messages */}
          {!allTiersValid && (
            <p className="text-sm text-destructive">
              Please ensure all tier rates are greater than 0 and tier thresholds are in ascending order.
            </p>
          )}

          {/* Preview */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Earnings Preview (10 referrals)</h4>
            <p className="text-sm text-muted-foreground">
              Tier 1: {customTiers.tier1.max} × ${customTiers.tier1.rate} = $
              {customTiers.tier1.max * customTiers.tier1.rate}
            </p>
            <p className="text-sm text-muted-foreground">
              Tier 2: {Math.min(10 - customTiers.tier1.max, customTiers.tier2.max - customTiers.tier1.max)} × $
              {customTiers.tier2.rate} = $
              {Math.min(10 - customTiers.tier1.max, customTiers.tier2.max - customTiers.tier1.max) *
                customTiers.tier2.rate}
            </p>
            <p className="text-sm font-medium mt-2">
              Total for 10 referrals: $
              {customTiers.tier1.max * customTiers.tier1.rate +
                Math.min(10 - customTiers.tier1.max, customTiers.tier2.max - customTiers.tier1.max) *
                  customTiers.tier2.rate}
            </p>
          </div>
        </div>
      )}

      {/* Company Defaults Preview (when using defaults) */}
      {useCompanyDefaults && (
        <div className="p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-800 dark:text-green-200">
              Using Tax Genius Company Defaults
            </span>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300">
            Referrers will earn: ${companyDefaultTiers.tier1.rate} (referrals 1-
            {companyDefaultTiers.tier1.max}), ${companyDefaultTiers.tier2.rate} (referrals{' '}
            {companyDefaultTiers.tier1.max + 1}-{companyDefaultTiers.tier2.max}), $
            {companyDefaultTiers.tier3.rate} (referrals {companyDefaultTiers.tier2.max + 1}+)
          </p>
        </div>
      )}

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
          onClick={handleSave}
          disabled={!hasChanges || isSaving || (!useCompanyDefaults && !allTiersValid)}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
