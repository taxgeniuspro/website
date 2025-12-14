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
  id: string;
  name: string;
  email: string;
  type: 'client' | 'affiliate';
  completedReferrals: number;
  totalEarnings: number;
  vipRate: number | null;
  currentTier: string;
  effectiveRate: number;
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
          referrerId: selectedReferrer.id,
          vipRate: rate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save VIP rate');
      }

      // Update local state
      setReferrers((prev) =>
        prev.map((r) =>
          r.id === selectedReferrer.id
            ? { ...r, vipRate: rate, effectiveRate: rate }
            : r
        )
      );

      toast.success(`VIP rate of $${rate} set for ${selectedReferrer.name}`);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving VIP rate:', error);
      toast.error('Failed to save VIP rate');
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
          referrerId: referrer.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove VIP rate');
      }

      // Update local state - recalculate effective rate based on tier
      setReferrers((prev) =>
        prev.map((r) =>
          r.id === referrer.id
            ? { ...r, vipRate: null }
            : r
        )
      );

      toast.success(`VIP rate removed for ${referrer.name}`);
    } catch (error) {
      console.error('Error removing VIP rate:', error);
      toast.error('Failed to remove VIP rate');
    } finally {
      setIsSaving(false);
    }
  };

  const getReferrerTypeColor = (type: string) => {
    return type === 'affiliate'
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'Tier 1':
        return 'bg-amber-100 text-amber-800';
      case 'Tier 2':
        return 'bg-slate-100 text-slate-800';
      case 'Tier 3':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
            <p className="text-xs text-muted-foreground">With VIP Rates</p>
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
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Referrals</TableHead>
              <TableHead className="text-center">Current Tier</TableHead>
              <TableHead className="text-right">Effective Rate</TableHead>
              <TableHead className="text-right">Total Earned</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrers.map((referrer) => (
              <TableRow key={referrer.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {referrer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {referrer.name}
                        {referrer.vipRate !== null && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{referrer.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getReferrerTypeColor(referrer.type)}>
                    {referrer.type === 'affiliate' ? 'Affiliate' : 'Client'}
                  </Badge>
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
                        referrer.effectiveRate
                      )}
                    </span>
                    {referrer.vipRate !== null && (
                      <Badge variant="outline" className="ml-1 text-xs bg-yellow-50 text-yellow-700">
                        VIP
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium text-green-600">
                    ${referrer.totalEarnings.toFixed(2)}
                  </span>
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
                        {referrer.vipRate !== null ? 'Edit VIP Rate' : 'Set VIP Rate'}
                      </DropdownMenuItem>
                      {referrer.vipRate !== null && (
                        <DropdownMenuItem
                          onClick={() => handleRemoveVIPRate(referrer)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove VIP Rate
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
              {selectedReferrer?.vipRate !== null ? 'Edit' : 'Set'} VIP Rate
            </DialogTitle>
            <DialogDescription>
              Set a custom VIP commission rate for{' '}
              <strong>{selectedReferrer?.name}</strong>. This rate overrides tier-based
              calculations.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label htmlFor="vip-rate" className="text-sm font-medium">
                VIP Rate ($ per referral)
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
                Current tier rate: ${selectedReferrer?.effectiveRate || 0}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVIPRate} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save VIP Rate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
