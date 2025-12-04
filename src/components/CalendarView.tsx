'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
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
import { Phone, Video, MapPin, Users, Clock, User, Mail, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    setMounted(true);
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
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
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
        />
      </div>

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.type && typeIcons[selectedEvent.type]}
              {selectedEvent?.subject || selectedEvent?.type || 'Appointment Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent?.scheduledFor &&
                new Date(selectedEvent.scheduledFor).toLocaleString('en-US', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
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
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold text-sm">Client Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{selectedEvent.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${selectedEvent.clientEmail}`} className="text-primary hover:underline">
                      {selectedEvent.clientEmail}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${selectedEvent.clientPhone}`} className="text-primary hover:underline">
                      {selectedEvent.clientPhone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="rounded-lg border p-4 space-y-3">
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
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold text-sm">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedEvent.clientNotes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between gap-2 pt-4 border-t">
                <div className="flex gap-2">
                  {canConfirm &&
                    (selectedEvent.status === 'REQUESTED' ||
                      selectedEvent.status === 'SCHEDULED') && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleConfirm}
                        disabled={confirming}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {confirming && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Confirm Appointment
                      </Button>
                    )}
                </div>
                <div className="flex gap-2">
                  {canEdit && selectedEvent.status !== 'CANCELLED' && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleReschedule}>
                        Reschedule
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleEdit}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleCancelClick}>
                        Cancel
                      </Button>
                    </>
                  )}
                  <Button variant="default" size="sm" onClick={() => setDialogOpen(false)}>
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
