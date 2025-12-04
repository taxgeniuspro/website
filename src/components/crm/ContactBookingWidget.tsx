'use client';

/**
 * Contact Booking Widget
 *
 * Embedded in CRM contact detail pages
 * Shows quick booking options filtered by preparer preferences
 * Displays upcoming appointments for this contact
 *
 * Usage:
 * <ContactBookingWidget
 *   contactId="contact-id"
 *   contactEmail="email@example.com"
 *   contactName="John Doe"
 *   contactPhone="555-123-4567"
 *   preparerId="preparer-id"
 * />
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Video, MapPin, Calendar, Clock, Loader2, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ContactBookingWidgetProps {
  contactId: string;
  contactEmail: string;
  contactName: string;
  contactPhone?: string;
  preparerId?: string;
  className?: string;
}

interface Appointment {
  id: string;
  type: string;
  status: string;
  scheduledFor?: string;
  subject?: string;
}

const bookingMethodIcons: Record<string, React.ReactNode> = {
  PHONE_CALL: <Phone className="w-4 h-4" />,
  VIDEO_CALL: <Video className="w-4 h-4" />,
  IN_PERSON: <MapPin className="w-4 h-4" />,
};

const bookingMethodLabels: Record<string, string> = {
  PHONE_CALL: 'Phone Call',
  VIDEO_CALL: 'Video Meeting',
  IN_PERSON: 'In-Person',
};

const statusColors: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-800 border-orange-200',
  SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
  COMPLETED: 'bg-gray-100 text-gray-800 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
};

export function ContactBookingWidget({
  contactId,
  contactEmail,
  contactName,
  contactPhone,
  preparerId,
  className,
}: ContactBookingWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, [contactId, preparerId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch preparer preferences
      if (preparerId) {
        const prefsResponse = await fetch(`/api/preparers/${preparerId}/booking-preferences`);
        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json();
          setAvailableMethods(prefsData.availableBookingMethods || []);
        }
      }

      // Fetch upcoming appointments for this contact
      const appointmentsResponse = await fetch(
        `/api/appointments?clientEmail=${encodeURIComponent(contactEmail)}&status=upcoming`
      );
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        setAppointments(appointmentsData.appointments || []);
      }

      setLoading(false);
    } catch (error) {
      logger.error('[ContactBookingWidget] Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleQuickBook = async (method: string) => {
    setSelectedMethod(method);
    setDialogOpen(true);
  };

  const confirmBooking = async () => {
    if (!selectedMethod) return;

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
          source: 'crm_quick_book',
          notes: `Quick booked from CRM contact page`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to book appointment');
      }

      const data = await response.json();
      logger.info('[ContactBookingWidget] Appointment booked', {
        appointmentId: data.appointmentId,
      });

      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setDialogOpen(false);
        setSelectedMethod(null);
        fetchData(); // Refresh appointments
      }, 2000);
    } catch (error) {
      logger.error('[ContactBookingWidget] Error booking appointment:', error);
      alert(error instanceof Error ? error.message : 'Failed to book appointment');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Appointments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upcoming Appointments */}
        {appointments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
              >
                <div className="flex items-center gap-2">
                  {bookingMethodIcons[apt.type]}
                  <div>
                    <p className="text-sm font-medium">{apt.subject || apt.type}</p>
                    {apt.scheduledFor && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(apt.scheduledFor).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-xs', statusColors[apt.status] || '')}>
                  {apt.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Quick Booking Buttons */}
        {availableMethods.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Quick Book</p>
            <div className="grid grid-cols-3 gap-2">
              {availableMethods.map((method) => (
                <Button
                  key={method}
                  variant="outline"
                  size="sm"
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={() => handleQuickBook(method)}
                >
                  {bookingMethodIcons[method]}
                  <span className="text-xs">{bookingMethodLabels[method]}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* No appointments message */}
        {appointments.length === 0 && availableMethods.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming appointments</p>
          </div>
        )}

        {/* Booking Confirmation Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Appointment Booking</DialogTitle>
              <DialogDescription>
                Book a {selectedMethod ? bookingMethodLabels[selectedMethod] : ''} appointment with{' '}
                {contactName}?
              </DialogDescription>
            </DialogHeader>

            {bookingSuccess ? (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                  Appointment Booked!
                </p>
                <p className="text-sm text-muted-foreground">
                  Email confirmation sent to {contactEmail}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  {selectedMethod && bookingMethodIcons[selectedMethod]}
                  <div>
                    <p className="font-medium">{contactName}</p>
                    <p className="text-sm text-muted-foreground">{contactEmail}</p>
                    {contactPhone && (
                      <p className="text-sm text-muted-foreground">{contactPhone}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setSelectedMethod(null);
                    }}
                    disabled={bookingInProgress}
                  >
                    Cancel
                  </Button>
                  <Button onClick={confirmBooking} disabled={bookingInProgress}>
                    {bookingInProgress ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Booking
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
