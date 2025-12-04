'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, CheckCircle, ArrowRight, Phone, Mail, User, CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { PreparerCard } from '@/components/PreparerCard';

interface TimeSlot {
  time: string;
  available: boolean;
}

const timeSlots: TimeSlot[] = [
  { time: '9:00 AM', available: true },
  { time: '10:00 AM', available: true },
  { time: '11:00 AM', available: false },
  { time: '12:00 PM', available: true },
  { time: '1:00 PM', available: true },
  { time: '2:00 PM', available: true },
  { time: '3:00 PM', available: false },
  { time: '4:00 PM', available: true },
  { time: '5:00 PM', available: true },
];

interface PreparerInfo {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  companyName?: string | null;
  licenseNo?: string | null;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
  qrCodeUrl?: string | null;
}

export default function AppointmentBooking() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [preparer, setPreparer] = useState<PreparerInfo | null>(null);

  // Fetch preparer info on mount
  useEffect(() => {
    const fetchPreparerInfo = async () => {
      try {
        const response = await fetch('/api/preparer/info');
        if (response.ok) {
          const data = await response.json();
          if (data.preparer) {
            setPreparer(data.preparer);
            logger.info('Preparer info loaded for appointment booking', {
              preparer: data.preparer.firstName,
            });
          }
        }
      } catch (error) {
        logger.error('Error fetching preparer info:', error);
      }
    };

    fetchPreparerInfo();
  }, []);

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!selectedDate) {
        throw new Error('Please select a date');
      }

      // Combine date and time into a scheduledFor timestamp
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const scheduledFor = new Date(
        `${dateString}T${convertTo24Hour(selectedTime)}`
      ).toISOString();

      const response = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: formData.name,
          clientEmail: formData.email,
          clientPhone: formData.phone,
          appointmentType: 'CONSULTATION',
          scheduledFor,
          notes: formData.notes || undefined,
          source: 'appointment_booking_page',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book appointment');
      }

      setIsSuccess(true);
    } catch (error) {
      logger.error('Error booking appointment:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to book appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to convert 12-hour time to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    const [time, period] = time12h.split(' ');
    let [hours, minutes] = time.split(':');

    if (period === 'PM' && hours !== '12') {
      hours = String(parseInt(hours) + 12);
    } else if (period === 'AM' && hours === '12') {
      hours = '00';
    }

    return `${hours.padStart(2, '0')}:${minutes || '00'}:00`;
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Appointment Confirmed!</h2>
          <p className="text-lg text-muted-foreground mb-2">Your appointment is scheduled for:</p>
          <div className="text-2xl font-semibold text-primary mb-1">
            {selectedDate && selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <div className="text-xl text-primary mb-6">{selectedTime}</div>
          <p className="text-muted-foreground mb-8">
            We've sent a confirmation email to <strong>{formData.email}</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => (window.location.href = '/')}>
              Back to Home
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => (window.location.href = '/dashboard/client')}
            >
              View Your Dashboard <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* First Card - Contact Information */}
      <Card className="h-fit w-full">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              No signup required
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Book instantly
            </div>
          </div>
          <CardTitle className="text-2xl">Schedule Your Consultation</CardTitle>
          <CardDescription>
            Fill out the form below and we'll confirm your appointment within 24 hours
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <User className="w-4 h-4" />
            Your Information
          </h3>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              required
              className="h-12"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  required
                  className="h-12 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  required
                  className="h-12 pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Second Card - Date & Time */}
      <Card className="h-fit w-full">
        <CardHeader>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Preferred Date & Time
          </h3>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="date">Select Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full h-12 justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedDate && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Select Time *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    type="button"
                    variant={selectedTime === slot.time ? 'default' : 'outline'}
                    className="h-11 text-sm"
                    disabled={!slot.available}
                    onClick={() => handleTimeSelect(slot.time)}
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Tell us about your tax situation, specific questions, or preferred contact method..."
              className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {submitError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
              <p className="text-sm font-medium">{submitError}</p>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full h-12"
            disabled={isSubmitting || !selectedDate || !selectedTime}
          >
            {isSubmitting ? 'Booking...' : 'Confirm Appointment'}
            {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By booking, you agree to our{' '}
            <a href="/terms" className="text-primary hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
