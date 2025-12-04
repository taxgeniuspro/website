'use client';

/**
 * Booking Call-To-Action Component
 *
 * Shown after contact form submission to convert leads into booked appointments
 * Respects preparer booking preferences (phone/video/in-person)
 *
 * Usage:
 * <BookingCallToAction
 *   contactEmail="john@example.com"
 *   contactName="John Doe"
 *   contactPhone="555-123-4567"
 *   preparerId="optional-preparer-id"
 * />
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Phone, Video, MapPin, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface BookingCallToActionProps {
  contactEmail: string;
  contactName: string;
  contactPhone?: string;
  preparerId?: string;
  className?: string;
}

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

export function BookingCallToAction({
  contactEmail,
  contactName,
  contactPhone,
  preparerId,
  className,
}: BookingCallToActionProps) {
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<PreprerBookingPreferences | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  useEffect(() => {
    fetchBookingPreferences();
  }, [preparerId]);

  const fetchBookingPreferences = async () => {
    try {
      setLoading(true);

      // If no preparerId provided, use default preparer
      let targetPreparerId = preparerId;
      if (!targetPreparerId) {
        // Fetch default preparer (admin or first tax preparer)
        const response = await fetch('/api/preparers/default');
        if (response.ok) {
          const data = await response.json();
          targetPreparerId = data.preparerId;
        }
      }

      if (!targetPreparerId) {
        logger.warn('[BookingCTA] No preparer found');
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
      logger.error('[BookingCTA] Error fetching booking preferences:', error);
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedMethod || !preferences) return;

    try {
      setBookingInProgress(true);

      const response = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: contactName,
          clientEmail: contactEmail,
          clientPhone: contactPhone || '',
          appointmentType: selectedMethod,
          source: 'contact_form_cta',
          notes: `Booked via contact form CTA after inquiry`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to book appointment');
      }

      const data = await response.json();
      logger.info('[BookingCTA] Appointment booked successfully', {
        appointmentId: data.appointmentId,
      });

      setBookingSuccess(true);
    } catch (error) {
      logger.error('[BookingCTA] Error booking appointment:', error);
      alert('Failed to book appointment. Please call us at +1 404-627-1015');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn('border-primary/20', className)}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences || !preferences.bookingEnabled) {
    return null; // Don't show if booking is disabled
  }

  if (bookingSuccess) {
    return (
      <Card className={cn('border-green-500/20 bg-green-50 dark:bg-green-950/20', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
          <h3 className="text-2xl font-bold mb-2">Appointment Requested!</h3>
          <p className="text-muted-foreground max-w-md">
            {preferences.requiresApproval
              ? "Your appointment request has been sent. We'll confirm the details within 24 hours."
              : 'Your appointment is confirmed! Check your email for details and calendar invite.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn('border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10', className)}
    >
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Book Your Free Consultation</CardTitle>
        <CardDescription className="text-base">
          {preferences.customMessage ||
            `Connect with ${preferences.preparer.name} to discuss your tax needs`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Available Booking Methods */}
          <div>
            <p className="text-sm font-medium mb-3">Choose your preferred method:</p>
            <div className="grid gap-3">
              {preferences.availableBookingMethods.map((method) => (
                <button
                  key={method}
                  onClick={() => setSelectedMethod(method)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                    selectedMethod === method
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  )}
                >
                  <div
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center',
                      selectedMethod === method ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    {bookingMethodIcons[method]}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{bookingMethodLabels[method]}</p>
                    <p className="text-sm text-muted-foreground">
                      {bookingMethodDescriptions[method]}
                    </p>
                  </div>
                  {selectedMethod === method && <CheckCircle className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* Approval Notice */}
          {preferences.requiresApproval && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  Approval Required
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Your request will be reviewed and confirmed within 24 hours
                </p>
              </div>
            </div>
          )}

          {/* Book Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleBookAppointment}
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
                Book Free Consultation
              </>
            )}
          </Button>

          {/* Alternative Contact */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Prefer to call?{' '}
              <a href="tel:+14046271015" className="text-primary hover:underline font-medium">
                +1 404-627-1015
              </a>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
