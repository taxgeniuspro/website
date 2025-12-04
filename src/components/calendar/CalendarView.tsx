'use client';

/**
 * Fluid Booking - Calendar View Component
 * Displays appointments in a calendar interface for tax preparers
 */

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Clock, Video, Phone, MapPin } from 'lucide-react';

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

export function CalendarView({ preparerId, onAppointmentClick, onDateClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    loadAppointments();
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

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const getAppointmentIcon = (type: string) => {
    switch (type) {
      case 'VIDEO_CALL':
      case 'CONSULTATION':
        return <Video className="w-3 h-3" />;
      case 'PHONE_CALL':
      case 'FOLLOW_UP':
        return <Phone className="w-3 h-3" />;
      case 'IN_PERSON':
        return <MapPin className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING_APPROVAL':
      case 'REQUESTED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Generate calendar grid for month view
  const generateMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days: Date[] = [];

    // Get all days in the month
    let day = monthStart;
    while (day <= monthEnd) {
      days.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }

    return days;
  };

  const getDayAppointments = (date: Date) => {
    return appointments.filter((appt) => {
      const apptDate = new Date(appt.scheduledFor);
      return (
        apptDate.getDate() === date.getDate() &&
        apptDate.getMonth() === date.getMonth() &&
        apptDate.getFullYear() === date.getFullYear()
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Calendar Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {format(currentDate, 'MMMM yyyy')}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={today}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Today
            </button>

            <div className="flex items-center gap-1 border border-gray-300 rounded-md">
              <button
                onClick={previousMonth}
                className="p-1.5 hover:bg-gray-50 rounded-l-md"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-gray-50 rounded-r-md border-l border-gray-300"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Appointment Summary */}
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>
              {appointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length}{' '}
              Confirmed
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>
              {appointments.filter((a) => a.status === 'PENDING_APPROVAL' || a.status === 'REQUESTED').length}{' '}
              Pending
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Offset for start of month */}
          {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square"></div>
          ))}

          {/* Days */}
          {generateMonthView().map((date) => {
            const dayAppointments = getDayAppointments(date);
            const isToday =
              date.getDate() === new Date().getDate() &&
              date.getMonth() === new Date().getMonth() &&
              date.getFullYear() === new Date().getFullYear();

            return (
              <div
                key={date.toISOString()}
                className={`aspect-square border rounded-lg p-2 cursor-pointer transition-colors ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => onDateClick?.(date)}
              >
                <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {date.getDate()}
                </div>

                {/* Appointments for this day */}
                <div className="mt-1 space-y-1">
                  {dayAppointments.slice(0, 3).map((appt) => (
                    <button
                      key={appt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick?.(appt);
                      }}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-xs border ${getStatusColor(appt.status)} flex items-center gap-1`}
                      title={`${appt.clientName} - ${format(new Date(appt.scheduledFor), 'h:mm a')}`}
                    >
                      {getAppointmentIcon(appt.type)}
                      <span className="truncate">{format(new Date(appt.scheduledFor), 'h:mm a')}</span>
                    </button>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500 px-1.5">+{dayAppointments.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            <span>Video Call</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>Phone Call</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>In Person</span>
          </div>
        </div>
      </div>
    </div>
  );
}
