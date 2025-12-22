'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Star,
  MoreVertical,
  Edit,
  Trash2,
  DollarSign,
  Users,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface Referrer {
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  completedReferrals: number;
  currentTier: string;
  currentRate: number;
  vipRate: number | null;
  totalEarnings: number;
}

interface ReferrerRatesTableProps {
  referrers: Referrer[];
}

export function ReferrerRatesTable({ referrers: initialReferrers }: ReferrerRatesTableProps) {
  const [referrers, setReferrers] = useState(initialReferrers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReferrer, setSelectedReferrer] = useState<Referrer | null>(null);
  const [vipRateInput, setVipRateInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenVIPDialog = (referrer: Referrer) => {
    setSelectedReferrer(referrer);
    setVipRateInput(referrer.vipRate?.toString() || '');
    setIsDialogOpen(true);
  };

  const handleSaveVIPRate = async () => {
    if (!selectedReferrer) return;

    const rate = parseFloat(vipRateInput);
    if (isNaN(rate) || rate <= 0) {
      toast.error('Please enter a valid rate greater than 0');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/tax-preparer/commission-settings/vip-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerId: selectedReferrer.referrerId,
          vipRate: rate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save VIP rate');
      }

      // Update local state
      setReferrers((prev) =>
        prev.map((r) =>
          r.referrerId === selectedReferrer.referrerId
            ? { ...r, vipRate: rate, currentRate: rate }
            : r
        )
      );

      toast.success(`Custom rate of $${rate} set for ${selectedReferrer.referrerName}`);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving custom rate:', error);
      toast.error('Failed to save custom rate');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveVIPRate = async (referrer: Referrer) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/tax-preparer/commission-settings/vip-rate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerId: referrer.referrerId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove VIP rate');
      }

      // Update local state - recalculate effective rate based on tier
      setReferrers((prev) =>
        prev.map((r) =>
          r.referrerId === referrer.referrerId
            ? { ...r, vipRate: null }
            : r
        )
      );

      toast.success(`Custom rate removed for ${referrer.referrerName}`);
    } catch (error) {
      console.error('Error removing custom rate:', error);
      toast.error('Failed to remove custom rate');
    } finally {
      setIsSaving(false);
    }
  };

  const getTierBadgeColor = (tier: string) => {
    if (tier.includes('1')) return 'bg-amber-100 text-amber-800';
    if (tier.includes('2')) return 'bg-slate-100 text-slate-800';
    if (tier.includes('3')) return 'bg-yellow-100 text-yellow-800';
    if (tier.includes('4')) return 'bg-emerald-100 text-emerald-800';
    if (tier.includes('5')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Users className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{referrers.length}</p>
            <p className="text-xs text-muted-foreground">Total Referrers</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Star className="w-8 h-8 text-yellow-500" />
          <div>
            <p className="text-2xl font-bold">
              {referrers.filter((r) => r.vipRate !== null).length}
            </p>
            <p className="text-xs text-muted-foreground">With Custom Rates</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <TrendingUp className="w-8 h-8 text-green-600" />
          <div>
            <p className="text-2xl font-bold">
              {referrers.reduce((sum, r) => sum + r.completedReferrals, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </div>
        </div>
      </div>

      {/* Referrers Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referrer</TableHead>
              <TableHead className="text-center">Referrals</TableHead>
              <TableHead className="text-center">Current Tier</TableHead>
              <TableHead className="text-right">Effective Rate</TableHead>
              <TableHead className="text-right">Total Earned</TableHead>
              <TableHead className="text-center">Set Rate</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrers.map((referrer) => (
              <TableRow key={referrer.referrerId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {referrer.referrerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {referrer.referrerName}
                        {referrer.vipRate !== null && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{referrer.referrerEmail}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-medium">{referrer.completedReferrals}</span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={getTierBadgeColor(referrer.currentTier)}>
                    {referrer.currentTier}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {referrer.vipRate !== null ? (
                        <span className="text-yellow-600">{referrer.vipRate}</span>
                      ) : (
                        referrer.currentRate
                      )}
                    </span>
                    {referrer.vipRate !== null && (
                      <Badge variant="outline" className="ml-1 text-xs bg-yellow-50 text-yellow-700">
                        Custom
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium text-green-600">
                    ${referrer.totalEarnings.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant={referrer.vipRate !== null ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleOpenVIPDialog(referrer)}
                    className={referrer.vipRate !== null ? "border-yellow-500 text-yellow-700 hover:bg-yellow-50" : ""}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    {referrer.vipRate !== null ? 'Edit' : 'Set Rate'}
                  </Button>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenVIPDialog(referrer)}>
                        <Edit className="w-4 h-4 mr-2" />
                        {referrer.vipRate !== null ? 'Edit Custom Rate' : 'Set Custom Rate'}
                      </DropdownMenuItem>
                      {referrer.vipRate !== null && (
                        <DropdownMenuItem
                          onClick={() => handleRemoveVIPRate(referrer)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Custom Rate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* VIP Rate Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedReferrer?.vipRate !== null ? 'Edit' : 'Set'} Custom Rate
            </DialogTitle>
            <DialogDescription>
              Set a custom commission rate for{' '}
              <strong>{selectedReferrer?.referrerName}</strong>. This rate overrides tier-based
              calculations.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label htmlFor="vip-rate" className="text-sm font-medium">
                Custom Rate ($ per referral)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="vip-rate"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g., 75"
                  value={vipRateInput}
                  onChange={(e) => setVipRateInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Current tier rate: ${selectedReferrer?.currentRate || 0}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVIPRate} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Custom Rate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
