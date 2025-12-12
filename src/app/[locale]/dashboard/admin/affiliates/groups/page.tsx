'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Users,
  DollarSign,
  Edit,
  Trash2,
  Layers,
  ArrowLeft,
  TrendingUp,
  Percent,
} from 'lucide-react';
import Link from 'next/link';

interface TierConfig {
  minConversions: number;
  rate: number;
}

interface AffiliateGroup {
  id: string;
  name: string;
  description: string | null;
  commissionType: 'PERCENTAGE' | 'FLAT' | 'TIERED';
  commissionRate: number | null;
  flatAmount: number | null;
  tieredRates: TierConfig[] | null;
  isActive: boolean;
  minimumPayout: number;
  payoutFrequency: string;
  totalAffiliates: number;
  totalEarnings: number;
  totalConversions: number;
  _count?: {
    affiliates: number;
  };
}

export default function AffiliateGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<AffiliateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AffiliateGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    commissionType: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT' | 'TIERED',
    commissionRate: 10,
    flatAmount: 50,
    tieredRates: [
      { minConversions: 0, rate: 5 },
      { minConversions: 5, rate: 10 },
      { minConversions: 15, rate: 15 },
    ] as TierConfig[],
    minimumPayout: 50,
    payoutFrequency: 'MONTHLY',
    isActive: true,
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/admin/affiliate-groups');
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const body: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || undefined,
        commissionType: formData.commissionType,
        minimumPayout: formData.minimumPayout,
        payoutFrequency: formData.payoutFrequency,
        isActive: formData.isActive,
      };

      if (formData.commissionType === 'PERCENTAGE') {
        body.commissionRate = formData.commissionRate;
      } else if (formData.commissionType === 'FLAT') {
        body.flatAmount = formData.flatAmount;
      } else if (formData.commissionType === 'TIERED') {
        body.tieredRates = formData.tieredRates;
      }

      const res = await fetch('/api/admin/affiliate-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsCreateDialogOpen(false);
        resetForm();
        fetchGroups();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group');
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    try {
      const body: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || undefined,
        commissionType: formData.commissionType,
        minimumPayout: formData.minimumPayout,
        payoutFrequency: formData.payoutFrequency,
        isActive: formData.isActive,
      };

      if (formData.commissionType === 'PERCENTAGE') {
        body.commissionRate = formData.commissionRate;
      } else if (formData.commissionType === 'FLAT') {
        body.flatAmount = formData.flatAmount;
      } else if (formData.commissionType === 'TIERED') {
        body.tieredRates = formData.tieredRates;
      }

      const res = await fetch(`/api/admin/affiliate-groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setEditingGroup(null);
        resetForm();
        fetchGroups();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update group');
      }
    } catch (error) {
      console.error('Failed to update group:', error);
      alert('Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/admin/affiliate-groups/${groupId}?force=true`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchGroups();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      commissionType: 'PERCENTAGE',
      commissionRate: 10,
      flatAmount: 50,
      tieredRates: [
        { minConversions: 0, rate: 5 },
        { minConversions: 5, rate: 10 },
        { minConversions: 15, rate: 15 },
      ],
      minimumPayout: 50,
      payoutFrequency: 'MONTHLY',
      isActive: true,
    });
  };

  const startEditing = (group: AffiliateGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      commissionType: group.commissionType,
      commissionRate: group.commissionRate || 10,
      flatAmount: group.flatAmount || 50,
      tieredRates: (group.tieredRates as TierConfig[]) || [
        { minConversions: 0, rate: 5 },
        { minConversions: 5, rate: 10 },
        { minConversions: 15, rate: 15 },
      ],
      minimumPayout: group.minimumPayout,
      payoutFrequency: group.payoutFrequency,
      isActive: group.isActive,
    });
  };

  const addTier = () => {
    const lastTier = formData.tieredRates[formData.tieredRates.length - 1];
    setFormData({
      ...formData,
      tieredRates: [
        ...formData.tieredRates,
        { minConversions: lastTier.minConversions + 10, rate: lastTier.rate + 5 },
      ],
    });
  };

  const removeTier = (index: number) => {
    if (formData.tieredRates.length > 1) {
      setFormData({
        ...formData,
        tieredRates: formData.tieredRates.filter((_, i) => i !== index),
      });
    }
  };

  const updateTier = (index: number, field: 'minConversions' | 'rate', value: number) => {
    const newTiers = [...formData.tieredRates];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setFormData({ ...formData, tieredRates: newTiers });
  };

  const GroupForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Group Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Gold Partners"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe this affiliate group..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="commissionType">Commission Type</Label>
        <Select
          value={formData.commissionType}
          onValueChange={(value: 'PERCENTAGE' | 'FLAT' | 'TIERED') =>
            setFormData({ ...formData, commissionType: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PERCENTAGE">Percentage</SelectItem>
            <SelectItem value="FLAT">Flat Rate</SelectItem>
            <SelectItem value="TIERED">Tiered (Performance-Based)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.commissionType === 'PERCENTAGE' && (
        <div className="space-y-2">
          <Label htmlFor="commissionRate">Commission Rate (%)</Label>
          <Input
            id="commissionRate"
            type="number"
            min="0"
            max="100"
            value={formData.commissionRate}
            onChange={(e) =>
              setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })
            }
          />
        </div>
      )}

      {formData.commissionType === 'FLAT' && (
        <div className="space-y-2">
          <Label htmlFor="flatAmount">Flat Amount ($)</Label>
          <Input
            id="flatAmount"
            type="number"
            min="0"
            value={formData.flatAmount}
            onChange={(e) => setFormData({ ...formData, flatAmount: parseFloat(e.target.value) })}
          />
        </div>
      )}

      {formData.commissionType === 'TIERED' && (
        <div className="space-y-4">
          <Label>Tiered Rates</Label>
          <div className="space-y-2">
            {formData.tieredRates.map((tier, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0"
                    value={tier.minConversions}
                    onChange={(e) =>
                      updateTier(index, 'minConversions', parseInt(e.target.value))
                    }
                    placeholder="Min conversions"
                  />
                </div>
                <span className="text-muted-foreground">conversions →</span>
                <div className="w-24">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={tier.rate}
                    onChange={(e) => updateTier(index, 'rate', parseFloat(e.target.value))}
                    placeholder="Rate %"
                  />
                </div>
                <span className="text-muted-foreground">%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTier(index)}
                  disabled={formData.tieredRates.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addTier}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tier
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minimumPayout">Minimum Payout ($)</Label>
          <Input
            id="minimumPayout"
            type="number"
            min="0"
            value={formData.minimumPayout}
            onChange={(e) =>
              setFormData({ ...formData, minimumPayout: parseFloat(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payoutFrequency">Payout Frequency</Label>
          <Select
            value={formData.payoutFrequency}
            onValueChange={(value) => setFormData({ ...formData, payoutFrequency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="BIWEEKLY">Bi-Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/admin/affiliates">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2">Affiliate Groups</h1>
              <p className="text-muted-foreground">
                Organize affiliates and configure commission structures
              </p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Affiliate Group</DialogTitle>
                <DialogDescription>
                  Set up a new affiliate group with custom commission rates
                </DialogDescription>
              </DialogHeader>
              <GroupForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup}>Create Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading groups...</div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first affiliate group to organize affiliates
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card key={group.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-600" />
                        {group.name}
                      </CardTitle>
                      {group.description && (
                        <CardDescription className="mt-1">{group.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={group.isActive ? 'default' : 'secondary'}>
                      {group.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Commission Info */}
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {group.commissionType === 'PERCENTAGE' && (
                          <Percent className="w-4 h-4 text-green-600" />
                        )}
                        {group.commissionType === 'FLAT' && (
                          <DollarSign className="w-4 h-4 text-blue-600" />
                        )}
                        {group.commissionType === 'TIERED' && (
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                        )}
                        <span className="font-medium">
                          {group.commissionType === 'PERCENTAGE' && `${group.commissionRate}%`}
                          {group.commissionType === 'FLAT' && `$${group.flatAmount}`}
                          {group.commissionType === 'TIERED' && 'Tiered Rates'}
                        </span>
                      </div>
                      {group.commissionType === 'TIERED' && group.tieredRates && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          {(group.tieredRates as TierConfig[]).map((tier, i) => (
                            <div key={i}>
                              {tier.minConversions}+ conversions → {tier.rate}%
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="font-bold">{group._count?.affiliates || 0}</div>
                        <div className="text-xs text-muted-foreground">Affiliates</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="font-bold">{group.totalConversions}</div>
                        <div className="text-xs text-muted-foreground">Conversions</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="font-bold">${group.totalEarnings}</div>
                        <div className="text-xs text-muted-foreground">Earnings</div>
                      </div>
                    </div>

                    {/* Payout Info */}
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Min payout: ${group.minimumPayout}</span>
                      <span>{group.payoutFrequency}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Dialog
                        open={editingGroup?.id === group.id}
                        onOpenChange={(open) => !open && setEditingGroup(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => startEditing(group)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Affiliate Group</DialogTitle>
                            <DialogDescription>
                              Update group settings and commission rates
                            </DialogDescription>
                          </DialogHeader>
                          <GroupForm isEdit />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingGroup(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleUpdateGroup}>Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove all affiliates from this group. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteGroup(group.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
