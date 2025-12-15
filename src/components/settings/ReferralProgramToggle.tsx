'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ReferralProgramToggle() {
  const [hideReferralProgram, setHideReferralProgram] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreference();
  }, []);

  const fetchPreference = async () => {
    try {
      const response = await fetch('/api/client/settings/referral-opt-out');
      if (response.ok) {
        const data = await response.json();
        setHideReferralProgram(data.hideReferralProgram);
      }
    } catch (error) {
      console.error('Failed to fetch referral preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      const response = await fetch('/api/client/settings/referral-opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hideReferralProgram: checked }),
      });

      if (response.ok) {
        setHideReferralProgram(checked);
        toast.success(
          checked
            ? 'Referral features hidden from your dashboard'
            : 'Referral features are now visible'
        );
      } else {
        toast.error('Failed to update preference');
      }
    } catch (error) {
      toast.error('Failed to update preference');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            <CardTitle>Referral Program</CardTitle>
          </div>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          <CardTitle>Referral Program</CardTitle>
        </div>
        <CardDescription>Control your participation in the referral program</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="hide-referral">Hide Referral Features</Label>
            <p className="text-sm text-muted-foreground">
              Hide Share & Earn, My Referrals, and My Earnings from your dashboard.
              You can re-enable anytime.
            </p>
          </div>
          <Switch
            id="hide-referral"
            checked={hideReferralProgram}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
}
