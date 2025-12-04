'use client';

/**
 * Admin Booking Settings Management
 *
 * Allows admins to configure booking preferences for all tax preparers:
 * - Enable/disable booking per preparer
 * - Toggle phone/video/in-person booking methods
 * - Set manual approval requirements
 * - Custom booking messages
 * - Bulk update capabilities
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Settings,
  Phone,
  Video,
  MapPin,
  Check,
  X,
  Edit,
  Loader2,
  Save,
  AlertCircle,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface Preparer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyName?: string;
  bookingEnabled: boolean;
  allowPhoneBookings: boolean;
  allowVideoBookings: boolean;
  allowInPersonBookings: boolean;
  requireApprovalForBookings: boolean;
  customBookingMessage?: string;
  bookingCalendarColor?: string;
}

interface BookingPreferences {
  bookingEnabled: boolean;
  allowPhoneBookings: boolean;
  allowVideoBookings: boolean;
  allowInPersonBookings: boolean;
  requireApprovalForBookings: boolean;
  customBookingMessage: string;
  bookingCalendarColor: string;
}

export function BookingSettingsClient() {
  const [preparers, setPreparers] = useState<Preparer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingPreparer, setEditingPreparer] = useState<Preparer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<BookingPreferences>({
    bookingEnabled: true,
    allowPhoneBookings: true,
    allowVideoBookings: true,
    allowInPersonBookings: true,
    requireApprovalForBookings: false,
    customBookingMessage: '',
    bookingCalendarColor: '#3B82F6',
  });

  useEffect(() => {
    fetchPreparers();
  }, []);

  const fetchPreparers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/preparers?includeBookingSettings=true');
      if (!response.ok) throw new Error('Failed to fetch preparers');

      const data = await response.json();
      setPreparers(data.preparers || []);
      setLoading(false);
    } catch (error) {
      logger.error('[BookingSettings] Error fetching preparers:', error);
      setLoading(false);
    }
  };

  const handleQuickToggle = async (preparerId: string, field: keyof BookingPreferences) => {
    try {
      setSaving(preparerId);

      const preparer = preparers.find((p) => p.id === preparerId);
      if (!preparer) return;

      const response = await fetch(`/api/preparers/${preparerId}/booking-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: !preparer[field],
        }),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      // Update local state
      setPreparers((prev) =>
        prev.map((p) =>
          p.id === preparerId
            ? {
                ...p,
                [field]: !p[field],
              }
            : p
        )
      );

      logger.info('[BookingSettings] Updated preparer preferences', { preparerId, field });
    } catch (error) {
      logger.error('[BookingSettings] Error updating preferences:', error);
      alert('Failed to update preferences');
    } finally {
      setSaving(null);
    }
  };

  const openEditDialog = (preparer: Preparer) => {
    setEditingPreparer(preparer);
    setFormData({
      bookingEnabled: preparer.bookingEnabled,
      allowPhoneBookings: preparer.allowPhoneBookings,
      allowVideoBookings: preparer.allowVideoBookings,
      allowInPersonBookings: preparer.allowInPersonBookings,
      requireApprovalForBookings: preparer.requireApprovalForBookings,
      customBookingMessage: preparer.customBookingMessage || '',
      bookingCalendarColor: preparer.bookingCalendarColor || '#3B82F6',
    });
    setDialogOpen(true);
  };

  const handleSavePreferences = async () => {
    if (!editingPreparer) return;

    try {
      setSaving(editingPreparer.id);

      const response = await fetch(`/api/preparers/${editingPreparer.id}/booking-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      // Update local state
      setPreparers((prev) =>
        prev.map((p) =>
          p.id === editingPreparer.id
            ? {
                ...p,
                ...formData,
              }
            : p
        )
      );

      setDialogOpen(false);
      setEditingPreparer(null);

      logger.info('[BookingSettings] Saved preparer preferences', {
        preparerId: editingPreparer.id,
      });
    } catch (error) {
      logger.error('[BookingSettings] Error saving preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Booking Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage booking preferences for all tax preparers
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Preparers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preparers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Booking Enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {preparers.filter((p) => p.bookingEnabled).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Manual Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {preparers.filter((p) => p.requireApprovalForBookings).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Booking Disabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {preparers.filter((p) => !p.bookingEnabled).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preparers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Preparer Booking Preferences</CardTitle>
          <CardDescription>
            Click the toggles to quickly enable/disable booking methods, or click Edit for advanced
            settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preparer</TableHead>
                  <TableHead className="text-center">Booking Enabled</TableHead>
                  <TableHead className="text-center">
                    <Phone className="w-4 h-4 mx-auto" />
                    Phone
                  </TableHead>
                  <TableHead className="text-center">
                    <Video className="w-4 h-4 mx-auto" />
                    Video
                  </TableHead>
                  <TableHead className="text-center">
                    <MapPin className="w-4 h-4 mx-auto" />
                    In-Person
                  </TableHead>
                  <TableHead className="text-center">Manual Approval</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preparers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No tax preparers found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  preparers.map((preparer) => (
                    <TableRow key={preparer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {preparer.firstName} {preparer.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{preparer.email}</p>
                          {preparer.companyName && (
                            <p className="text-xs text-muted-foreground">{preparer.companyName}</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Switch
                          checked={preparer.bookingEnabled}
                          onCheckedChange={() => handleQuickToggle(preparer.id, 'bookingEnabled')}
                          disabled={saving === preparer.id}
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <Switch
                          checked={preparer.allowPhoneBookings}
                          onCheckedChange={() =>
                            handleQuickToggle(preparer.id, 'allowPhoneBookings')
                          }
                          disabled={saving === preparer.id || !preparer.bookingEnabled}
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <Switch
                          checked={preparer.allowVideoBookings}
                          onCheckedChange={() =>
                            handleQuickToggle(preparer.id, 'allowVideoBookings')
                          }
                          disabled={saving === preparer.id || !preparer.bookingEnabled}
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <Switch
                          checked={preparer.allowInPersonBookings}
                          onCheckedChange={() =>
                            handleQuickToggle(preparer.id, 'allowInPersonBookings')
                          }
                          disabled={saving === preparer.id || !preparer.bookingEnabled}
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant={preparer.requireApprovalForBookings ? 'default' : 'outline'}
                          className={cn(
                            preparer.requireApprovalForBookings
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : ''
                          )}
                        >
                          {preparer.requireApprovalForBookings ? 'Required' : 'Auto'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(preparer)}
                          disabled={saving === preparer.id}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit Booking Preferences:{' '}
              {editingPreparer && `${editingPreparer.firstName} ${editingPreparer.lastName}`}
            </DialogTitle>
            <DialogDescription>
              Configure detailed booking settings for this tax preparer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label className="text-base font-semibold">Enable Booking</Label>
                <p className="text-sm text-muted-foreground">
                  Master toggle for all booking functionality
                </p>
              </div>
              <Switch
                checked={formData.bookingEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, bookingEnabled: checked }))
                }
              />
            </div>

            {/* Booking Methods */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Allowed Booking Methods</Label>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Phone Call Appointments</p>
                      <p className="text-sm text-muted-foreground">
                        Traditional phone consultations
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.allowPhoneBookings}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, allowPhoneBookings: checked }))
                    }
                    disabled={!formData.bookingEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Video Call Appointments</p>
                      <p className="text-sm text-muted-foreground">
                        Virtual meetings via Zoom/Meet
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.allowVideoBookings}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, allowVideoBookings: checked }))
                    }
                    disabled={!formData.bookingEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">In-Person Appointments</p>
                      <p className="text-sm text-muted-foreground">Face-to-face at office</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.allowInPersonBookings}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, allowInPersonBookings: checked }))
                    }
                    disabled={!formData.bookingEnabled}
                  />
                </div>
              </div>
            </div>

            {/* Approval Requirement */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label className="text-base font-semibold">Require Manual Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Review and approve each booking before confirming with client
                </p>
              </div>
              <Switch
                checked={formData.requireApprovalForBookings}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, requireApprovalForBookings: checked }))
                }
                disabled={!formData.bookingEnabled}
              />
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Booking Message (Optional)</Label>
              <Textarea
                id="customMessage"
                value={formData.customBookingMessage}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, customBookingMessage: e.target.value }))
                }
                placeholder="e.g., 'I specialize in business tax returns and am available Mon-Fri 9am-5pm'"
                rows={3}
                disabled={!formData.bookingEnabled}
              />
            </div>

            {/* Calendar Color */}
            <div className="space-y-2">
              <Label htmlFor="calendarColor">Calendar Display Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="calendarColor"
                  type="color"
                  value={formData.bookingCalendarColor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bookingCalendarColor: e.target.value }))
                  }
                  className="w-20 h-10"
                  disabled={!formData.bookingEnabled}
                />
                <Input
                  type="text"
                  value={formData.bookingCalendarColor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bookingCalendarColor: e.target.value }))
                  }
                  placeholder="#3B82F6"
                  className="flex-1"
                  disabled={!formData.bookingEnabled}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingPreparer(null);
              }}
              disabled={saving !== null}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePreferences} disabled={saving !== null}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
