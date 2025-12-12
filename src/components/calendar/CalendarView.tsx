'use client';

/**
 * Fluid Booking - Calendar View Component
 * Responsive calendar interface for tax preparers
 * Mobile-first design with agenda view for small screens
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Phone,
  MapPin,
  List,
  Grid3X3,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  clientName: string;
  scheduledFor: string;
  scheduledEnd: string;
  status: string;
  subject?: string;
  type: string;
}

interface CalendarViewProps {
  preparerId: string;
  onAppointmentClick?: (appointment: Appointment) => void;
  onDateClick?: (date: Date) => void;
}

interface DayAvailability {
  available: number;
  total: number;
  status: 'available' | 'limited' | 'full' | 'unavailable' | 'disabled' | 'past';
}

type ViewMode = 'month' | 'agenda';

export function CalendarView({ preparerId, onAppointmentClick, onDateClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dayAvailability, setDayAvailability] = useState<Record<string, DayAvailability>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Default to agenda view on mobile
      if (window.innerWidth < 768) {
        setViewMode('agenda');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadAppointments();
    loadDayAvailability();
  }, [currentDate, preparerId]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(addMonths(currentDate, 1));

      const response = await fetch(
        `/api/preparers/${preparerId}/schedule?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDayAvailability = async () => {
    try {
      const monthStr = format(currentDate, 'yyyy-MM');
      const response = await fetch(
        `/api/appointments/day-availability?preparerId=${preparerId}&month=${monthStr}`
      );

      if (response.ok) {
        const data = await response.json();
        setDayAvailability(data.availability || {});
      }
    } catch (error) {
      console.error('Failed to load day availability:', error);
    }
  };

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getAppointmentIcon = (type: string) => {
    switch (type) {
      case 'VIDEO_CALL':
      case 'CONSULTATION':
        return <Video className="w-3.5 h-3.5" />;
      case 'PHONE_CALL':
      case 'FOLLOW_UP':
        return <Phone className="w-3.5 h-3.5" />;
      case 'IN_PERSON':
        return <MapPin className="w-3.5 h-3.5" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'PENDING_APPROVAL':
      case 'REQUESTED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getAvailabilityDot = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const availability = dayAvailability[dateStr];
    if (!availability) return null;

    const colors: Record<string, string> = {
      available: 'bg-green-500',
      limited: 'bg-yellow-500',
      full: 'bg-red-500',
      unavailable: 'bg-gray-400',
      disabled: 'bg-gray-400',
      past: 'bg-gray-300',
    };

    return (
      <div
        className={cn('w-1.5 h-1.5 rounded-full', colors[availability.status] || 'bg-gray-400')}
        title={`${availability.status}: ${availability.available}/${availability.total} slots`}
      />
    );
  };

  // Generate calendar days including padding for week alignment
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  // Get appointments for a specific date
  const getDayAppointments = (date: Date) => {
    return appointments.filter((appt) => {
      const apptDate = parseISO(appt.scheduledFor);
      return isSameDay(apptDate, date);
    });
  };

  // Get appointments grouped by date for agenda view
  const agendaAppointments = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    return appointments
      .filter((appt) => {
        const apptDate = parseISO(appt.scheduledFor);
        return apptDate >= monthStart && apptDate <= monthEnd;
      })
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  }, [appointments, currentDate]);

  // Group appointments by date for agenda
  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    agendaAppointments.forEach((appt) => {
      const dateKey = format(parseISO(appt.scheduledFor), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(appt);
    });
    return groups;
  }, [agendaAppointments]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
    // On mobile, switch to showing that day's appointments
    if (isMobile) {
      setViewMode('agenda');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 md:h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border">
      {/* Calendar Header */}
      <div className="p-3 md:p-4 border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg md:text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                  viewMode === 'month'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Month</span>
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                  viewMode === 'agenda'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Agenda</span>
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToToday}
                className="px-2.5 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 rounded-md transition-colors"
              >
                Today
              </button>
              <div className="flex items-center border rounded-md">
                <button
                  onClick={previousMonth}
                  className="p-1.5 hover:bg-muted rounded-l-md transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 hover:bg-muted rounded-r-md border-l transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Summary */}
        <div className="mt-3 flex items-center gap-3 md:gap-4 text-xs text-muted-foreground overflow-x-auto">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>
              {appointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length} Confirmed
            </span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>
              {appointments.filter((a) => a.status === 'PENDING_APPROVAL' || a.status === 'REQUESTED').length} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Body */}
      {viewMode === 'month' ? (
        <div className="p-2 md:p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div
                key={i}
                className="text-center text-[10px] md:text-xs font-medium text-muted-foreground py-1 md:py-2"
              >
                <span className="md:hidden">{day}</span>
                <span className="hidden md:inline">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
                </span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, i) => {
              const dayAppointments = getDayAppointments(date);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const dateStr = format(date, 'yyyy-MM-dd');
              const availability = dayAvailability[dateStr];
              const isFull = availability?.status === 'full';
              const isUnavailable = availability?.status === 'unavailable' || availability?.status === 'disabled';

              return (
                <button
                  key={i}
                  onClick={() => handleDateClick(date)}
                  className={cn(
                    'relative min-h-[44px] md:min-h-[80px] lg:min-h-[100px] p-1 md:p-2 rounded-md transition-colors text-left',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                    !isCurrentMonth && 'opacity-40',
                    isToday(date) && 'ring-2 ring-primary ring-offset-1',
                    isSelected && 'bg-primary/10',
                    isFull && 'bg-red-50 dark:bg-red-900/10',
                    isUnavailable && 'bg-muted/50',
                    !isSelected && !isFull && !isUnavailable && 'hover:bg-muted/50'
                  )}
                >
                  {/* Date Number & Availability Dot */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs md:text-sm font-medium',
                        isToday(date) && 'text-primary font-bold',
                        !isCurrentMonth && 'text-muted-foreground',
                        isUnavailable && 'text-muted-foreground'
                      )}
                    >
                      {format(date, 'd')}
                    </span>
                    {getAvailabilityDot(date)}
                  </div>

                  {/* Appointments - Desktop */}
                  <div className="hidden md:block mt-1 space-y-0.5">
                    {dayAppointments.slice(0, 2).map((appt) => (
                      <div
                        key={appt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick?.(appt);
                        }}
                        className={cn(
                          'flex items-center gap-1 px-1 py-0.5 rounded text-[10px] lg:text-xs border cursor-pointer truncate',
                          getStatusColor(appt.status)
                        )}
                        title={`${appt.clientName} - ${format(parseISO(appt.scheduledFor), 'h:mm a')}`}
                      >
                        {getAppointmentIcon(appt.type)}
                        <span className="truncate">{format(parseISO(appt.scheduledFor), 'h:mm')}</span>
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayAppointments.length - 2} more
                      </div>
                    )}
                  </div>

                  {/* Appointments Count - Mobile */}
                  {dayAppointments.length > 0 && (
                    <div className="md:hidden absolute bottom-1 left-1/2 -translate-x-1/2">
                      <div className="flex gap-0.5">
                        {dayAppointments.slice(0, 3).map((appt, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              appt.status === 'CONFIRMED' || appt.status === 'SCHEDULED'
                                ? 'bg-green-500'
                                : appt.status === 'PENDING_APPROVAL' || appt.status === 'REQUESTED'
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-400'
                            )}
                          />
                        ))}
                        {dayAppointments.length > 3 && (
                          <span className="text-[8px] text-muted-foreground">+</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda View */
        <div className="p-3 md:p-4 max-h-[60vh] overflow-y-auto">
          {Object.keys(groupedAppointments).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground font-medium">No appointments this month</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Your schedule is clear for {format(currentDate, 'MMMM yyyy')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedAppointments).map(([dateKey, dayAppts]) => {
                const date = parseISO(dateKey);
                return (
                  <div key={dateKey}>
                    {/* Date Header */}
                    <div
                      className={cn(
                        'sticky top-0 bg-card/95 backdrop-blur-sm py-2 border-b mb-2 z-10',
                        isToday(date) && 'text-primary'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {format(date, 'EEEE, MMM d')}
                        </span>
                        {isToday(date) && (
                          <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Appointments List */}
                    <div className="space-y-2">
                      {dayAppts.map((appt) => (
                        <button
                          key={appt.id}
                          onClick={() => onAppointmentClick?.(appt)}
                          className={cn(
                            'w-full text-left p-3 rounded-lg border transition-colors',
                            'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary',
                            getStatusColor(appt.status)
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex-shrink-0 mt-0.5">
                                {getAppointmentIcon(appt.type)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {appt.clientName}
                                </p>
                                {appt.subject && (
                                  <p className="text-xs opacity-80 truncate mt-0.5">
                                    {appt.subject}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-xs font-medium">
                                {format(parseISO(appt.scheduledFor), 'h:mm a')}
                              </p>
                              {appt.scheduledEnd && (
                                <p className="text-[10px] opacity-70">
                                  to {format(parseISO(appt.scheduledEnd), 'h:mm a')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                              {appt.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                              {appt.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend - Only show on month view */}
      {viewMode === 'month' && (
        <div className="px-3 md:px-4 py-2 md:py-3 border-t bg-muted/30 rounded-b-lg">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] md:text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Video className="w-3 h-3" />
              <span>Video</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              <span>Phone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              <span>In Person</span>
            </div>
            <div className="hidden sm:block w-px h-3 bg-border mx-1" />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span>Limited</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>Full</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
