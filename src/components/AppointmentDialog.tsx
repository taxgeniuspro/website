'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  appointment?: any; // Existing appointment for edit mode
  mode: 'create' | 'edit' | 'schedule'; // schedule mode is for scheduling requested appointments
  defaultValues?: Partial<{
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientNotes: string;
  }>;
}

export default function AppointmentDialog({
  open,
  onOpenChange,
  onSuccess,
  appointment,
  mode,
  defaultValues,
}: AppointmentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    type: 'CONSULTATION',
    scheduledFor: '',
    duration: '60',
    subject: '',
    notes: '',
    location: '',
    meetingLink: '',
  });

  // Initialize form with appointment data or defaults
  useEffect(() => {
    if (appointment) {
      setFormData({
        clientName: appointment.clientName || '',
        clientEmail: appointment.clientEmail || '',
        clientPhone: appointment.clientPhone || '',
        type: appointment.type || 'CONSULTATION',
        scheduledFor: appointment.scheduledFor
          ? new Date(appointment.scheduledFor).toISOString().slice(0, 16)
          : '',
        duration: appointment.duration?.toString() || '60',
        subject: appointment.subject || '',
        notes: appointment.notes || '',
        location: appointment.location || '',
        meetingLink: appointment.meetingLink || '',
      });
    } else if (defaultValues) {
      setFormData((prev) => ({
        ...prev,
        ...defaultValues,
      }));
    }
  }, [appointment, defaultValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;

      if (mode === 'edit' && appointment) {
        // Update existing appointment
        response = await fetch(`/api/appointments/${appointment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: formData.subject,
            type: formData.type,
            scheduledFor: formData.scheduledFor || null,
            duration: parseInt(formData.duration),
            notes: formData.notes,
            location: formData.location,
            meetingLink: formData.meetingLink,
          }),
        });
      } else if (mode === 'schedule' && appointment) {
        // Schedule a requested appointment
        response = await fetch(`/api/appointments/${appointment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledFor: formData.scheduledFor,
            duration: parseInt(formData.duration),
            type: formData.type,
            subject: formData.subject,
            notes: formData.notes,
            location: formData.location,
            meetingLink: formData.meetingLink,
            status: 'SCHEDULED',
          }),
        });
      } else {
        // Create new appointment
        response = await fetch('/api/admin/appointments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: formData.clientName,
            clientEmail: formData.clientEmail,
            clientPhone: formData.clientPhone,
            type: formData.type,
            scheduledFor: formData.scheduledFor || null,
            duration: parseInt(formData.duration),
            subject: formData.subject,
            notes: formData.notes,
            location: formData.location,
            meetingLink: formData.meetingLink,
          }),
        });
      }

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description:
            mode === 'create'
              ? 'Appointment created successfully'
              : mode === 'schedule'
              ? 'Appointment scheduled successfully'
              : 'Appointment updated successfully',
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save appointment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error saving appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to save appointment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDialogTitle = () => {
    if (mode === 'create') return 'Create New Appointment';
    if (mode === 'schedule') return 'Schedule Appointment';
    return 'Edit Appointment';
  };

  const getDialogDescription = () => {
    if (mode === 'create') return 'Create a new appointment for a client';
    if (mode === 'schedule')
      return 'Set a date and time for this appointment request';
    return 'Update appointment details';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Information - only editable in create mode */}
          {mode === 'create' && (
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-sm">Client Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) =>
                      setFormData({ ...formData, clientName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Phone *</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, clientPhone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, clientEmail: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          )}

          {/* Appointment Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Appointment Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSULTATION">Consultation</SelectItem>
                    <SelectItem value="PHONE_CALL">Phone Call</SelectItem>
                    <SelectItem value="VIDEO_CALL">Video Call</SelectItem>
                    <SelectItem value="IN_PERSON">In Person</SelectItem>
                    <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledFor">
                Date & Time{mode === 'schedule' ? ' *' : ''}
              </Label>
              <Input
                id="scheduledFor"
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledFor: e.target.value })
                }
                required={mode === 'schedule'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="e.g., Initial Tax Consultation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Internal notes about the appointment"
                rows={3}
              />
            </div>

            {/* Meeting details based on type */}
            {formData.type === 'IN_PERSON' && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Office address or meeting location"
                />
              </div>
            )}

            {formData.type === 'VIDEO_CALL' && (
              <div className="space-y-2">
                <Label htmlFor="meetingLink">Meeting Link (Zoom or Google Meet)</Label>
                <Input
                  id="meetingLink"
                  type="url"
                  value={formData.meetingLink}
                  onChange={(e) =>
                    setFormData({ ...formData, meetingLink: e.target.value })
                  }
                  placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                />
                <p className="text-xs text-muted-foreground">
                  Enter your Zoom meeting link or Google Meet link
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create'
                ? 'Create Appointment'
                : mode === 'schedule'
                ? 'Schedule'
                : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
