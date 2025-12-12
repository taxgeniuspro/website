'use client';

/**
 * Direct Booking Page
 *
 * Accessible via:
 * - taxgeniuspro.tax/book
 * - taxgeniuspro.tax/username?book=true (referral link)
 * - taxgeniuspro.tax/book?preparer=id
 *
 * Allows clients to book appointments directly with a specific preparer
 * or the default preparer if none specified.
 *
 * Features:
 * - Calendar date picker
 * - Available time slot selection
 * - Meeting type selection (Phone, Video, In-Person)
 * - Location display for in-person meetings
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/header';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Calendar,
  Phone,
  Video,
  MapPin,
  CheckCircle,
  Loader2,
  Clock,
  User,
  Mail,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { format, addDays, isBefore, startOfDay } from 'date-fns';

interface PreprerBookingPreferences {
  preparer: {
    id: string;
    name: string;
    companyName?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
    publicAddress?: string;
  };
  bookingEnabled: boolean;
  availableBookingMethods: string[];
  requiresApproval: boolean;
  customMessage?: string;
  calendarColor: string;
}

interface TimeSlot {
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

const bookingMethodIcons: Record<string, React.ReactNode> = {
  PHONE_CALL: <Phone className="w-5 h-5" />,
  VIDEO_CALL: <Video className="w-5 h-5" />,
  IN_PERSON: <MapPin className="w-5 h-5" />,
};

const bookingMethodLabels: Record<string, string> = {
  PHONE_CALL: 'Phone Consultation',
  VIDEO_CALL: 'Video Meeting',
  IN_PERSON: 'In-Person Meeting',
};

const bookingMethodDescriptions: Record<string, string> = {
  PHONE_CALL: 'Quick and convenient phone call',
  VIDEO_CALL: 'Face-to-face over video',
  IN_PERSON: 'Meet at our office',
};

const formatTimeSlot = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Default office address
const DEFAULT_ADDRESS = '1632 Jonesboro Rd SE, Atlanta, GA 30315';

function BookingPageContent() {
  const searchParams = useSearchParams();
  const preparerId = searchParams?.get('preparer');
  const referralUsername = searchParams?.get('ref');

  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<PreprerBookingPreferences | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [step, setStep] = useState<'method' | 'datetime' | 'info'>('method');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const resolvedPreparerId = preferences?.preparer?.id;

  useEffect(() => {
    fetchBookingPreferences();
  }, [preparerId, referralUsername]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate && resolvedPreparerId) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, resolvedPreparerId]);

  const fetchBookingPreferences = async () => {
    try {
      setLoading(true);

      let targetPreparerId = preparerId;

      // If coming from referral link, resolve preparer from username
      if (referralUsername && !targetPreparerId) {
        const referralResponse = await fetch(
          `/api/referrals/resolve?username=${encodeURIComponent(referralUsername)}`
        );
        if (referralResponse.ok) {
          const referralData = await referralResponse.json();
          targetPreparerId = referralData.preparerId;
        }
      }

      // Fallback to default preparer
      if (!targetPreparerId) {
        const defaultResponse = await fetch('/api/preparers/default');
        if (defaultResponse.ok) {
          const defaultData = await defaultResponse.json();
          targetPreparerId = defaultData.preparerId;
        }
      }

      if (!targetPreparerId) {
        logger.warn('[BookingPage] No preparer found');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/preparers/${targetPreparerId}/booking-preferences`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking preferences');
      }

      const data = await response.json();
      setPreferences(data);
      setLoading(false);
    } catch (error) {
      logger.error('[BookingPage] Error fetching booking preferences:', error);
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (date: Date) => {
    if (!resolvedPreparerId) return;

    try {
      setLoadingSlots(true);
      setAvailableSlots([]);
      setSelectedTimeSlot(null);

      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(
        `/api/appointments/available-slots?preparerId=${resolvedPreparerId}&date=${dateStr}&duration=30`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch available slots');
      }

      const data = await response.json();
      setAvailableSlots(data.slots || []);
    } catch (error) {
      logger.error('[BookingPage] Error fetching available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMethod || !preferences) return;

    // Validate form
    if (!formData.name || !formData.email || !formData.phone) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setBookingInProgress(true);

      // Build scheduled time if date and slot are selected
      let scheduledFor: string | undefined;
      if (selectedDate && selectedTimeSlot) {
        const [hours, minutes] = selectedTimeSlot.split(':');
        const scheduledDate = new Date(selectedDate);
        scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        scheduledFor = scheduledDate.toISOString();
      }

      const response = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: formData.name,
          clientEmail: formData.email,
          clientPhone: formData.phone,
          appointmentType: selectedMethod,
          scheduledFor,
          duration: 30,
          source: referralUsername ? 'referral_direct_booking' : 'direct_booking_page',
          notes: formData.notes || 'Booked via direct booking page',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to book appointment');
      }

      const data = await response.json();
      logger.info('[BookingPage] Appointment booked successfully', {
        appointmentId: data.appointmentId,
      });

      setBookingSuccess(true);
    } catch (error) {
      logger.error('[BookingPage] Error booking appointment:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to book appointment. Please call us at +1 404-627-1015'
      );
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    setStep('datetime');
  };

  const handleBack = () => {
    if (step === 'info') {
      setStep('datetime');
    } else if (step === 'datetime') {
      setStep('method');
      setSelectedDate(undefined);
      setSelectedTimeSlot(null);
    }
  };

  const handleContinueToInfo = () => {
    setStep('info');
  };

  // Get office address
  const officeAddress = preferences?.preparer?.publicAddress || DEFAULT_ADDRESS;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(officeAddress)}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (!preferences || !preferences.bookingEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Booking Not Available</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Online booking is currently not available. Please contact us directly to schedule an
                appointment.
              </p>
              <Button asChild>
                <a href="/contact">Contact Us</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto border-green-500/20 bg-green-50 dark:bg-green-950/20">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="w-20 h-20 text-green-600 mb-4" />
              <h2 className="text-3xl font-bold mb-2">Appointment Requested!</h2>
              <p className="text-muted-foreground max-w-md mb-2">
                {preferences.requiresApproval
                  ? `We've received your appointment request. ${preferences.preparer.name} will review and confirm within 24 hours.`
                  : 'Your appointment is confirmed! Check your email for details and calendar invite.'}
              </p>
              {selectedDate && selectedTimeSlot && (
                <p className="text-lg font-medium mb-6">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {formatTimeSlot(selectedTimeSlot)}
                </p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Book Another
                </Button>
                <Button asChild>
                  <a href="/">Go to Homepage</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-8 lg:py-12 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Book Your Appointment
            </Badge>

            {/* Preparer Avatar */}
            {preferences.preparer.avatarUrl && (
              <div className="flex justify-center mb-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                  <img
                    src={preferences.preparer.avatarUrl}
                    alt={preferences.preparer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <h1 className="text-2xl lg:text-4xl font-bold text-foreground mb-2">
              Schedule with <span className="text-primary">{preferences.preparer.name}</span>
            </h1>

            {/* Preparer Contact Info */}
            <div className="flex flex-wrap justify-center items-center gap-4 mb-4 text-sm">
              {preferences.preparer.phone && (
                <a
                  href={`tel:${preferences.preparer.phone}`}
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>{preferences.preparer.phone}</span>
                </a>
              )}
              {preferences.preparer.email && (
                <a
                  href={`mailto:${preferences.preparer.email}`}
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>{preferences.preparer.email}</span>
                </a>
              )}
            </div>

            {preferences.customMessage && (
              <p className="text-muted-foreground mb-4">{preferences.customMessage}</p>
            )}
          </div>
        </div>
      </section>

      {/* Booking Steps */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step === 'method' || step === 'datetime' || step === 'info'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                1
              </div>
              <span className="text-sm font-medium hidden sm:inline">Meeting Type</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step === 'datetime' || step === 'info'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                2
              </div>
              <span className="text-sm font-medium hidden sm:inline">Date & Time</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step === 'info'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                3
              </div>
              <span className="text-sm font-medium hidden sm:inline">Your Info</span>
            </div>
          </div>

          {/* Step 1: Meeting Type */}
          {step === 'method' && (
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Choose Meeting Type</CardTitle>
                  <CardDescription>Select your preferred consultation method</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {preferences.availableBookingMethods.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => handleMethodSelect(method)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                        selectedMethod === method
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      )}
                    >
                      <div
                        className={cn(
                          'h-12 w-12 rounded-full flex items-center justify-center shrink-0',
                          selectedMethod === method
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {bookingMethodIcons[method]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base">{bookingMethodLabels[method]}</p>
                        <p className="text-sm text-muted-foreground">
                          {bookingMethodDescriptions[method]}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </button>
                  ))}

                  {/* Location Card for In-Person */}
                  {preferences.availableBookingMethods.includes('IN_PERSON') && (
                    <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Office Location</p>
                          <p className="text-sm text-muted-foreground">{officeAddress}</p>
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                          >
                            Get Directions <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {step === 'datetime' && (
            <div className="space-y-6">
              <Button variant="ghost" onClick={handleBack} className="mb-4">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Meeting Type
              </Button>

              {/* Selected Method Badge */}
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="flex items-center gap-2 py-1 px-3">
                  {selectedMethod && bookingMethodIcons[selectedMethod]}
                  {selectedMethod && bookingMethodLabels[selectedMethod]}
                </Badge>
                {selectedMethod === 'IN_PERSON' && (
                  <Badge variant="outline" className="flex items-center gap-1 py-1 px-3">
                    <MapPin className="w-3 h-3" />
                    {officeAddress}
                  </Badge>
                )}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Calendar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Select a Date</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => isBefore(date, startOfDay(new Date()))}
                      className="rounded-md border"
                    />
                  </CardContent>
                </Card>

                {/* Time Slots */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedDate
                        ? `Available Times for ${format(selectedDate, 'EEEE, MMM d')}`
                        : 'Select a Date First'}
                    </CardTitle>
                    <CardDescription>
                      {selectedDate
                        ? 'Choose a time that works for you'
                        : 'Pick a date from the calendar to see available times'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedDate ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mb-3 opacity-50" />
                        <p>Please select a date</p>
                      </div>
                    ) : loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Clock className="w-12 h-12 mb-3 opacity-50" />
                        <p className="font-medium">No availability</p>
                        <p className="text-sm">Try selecting a different date</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.startTime}
                            type="button"
                            onClick={() => setSelectedTimeSlot(slot.startTime)}
                            className={cn(
                              'p-2 rounded-lg text-sm font-medium transition-all',
                              selectedTimeSlot === slot.startTime
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            )}
                          >
                            {formatTimeSlot(slot.startTime)}
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Continue Button */}
              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={handleContinueToInfo}
                  disabled={!selectedDate || !selectedTimeSlot}
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Approval Notice */}
              {preferences.requiresApproval && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                  <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
                      Approval Required
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      Your request will be reviewed and confirmed within 24 hours
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Contact Info */}
          {step === 'info' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Button variant="ghost" onClick={handleBack} className="mb-4">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Date & Time
              </Button>

              {/* Booking Summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Badge variant="secondary" className="flex items-center gap-2 py-1 px-3">
                      {selectedMethod && bookingMethodIcons[selectedMethod]}
                      {selectedMethod && bookingMethodLabels[selectedMethod]}
                    </Badge>
                    {selectedDate && (
                      <Badge variant="secondary" className="flex items-center gap-2 py-1 px-3">
                        <Calendar className="w-3 h-3" />
                        {format(selectedDate, 'EEE, MMM d, yyyy')}
                      </Badge>
                    )}
                    {selectedTimeSlot && (
                      <Badge variant="secondary" className="flex items-center gap-2 py-1 px-3">
                        <Clock className="w-3 h-3" />
                        {formatTimeSlot(selectedTimeSlot)}
                      </Badge>
                    )}
                  </div>
                  {selectedMethod === 'IN_PERSON' && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{officeAddress}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Form */}
              <form onSubmit={handleBookAppointment}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Your Information</CardTitle>
                    <CardDescription>We'll use this to contact you</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="John Doe"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, email: e.target.value }))
                          }
                          placeholder="john@example.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone">
                        Phone <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, phone: e.target.value }))
                          }
                          placeholder="555-123-4567"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <div className="relative mt-1">
                        <MessageCircle className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          placeholder="Tell us about your tax situation..."
                          className="pl-10 min-h-[100px]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-6"
                  disabled={bookingInProgress}
                >
                  {bookingInProgress ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Confirm Booking
                    </>
                  )}
                </Button>

                {preferences.preparer.phone && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Prefer to call?{' '}
                    <a
                      href={`tel:${preferences.preparer.phone}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {preferences.preparer.phone}
                    </a>
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <BookingPageContent />
    </Suspense>
  );
}
