'use client';

/**
 * Availability Settings Component
 *
 * Allows tax preparers to configure their work hours, booking preferences,
 * and time off periods.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Clock,
  Calendar,
  Phone,
  Video,
  MapPin,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Globe,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface TimeOffPeriod {
  id?: string;
  label: string;
  startDate: string;
  endDate: string;
}

interface AvailabilityData {
  weeklySchedule: Record<number, DaySchedule>;
  bookingPreferences: {
    bookingEnabled: boolean;
    allowPhoneBookings: boolean;
    allowVideoBookings: boolean;
    allowInPersonBookings: boolean;
    requireApprovalForBookings: boolean;
    customBookingMessage: string;
  };
  timeOff: TimeOffPeriod[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00',
];

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// US Timezone options
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)', abbr: 'EST/EDT' },
  { value: 'America/Chicago', label: 'Central Time (CT)', abbr: 'CST/CDT' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', abbr: 'MST/MDT' },
  { value: 'America/Phoenix', label: 'Arizona Time (AZ)', abbr: 'MST' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', abbr: 'PST/PDT' },
  { value: 'America/Anchorage', label: 'Alaska Time (AK)', abbr: 'AKST/AKDT' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HI)', abbr: 'HST' },
];

const DEFAULT_SCHEDULE: Record<number, DaySchedule> = {
  0: { enabled: false, startTime: '09:00', endTime: '17:00' }, // Sunday
  1: { enabled: true, startTime: '09:00', endTime: '17:00' },  // Monday
  2: { enabled: true, startTime: '09:00', endTime: '17:00' },  // Tuesday
  3: { enabled: true, startTime: '09:00', endTime: '17:00' },  // Wednesday
  4: { enabled: true, startTime: '09:00', endTime: '17:00' },  // Thursday
  5: { enabled: true, startTime: '09:00', endTime: '17:00' },  // Friday
  6: { enabled: false, startTime: '09:00', endTime: '17:00' }, // Saturday
};

interface AvailabilitySettingsProps {
  profileId: string;
}

export function AvailabilitySettings({ profileId }: AvailabilitySettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weeklySchedule, setWeeklySchedule] = useState<Record<number, DaySchedule>>(DEFAULT_SCHEDULE);
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [allowPhoneBookings, setAllowPhoneBookings] = useState(true);
  const [allowVideoBookings, setAllowVideoBookings] = useState(true);
  const [allowInPersonBookings, setAllowInPersonBookings] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [appointmentBufferMinutes, setAppointmentBufferMinutes] = useState(15);
  const [defaultAppointmentDuration, setDefaultAppointmentDuration] = useState(30);
  const [timezone, setTimezone] = useState('America/New_York');
  const [timeOff, setTimeOff] = useState<TimeOffPeriod[]>([]);

  const [showAddTimeOff, setShowAddTimeOff] = useState(false);
  const [newTimeOff, setNewTimeOff] = useState<TimeOffPeriod>({
    label: '',
    startDate: '',
    endDate: '',
  });

  // Fetch current availability
  useEffect(() => {
    fetchAvailability();
  }, [profileId]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/preparers/${profileId}/availability`);

      if (!response.ok) {
        if (response.status === 404) {
          // No availability set yet, use defaults
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();

      // Parse booking preferences
      if (data.bookingPreferences) {
        setBookingEnabled(data.bookingPreferences.bookingEnabled ?? true);
        setAllowPhoneBookings(data.bookingPreferences.allowPhoneBookings ?? true);
        setAllowVideoBookings(data.bookingPreferences.allowVideoBookings ?? true);
        setAllowInPersonBookings(data.bookingPreferences.allowInPersonBookings ?? true);
        setRequireApproval(data.bookingPreferences.requireApprovalForBookings ?? false);
        setCustomMessage(data.bookingPreferences.customBookingMessage || '');
        setAppointmentBufferMinutes(data.bookingPreferences.appointmentBufferMinutes ?? 15);
        setDefaultAppointmentDuration(data.bookingPreferences.defaultAppointmentDuration ?? 30);
        setTimezone(data.bookingPreferences.timezone || 'America/New_York');
      }

      // Parse weekly schedule
      if (data.availability && data.availability.length > 0) {
        const schedule = { ...DEFAULT_SCHEDULE };

        data.availability
          .filter((a: any) => !a.isOverride)
          .forEach((a: any) => {
            schedule[a.dayOfWeek] = {
              enabled: a.isActive,
              startTime: a.startTime,
              endTime: a.endTime,
            };
          });

        setWeeklySchedule(schedule);

        // Parse time off (overrides)
        const timeOffPeriods = data.availability
          .filter((a: any) => a.isOverride && a.overrideFrom && a.overrideUntil)
          .map((a: any) => ({
            id: a.id,
            label: a.overrideLabel || 'Time Off',
            startDate: a.overrideFrom.split('T')[0],
            endDate: a.overrideUntil.split('T')[0],
          }));

        setTimeOff(timeOffPeriods);
      }
    } catch (err) {
      logger.error('Error fetching availability:', err);
      setError('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      // Build availability array for API
      const availabilityRules = [];

      // Add weekly schedule rules
      for (const [dayOfWeek, schedule] of Object.entries(weeklySchedule)) {
        if (schedule.enabled) {
          availabilityRules.push({
            dayOfWeek: parseInt(dayOfWeek),
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isOverride: false,
            isActive: true,
          });
        }
      }

      // Add time off periods as overrides
      for (const period of timeOff) {
        availabilityRules.push({
          id: period.id,
          dayOfWeek: 0, // Not used for overrides
          startTime: '00:00',
          endTime: '00:00',
          isOverride: true,
          overrideFrom: period.startDate,
          overrideUntil: period.endDate,
          overrideLabel: period.label,
          isActive: true,
        });
      }

      const response = await fetch(`/api/preparers/${profileId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability: availabilityRules,
          bookingPreferences: {
            bookingEnabled,
            allowPhoneBookings,
            allowVideoBookings,
            allowInPersonBookings,
            requireApprovalForBookings: requireApproval,
            customBookingMessage: customMessage,
            appointmentBufferMinutes,
            defaultAppointmentDuration,
            timezone,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save availability');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      logger.info('Availability settings saved successfully');
    } catch (err) {
      logger.error('Error saving availability:', err);
      setError(err instanceof Error ? err.message : 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const handleDayToggle = (dayOfWeek: number, enabled: boolean) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayOfWeek]: { ...prev[dayOfWeek], enabled },
    }));
  };

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayOfWeek]: { ...prev[dayOfWeek], [field]: value },
    }));
  };

  const handleAddTimeOff = () => {
    if (!newTimeOff.label || !newTimeOff.startDate || !newTimeOff.endDate) {
      return;
    }

    setTimeOff(prev => [...prev, { ...newTimeOff }]);
    setNewTimeOff({ label: '', startDate: '', endDate: '' });
    setShowAddTimeOff(false);
  };

  const handleRemoveTimeOff = (index: number) => {
    setTimeOff(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Booking Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <CardTitle>Online Booking</CardTitle>
          </div>
          <CardDescription>Control whether clients can book appointments with you online</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Accept Online Bookings</Label>
              <p className="text-sm text-muted-foreground">
                Allow clients to schedule appointments through your booking page
              </p>
            </div>
            <Switch
              checked={bookingEnabled}
              onCheckedChange={setBookingEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <CardTitle>Work Hours</CardTitle>
          </div>
          <CardDescription>Set your available hours for each day of the week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day.value} className="flex items-center gap-4">
              <div className="w-28">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={weeklySchedule[day.value]?.enabled || false}
                    onCheckedChange={(checked) => handleDayToggle(day.value, checked)}
                  />
                  <Label className="font-medium">{day.label}</Label>
                </div>
              </div>

              {weeklySchedule[day.value]?.enabled ? (
                <div className="flex items-center gap-2 flex-1">
                  <Select
                    value={weeklySchedule[day.value]?.startTime || '09:00'}
                    onValueChange={(value) => handleTimeChange(day.value, 'startTime', value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTime(time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground">to</span>
                  <Select
                    value={weeklySchedule[day.value]?.endTime || '17:00'}
                    onValueChange={(value) => handleTimeChange(day.value, 'endTime', value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTime(time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unavailable</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Booking Types */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Types</CardTitle>
          <CardDescription>Choose which types of appointments you offer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-primary" />
              <div>
                <Label>Phone Consultations</Label>
                <p className="text-sm text-muted-foreground">Allow phone call appointments</p>
              </div>
            </div>
            <Switch
              checked={allowPhoneBookings}
              onCheckedChange={setAllowPhoneBookings}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-primary" />
              <div>
                <Label>Video Meetings</Label>
                <p className="text-sm text-muted-foreground">Allow video call appointments</p>
              </div>
            </div>
            <Switch
              checked={allowVideoBookings}
              onCheckedChange={setAllowVideoBookings}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <Label>In-Person Meetings</Label>
                <p className="text-sm text-muted-foreground">Allow clients to visit your office</p>
              </div>
            </div>
            <Switch
              checked={allowInPersonBookings}
              onCheckedChange={setAllowInPersonBookings}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appointment Duration & Buffer Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Settings</CardTitle>
          <CardDescription>Set default duration and buffer time between appointments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Default Appointment Duration</Label>
              <Select
                value={String(defaultAppointmentDuration)}
                onValueChange={(value) => setDefaultAppointmentDuration(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How long each appointment lasts
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buffer">Buffer Between Appointments</Label>
              <Select
                value={String(appointmentBufferMinutes)}
                onValueChange={(value) => setAppointmentBufferMinutes(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Break time between appointments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timezone Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            <CardTitle>Timezone</CardTitle>
          </div>
          <CardDescription>Set your business timezone for accurate scheduling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Your Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{tz.label}</span>
                      <span className="text-muted-foreground text-xs">{tz.abbr}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Your work hours and appointments will be displayed in this timezone.
              Clients will see times converted to their local timezone.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Approval Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Settings</CardTitle>
          <CardDescription>Control how bookings are confirmed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Manual Approval</Label>
              <p className="text-sm text-muted-foreground">
                Review and approve each booking request before it's confirmed
              </p>
            </div>
            <Switch
              checked={requireApproval}
              onCheckedChange={setRequireApproval}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="customMessage">Custom Booking Message</Label>
            <Textarea
              id="customMessage"
              placeholder="Add a message that clients will see on your booking page (e.g., 'Looking forward to helping you with your taxes!')"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This message will appear on your booking page
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Time Off */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Time Off / Vacations</CardTitle>
              <CardDescription>Block out dates when you're unavailable</CardDescription>
            </div>
            <Dialog open={showAddTimeOff} onOpenChange={setShowAddTimeOff}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Time Off
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Time Off</DialogTitle>
                  <DialogDescription>
                    Block out dates when you won't be available for appointments
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeOffLabel">Label</Label>
                    <Input
                      id="timeOffLabel"
                      placeholder="e.g., Vacation, Personal Day, Holiday"
                      value={newTimeOff.label}
                      onChange={(e) => setNewTimeOff(prev => ({ ...prev, label: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={newTimeOff.startDate}
                        onChange={(e) => setNewTimeOff(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={newTimeOff.endDate}
                        onChange={(e) => setNewTimeOff(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddTimeOff(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTimeOff}>
                    Add Time Off
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {timeOff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No time off scheduled</p>
              <p className="text-sm">Add vacation days or other blocked time periods</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeOff.map((period, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{period.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTimeOff(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error / Success Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-5 h-5" />
          <p>Availability settings saved successfully!</p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Availability Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
