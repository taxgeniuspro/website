'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Video, MapPin, Users, Clock, User, Mail, Loader2, FileText, Send } from 'lucide-react';
import { logger } from '@/lib/logger';
import AppointmentDialog from '@/components/AppointmentDialog';
import CancelAppointmentDialog from '@/components/CancelAppointmentDialog';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  subject?: string;
  type?: string;
  status: string;
  scheduledFor?: Date | string;
  duration?: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  location?: string;
  meetingLink?: string;
  clientNotes?: string;
}

interface CalendarViewProps {
  appointments: Appointment[];
  canCreate?: boolean;
  canEdit?: boolean;
  canConfirm?: boolean; // For tax preparers to confirm appointments
}

const statusColors: Record<string, string> = {
  REQUESTED: '#fbbf24', // yellow
  SCHEDULED: '#3b82f6', // blue
  CONFIRMED: '#10b981', // green
  COMPLETED: '#6b7280', // gray
  CANCELLED: '#ef4444', // red
  NO_SHOW: '#f97316', // orange
  RESCHEDULED: '#8b5cf6', // purple
};

const typeIcons: Record<string, React.ReactElement> = {
  PHONE_CALL: <Phone className="w-4 h-4" />,
  VIDEO_CALL: <Video className="w-4 h-4" />,
  IN_PERSON: <MapPin className="w-4 h-4" />,
  CONSULTATION: <Users className="w-4 h-4" />,
  FOLLOW_UP: <Clock className="w-4 h-4" />,
};

export default function CalendarView({ appointments, canCreate, canEdit, canConfirm }: CalendarViewProps) {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [sendingIntake, setSendingIntake] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect mobile device - using both user agent and viewport width
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobileAgent = mobileRegex.test(userAgent.toLowerCase());
      const isMobileViewport = window.innerWidth < 768;
      setIsMobile(isMobileAgent || isMobileViewport);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Transform appointments to FullCalendar events
  const events = appointments
    .filter((apt) => apt.scheduledFor)
    .map((apt) => ({
      id: apt.id,
      title: apt.clientName,
      start: new Date(apt.scheduledFor!),
      end: apt.duration
        ? new Date(new Date(apt.scheduledFor!).getTime() + apt.duration * 60000)
        : new Date(new Date(apt.scheduledFor!).getTime() + 60 * 60000), // Default 1 hour
      backgroundColor: statusColors[apt.status] || '#3b82f6',
      borderColor: statusColors[apt.status] || '#3b82f6',
      extendedProps: {
        appointment: apt,
      },
    }));

  const handleEventClick = (info: EventClickArg) => {
    const appointment = info.event.extendedProps.appointment as Appointment;
    setSelectedEvent(appointment);
    setDialogOpen(true);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (canCreate) {
      logger.info('Date selected for new appointment:', {
        start: selectInfo.startStr,
        end: selectInfo.endStr,
      });
      // TODO: Could pre-fill the appointment dialog with selected date
    }
  };

  const handleSuccess = () => {
    // Trigger a refresh by updating the key
    setRefreshKey((prev) => prev + 1);
    setDialogOpen(false);
    setEditDialogOpen(false);
    setRescheduleDialogOpen(false);
    setCancelDialogOpen(false);
  };

  const handleEdit = () => {
    setDialogOpen(false);
    setEditDialogOpen(true);
  };

  const handleReschedule = () => {
    setDialogOpen(false);
    setRescheduleDialogOpen(true);
  };

  const handleCancelClick = () => {
    setDialogOpen(false);
    setCancelDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedEvent) return;

    setConfirming(true);
    try {
      const response = await fetch(`/api/appointments/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Appointment confirmed successfully',
        });
        // Update local state
        setSelectedEvent({ ...selectedEvent, status: 'CONFIRMED' });
        handleSuccess();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to confirm appointment',
          variant: 'destructive',
        });
        logger.error('Failed to confirm appointment:', data);
      }
    } catch (error) {
      logger.error('Error confirming appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm appointment',
        variant: 'destructive',
      });
    } finally {
      setConfirming(false);
    }
  };

  // Send intake form link to client (email on desktop, SMS on mobile)
  const handleSendIntakeForm = async () => {
    if (!selectedEvent) return;

    setSendingIntake(true);
    try {
      const sendMethod = isMobile ? 'sms' : 'email';

      const response = await fetch(`/api/appointments/${selectedEvent.id}/send-intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendMethod }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send intake form',
          variant: 'destructive',
        });
        return;
      }

      if (sendMethod === 'sms' && data.smsUri) {
        // Open SMS app with pre-filled message
        window.location.href = data.smsUri;
        toast({
          title: 'SMS Ready',
          description: 'Your SMS app should open with the intake form link',
        });
      } else {
        // Email sent successfully
        toast({
          title: 'Success',
          description: `Intake form link sent to ${data.email}`,
        });
      }

      logger.info('Intake form sent', { method: sendMethod, appointmentId: selectedEvent.id });
    } catch (error) {
      logger.error('Error sending intake form:', error);
      toast({
        title: 'Error',
        description: 'Failed to send intake form. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingIntake(false);
    }
  };

  if (!mounted) {
    return <div className="flex items-center justify-center p-8">Loading calendar...</div>;
  }

  return (
    <>
      <div className="fullcalendar-wrapper">
        <style jsx global>{`
          .fullcalendar-wrapper .fc {
            /* FullCalendar theme customization */
          }
          .fullcalendar-wrapper .fc-toolbar-title {
            font-size: 1.5rem;
            font-weight: 700;
          }
          .fullcalendar-wrapper .fc-button {
            background-color: hsl(var(--primary));
            border-color: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
            text-transform: capitalize;
          }
          .fullcalendar-wrapper .fc-button:hover {
            background-color: hsl(var(--primary) / 0.9);
            border-color: hsl(var(--primary) / 0.9);
          }
          .fullcalendar-wrapper .fc-button:disabled {
            background-color: hsl(var(--muted));
            border-color: hsl(var(--muted));
            opacity: 0.5;
          }
          .fullcalendar-wrapper .fc-button-active {
            background-color: hsl(var(--primary) / 0.8);
            border-color: hsl(var(--primary) / 0.8);
          }
          .fullcalendar-wrapper .fc-event {
            cursor: pointer;
          }
          .fullcalendar-wrapper .fc-daygrid-event {
            margin: 2px 0;
            padding: 2px 4px;
          }
          .fullcalendar-wrapper .fc-timegrid-event {
            padding: 4px;
          }
        `}</style>

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
          headerToolbar={
            isMobile
              ? {
                  left: 'prev,next',
                  center: 'title',
                  right: 'today',
                }
              : {
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }
          }
          events={events}
          eventClick={handleEventClick}
          selectable={canCreate}
          select={handleDateSelect}
          editable={canEdit}
          height="auto"
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          nowIndicator={true}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
            startTime: '09:00',
            endTime: '17:00',
          }}
          // Mobile optimizations
          dayMaxEvents={isMobile ? 2 : true}
          moreLinkClick="popover"
          eventDisplay={isMobile ? 'block' : 'auto'}
        />
      </div>

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-full sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {selectedEvent?.type && typeIcons[selectedEvent.type]}
              {selectedEvent?.subject || selectedEvent?.type || 'Appointment Details'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedEvent?.scheduledFor &&
                new Date(selectedEvent.scheduledFor).toLocaleString('en-US', {
                  dateStyle: isMobile ? 'medium' : 'full',
                  timeStyle: 'short',
                })}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-3 sm:space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge
                  style={{
                    backgroundColor: statusColors[selectedEvent.status] || '#3b82f6',
                    color: 'white',
                  }}
                >
                  {selectedEvent.status}
                </Badge>
              </div>

              {/* Client Information */}
              <div className="rounded-lg border p-3 sm:p-4 space-y-2 sm:space-y-3">
                <h3 className="font-semibold text-sm">Client Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{selectedEvent.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a href={`mailto:${selectedEvent.clientEmail}`} className="text-primary hover:underline truncate">
                      {selectedEvent.clientEmail}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a href={`tel:${selectedEvent.clientPhone}`} className="text-primary hover:underline">
                      {selectedEvent.clientPhone}
                    </a>
                  </div>
                </div>
                {/* Mobile Quick Actions */}
                {isMobile && (
                  <div className="flex gap-2 pt-2 border-t mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9"
                      asChild
                    >
                      <a href={`tel:${selectedEvent.clientPhone}`}>
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9"
                      asChild
                    >
                      <a href={`sms:${selectedEvent.clientPhone}`}>
                        <Send className="w-4 h-4 mr-1" />
                        Text
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9"
                      asChild
                    >
                      <a href={`mailto:${selectedEvent.clientEmail}`}>
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {/* Appointment Details */}
              <div className="rounded-lg border p-3 sm:p-4 space-y-2 sm:space-y-3">
                <h3 className="font-semibold text-sm">Appointment Details</h3>
                <div className="space-y-2">
                  {selectedEvent.duration && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedEvent.duration} minutes</span>
                    </div>
                  )}
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                  {selectedEvent.meetingLink && (
                    <div className="flex items-center gap-2 text-sm">
                      <Video className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={selectedEvent.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Join Meeting
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Client Notes */}
              {selectedEvent.clientNotes && (
                <div className="rounded-lg border p-3 sm:p-4 space-y-2">
                  <h3 className="font-semibold text-sm">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedEvent.clientNotes}</p>
                </div>
              )}

              {/* Actions - Responsive layout */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-3 sm:pt-4 border-t">
                {/* Primary Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {canConfirm &&
                    (selectedEvent.status === 'REQUESTED' ||
                      selectedEvent.status === 'SCHEDULED') && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleConfirm}
                        disabled={confirming}
                        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                      >
                        {confirming && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        {isMobile ? 'Confirm' : 'Confirm Appointment'}
                      </Button>
                    )}
                  {/* Send Intake Form - visible for tax preparers/admins */}
                  {canConfirm && selectedEvent.status !== 'CANCELLED' && selectedEvent.status !== 'COMPLETED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendIntakeForm}
                      disabled={sendingIntake}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 w-full sm:w-auto"
                    >
                      {sendingIntake ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-3 w-3" />
                      )}
                      {isMobile ? 'Send Intake' : 'Email Intake Form'}
                    </Button>
                  )}
                </div>
                {/* Secondary Actions */}
                <div className="flex flex-wrap gap-2">
                  {canEdit && selectedEvent.status !== 'CANCELLED' && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleReschedule} className="flex-1 sm:flex-none">
                        Reschedule
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1 sm:flex-none">
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleCancelClick} className="flex-1 sm:flex-none">
                        Cancel
                      </Button>
                    </>
                  )}
                  <Button variant="default" size="sm" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {selectedEvent && (
        <AppointmentDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={handleSuccess}
          appointment={selectedEvent}
          mode="edit"
        />
      )}

      {/* Reschedule Dialog */}
      {selectedEvent && (
        <AppointmentDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          onSuccess={handleSuccess}
          appointment={selectedEvent}
          mode="edit"
        />
      )}

      {/* Cancel Dialog */}
      {selectedEvent && (
        <CancelAppointmentDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          onSuccess={handleSuccess}
          appointmentId={selectedEvent.id}
          appointmentDetails={{
            clientName: selectedEvent.clientName,
            scheduledFor: selectedEvent.scheduledFor,
          }}
        />
      )}
    </>
  );
}
