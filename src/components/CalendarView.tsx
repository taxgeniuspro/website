'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Phone, Video, MapPin, Users, Clock, User, Mail, Loader2, Send,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, List
} from 'lucide-react';
import { logger } from '@/lib/logger';
import AppointmentDialog from '@/components/AppointmentDialog';
import CancelAppointmentDialog from '@/components/CancelAppointmentDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Dynamically import FullCalendar to avoid SSR issues
const FullCalendar = dynamic(() => import('@fullcalendar/react'), {
  ssr: false,
  loading: () => <CalendarSkeleton />
});

// Import plugins separately for tree-shaking
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

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
  canConfirm?: boolean;
}

const statusColors: Record<string, string> = {
  REQUESTED: '#fbbf24',
  SCHEDULED: '#3b82f6',
  CONFIRMED: '#10b981',
  COMPLETED: '#6b7280',
  CANCELLED: '#ef4444',
  NO_SHOW: '#f97316',
  RESCHEDULED: '#8b5cf6',
};

const statusBgColors: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-300',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-300',
  COMPLETED: 'bg-gray-100 text-gray-800 border-gray-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
  NO_SHOW: 'bg-orange-100 text-orange-800 border-orange-300',
  RESCHEDULED: 'bg-purple-100 text-purple-800 border-purple-300',
};

const typeIcons: Record<string, React.ReactElement> = {
  PHONE_CALL: <Phone className="w-4 h-4" />,
  VIDEO_CALL: <Video className="w-4 h-4" />,
  IN_PERSON: <MapPin className="w-4 h-4" />,
  CONSULTATION: <Users className="w-4 h-4" />,
  FOLLOW_UP: <Clock className="w-4 h-4" />,
};

function CalendarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array(35).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

// Mobile-friendly list view component
function MobileListView({
  appointments,
  onAppointmentClick,
  currentDate,
  onDateChange
}: {
  appointments: Appointment[];
  onAppointmentClick: (apt: Appointment) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}) {
  // Group appointments by date
  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};

    // Get start of week
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Get end of week
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    appointments
      .filter(apt => apt.scheduledFor)
      .forEach(apt => {
        const date = new Date(apt.scheduledFor!);
        if (date >= startOfWeek && date < endOfWeek) {
          const dateKey = date.toDateString();
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(apt);
        }
      });

    // Sort each group by time
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) =>
        new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime()
      );
    });

    return groups;
  }, [appointments, currentDate]);

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Generate week days
  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`;
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
        <Button variant="ghost" size="sm" onClick={() => navigateWeek(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-sm">{formatWeekRange()}</p>
          <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={goToToday}>
            Today
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigateWeek(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days with appointments */}
      <div className="space-y-3">
        {weekDays.map(day => {
          const dateKey = day.toDateString();
          const dayAppointments = groupedAppointments[dateKey] || [];
          const isToday = new Date().toDateString() === dateKey;

          return (
            <div key={dateKey} className={cn(
              "rounded-lg border",
              isToday && "border-primary bg-primary/5"
            )}>
              {/* Day Header */}
              <div className={cn(
                "px-3 py-2 border-b flex items-center justify-between",
                isToday && "bg-primary/10"
              )}>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    isToday ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {day.getDate()}
                  </span>
                  <div>
                    <p className="font-medium text-sm">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {day.toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {dayAppointments.length} appt{dayAppointments.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Appointments */}
              <div className="divide-y">
                {dayAppointments.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No appointments
                  </div>
                ) : (
                  dayAppointments.map(apt => (
                    <button
                      key={apt.id}
                      onClick={() => onAppointmentClick(apt)}
                      className="w-full px-3 py-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                    >
                      <div
                        className="w-1 h-12 rounded-full shrink-0"
                        style={{ backgroundColor: statusColors[apt.status] || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{apt.clientName}</span>
                          {apt.type && (
                            <span className="text-muted-foreground">{typeIcons[apt.type]}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(apt.scheduledFor!).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                          {apt.duration && <span>· {apt.duration}min</span>}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-xs shrink-0", statusBgColors[apt.status])}
                      >
                        {apt.status}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarView({ appointments, canCreate, canEdit, canConfirm }: CalendarViewProps) {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sendingIntake, setSendingIntake] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarError, setCalendarError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileViewport = window.innerWidth < 768;
      setIsMobile(isMobileViewport);
      // Auto-switch to list view on mobile
      if (isMobileViewport && viewMode === 'calendar') {
        setViewMode('list');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [viewMode]);

  // Transform appointments to FullCalendar events
  const events = useMemo(() => appointments
    .filter((apt) => apt.scheduledFor)
    .map((apt) => ({
      id: apt.id,
      title: apt.clientName,
      start: new Date(apt.scheduledFor!),
      end: apt.duration
        ? new Date(new Date(apt.scheduledFor!).getTime() + apt.duration * 60000)
        : new Date(new Date(apt.scheduledFor!).getTime() + 60 * 60000),
      backgroundColor: statusColors[apt.status] || '#3b82f6',
      borderColor: statusColors[apt.status] || '#3b82f6',
      extendedProps: { appointment: apt },
    })), [appointments]);

  const handleEventClick = (info: EventClickArg) => {
    const appointment = info.event.extendedProps.appointment as Appointment;
    setSelectedEvent(appointment);
    setDialogOpen(true);
  };

  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedEvent(apt);
    setDialogOpen(true);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (canCreate) {
      logger.info('Date selected for new appointment:', {
        start: selectInfo.startStr,
        end: selectInfo.endStr,
      });
    }
  };

  const handleSuccess = () => {
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
        body: JSON.stringify({ action: 'confirm' }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Appointment confirmed successfully' });
        setSelectedEvent({ ...selectedEvent, status: 'CONFIRMED' });
        handleSuccess();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to confirm appointment', variant: 'destructive' });
      }
    } catch (error) {
      logger.error('Error confirming appointment:', error);
      toast({ title: 'Error', description: 'Failed to confirm appointment', variant: 'destructive' });
    } finally {
      setConfirming(false);
    }
  };

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
        toast({ title: 'Error', description: data.error || 'Failed to send intake form', variant: 'destructive' });
        return;
      }

      if (sendMethod === 'sms' && data.smsUri) {
        window.location.href = data.smsUri;
        toast({ title: 'SMS Ready', description: 'Your SMS app should open with the intake form link' });
      } else {
        toast({ title: 'Success', description: `Intake form link sent to ${data.email}` });
      }
    } catch (error) {
      logger.error('Error sending intake form:', error);
      toast({ title: 'Error', description: 'Failed to send intake form. Please try again.', variant: 'destructive' });
    } finally {
      setSendingIntake(false);
    }
  };

  if (!mounted) {
    return <CalendarSkeleton />;
  }

  return (
    <>
      {/* View Toggle */}
      <div className="flex justify-end mb-4 gap-2">
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('calendar')}
          className="gap-2"
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Calendar</span>
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('list')}
          className="gap-2"
        >
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">List</span>
        </Button>
      </div>

      {/* Calendar or List View */}
      {viewMode === 'list' || calendarError ? (
        <MobileListView
          appointments={appointments}
          onAppointmentClick={handleAppointmentClick}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
      ) : (
        <div className="fullcalendar-wrapper">
          <style jsx global>{`
            .fullcalendar-wrapper .fc {
              font-family: inherit;
            }
            .fullcalendar-wrapper .fc-toolbar-title {
              font-size: 1.25rem;
              font-weight: 600;
            }
            @media (max-width: 640px) {
              .fullcalendar-wrapper .fc-toolbar-title {
                font-size: 1rem;
              }
              .fullcalendar-wrapper .fc-toolbar {
                flex-direction: column;
                gap: 0.5rem;
              }
              .fullcalendar-wrapper .fc-toolbar-chunk {
                display: flex;
                justify-content: center;
              }
            }
            .fullcalendar-wrapper .fc-button {
              background-color: hsl(var(--primary));
              border-color: hsl(var(--primary));
              color: hsl(var(--primary-foreground));
              text-transform: capitalize;
              font-size: 0.875rem;
              padding: 0.375rem 0.75rem;
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
              background-color: hsl(var(--primary) / 0.8) !important;
              border-color: hsl(var(--primary) / 0.8) !important;
            }
            .fullcalendar-wrapper .fc-event {
              cursor: pointer;
              border-radius: 4px;
            }
            .fullcalendar-wrapper .fc-daygrid-event {
              margin: 1px 2px;
              padding: 2px 4px;
            }
            .fullcalendar-wrapper .fc-timegrid-event {
              padding: 2px 4px;
            }
            .fullcalendar-wrapper .fc-daygrid-day-number {
              padding: 4px 8px;
            }
            .fullcalendar-wrapper .fc-col-header-cell-cushion {
              padding: 8px 4px;
            }
          `}</style>

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,listWeek',
            }}
            events={events}
            eventClick={handleEventClick}
            selectable={canCreate}
            select={handleDateSelect}
            editable={canEdit}
            height="auto"
            contentHeight="auto"
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            nowIndicator={true}
            dayMaxEvents={3}
            moreLinkClick="popover"
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: '09:00',
              endTime: '17:00',
            }}
            eventDidMount={(info) => {
              // Add tooltip
              info.el.title = `${info.event.title} - ${info.event.extendedProps.appointment?.status}`;
            }}
            datesSet={(dateInfo) => {
              setCurrentDate(dateInfo.start);
            }}
          />
        </div>
      )}

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {selectedEvent?.type && typeIcons[selectedEvent.type]}
              {selectedEvent?.subject || selectedEvent?.type?.replace('_', ' ') || 'Appointment Details'}
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
                <Badge className={cn("text-xs", statusBgColors[selectedEvent.status])}>
                  {selectedEvent.status}
                </Badge>
              </div>

              {/* Client Information */}
              <Card>
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Client Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{selectedEvent.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${selectedEvent.clientEmail}`} className="text-primary hover:underline truncate">
                        {selectedEvent.clientEmail}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${selectedEvent.clientPhone}`} className="text-primary hover:underline">
                        {selectedEvent.clientPhone}
                      </a>
                    </div>
                  </div>
                  {/* Quick Contact Actions */}
                  <div className="flex gap-2 pt-2 border-t mt-2">
                    <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                      <a href={`tel:${selectedEvent.clientPhone}`}>
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                      <a href={`sms:${selectedEvent.clientPhone}`}>
                        <Send className="w-4 h-4 mr-1" />
                        Text
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                      <a href={`mailto:${selectedEvent.clientEmail}`}>
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Appointment Details */}
              <Card>
                <CardContent className="p-3 sm:p-4 space-y-2">
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
                        <a href={selectedEvent.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Join Meeting
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Client Notes */}
              {selectedEvent.clientNotes && (
                <Card>
                  <CardContent className="p-3 sm:p-4 space-y-2">
                    <h3 className="font-semibold text-sm">Notes</h3>
                    <p className="text-sm text-muted-foreground">{selectedEvent.clientNotes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-3 border-t">
                {/* Primary Actions Row */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {canConfirm && (selectedEvent.status === 'REQUESTED' || selectedEvent.status === 'SCHEDULED') && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleConfirm}
                      disabled={confirming}
                      className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                    >
                      {confirming && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      Confirm
                    </Button>
                  )}
                  {canConfirm && selectedEvent.status !== 'CANCELLED' && selectedEvent.status !== 'COMPLETED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendIntakeForm}
                      disabled={sendingIntake}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 flex-1 sm:flex-none"
                    >
                      {sendingIntake ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Send className="mr-2 h-3 w-3" />}
                      Send Intake
                    </Button>
                  )}
                </div>

                {/* Secondary Actions Row */}
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
                  <Button variant="secondary" size="sm" onClick={() => setDialogOpen(false)} className="flex-1 sm:flex-none">
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
