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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface PreprerBookingPreferences {
  preparer: {
    id: string;
    name: string;
    companyName?: string;
  };
  bookingEnabled: boolean;
  availableBookingMethods: string[];
  requiresApproval: boolean;
  customMessage?: string;
  calendarColor: string;
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

function BookingPageContent() {
  const searchParams = useSearchParams();
  const preparerId = searchParams?.get('preparer');
  const referralUsername = searchParams?.get('ref');

  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<PreprerBookingPreferences | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    fetchBookingPreferences();
  }, [preparerId, referralUsername]);

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

      const response = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: formData.name,
          clientEmail: formData.email,
          clientPhone: formData.phone,
          appointmentType: selectedMethod,
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
              <p className="text-muted-foreground max-w-md mb-6">
                {preferences.requiresApproval
                  ? `We've received your appointment request. ${preferences.preparer.name} will review and confirm within 24 hours.`
                  : 'Your appointment is confirmed! Check your email for details and calendar invite.'}
              </p>
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
      <section className="relative py-12 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Book Your Appointment
            </Badge>
            <h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4">
              Schedule with <span className="text-primary">{preferences.preparer.name}</span>
            </h1>
            {preferences.customMessage && (
              <p className="text-lg text-muted-foreground mb-6">{preferences.customMessage}</p>
            )}
          </div>
        </div>
      </section>

      {/* Booking Form */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleBookAppointment}>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column: Contact Info */}
              <div className="space-y-6">
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
              </div>

              {/* Right Column: Booking Method */}
              <div className="space-y-6">
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
                        onClick={() => setSelectedMethod(method)}
                        className={cn(
                          'w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                          selectedMethod === method
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        )}
                      >
                        <div
                          className={cn(
                            'h-12 w-12 rounded-full flex items-center justify-center',
                            selectedMethod === method
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          {bookingMethodIcons[method]}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-base">{bookingMethodLabels[method]}</p>
                          <p className="text-sm text-muted-foreground">
                            {bookingMethodDescriptions[method]}
                          </p>
                        </div>
                        {selectedMethod === method && (
                          <CheckCircle className="w-6 h-6 text-primary" />
                        )}
                      </button>
                    ))}

                    {/* Approval Notice */}
                    {preferences.requiresApproval && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 mt-4">
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
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={!selectedMethod || bookingInProgress}
                >
                  {bookingInProgress ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5 mr-2" />
                      Book Appointment
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Prefer to call?{' '}
                  <a href="tel:+14046271015" className="text-primary hover:underline font-medium">
                    +1 404-627-1015
                  </a>
                </p>
              </div>
            </div>
          </form>
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
