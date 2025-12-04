'use client';

/**
 * Fluid Booking - Availability Slot Picker
 * Displays available time slots for booking appointments
 */

import React, { useState, useEffect } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import { Calendar, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface TimeSlot {
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

interface AvailabilitySlotPickerProps {
  preparerId: string;
  duration: number; // minutes
  serviceId?: string;
  onSlotSelect: (slot: TimeSlot, date: Date) => void;
  selectedSlot?: { slot: TimeSlot; date: Date } | null;
}

export function AvailabilitySlotPicker({
  preparerId,
  duration,
  serviceId,
  onSlotSelect,
  selectedSlot,
}: AvailabilitySlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate next 7 days for date picker
  const generateDateOptions = () => {
    const dates: Date[] = [];
    for (let i = 0; i < 14; i++) {
      dates.push(addDays(startOfDay(new Date()), i));
    }
    return dates;
  };

  const dateOptions = generateDateOptions();

  useEffect(() => {
    loadAvailableSlots();
  }, [selectedDate, preparerId, duration, serviceId]);

  const loadAvailableSlots = async () => {
    setLoading(true);
    setError(null);

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(
        `/api/appointments/available-slots?preparerId=${preparerId}&date=${dateStr}&duration=${duration}${serviceId ? `&serviceId=${serviceId}` : ''}`
      );

      if (!response.ok) {
        throw new Error('Failed to load available slots');
      }

      const data = await response.json();
      setAvailableSlots(data.slots || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load slots');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    const newDate = addDays(selectedDate, -7);
    if (newDate >= startOfDay(new Date())) {
      setSelectedDate(newDate);
    }
  };

  const handleNextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (date: Date) => {
    return date < startOfDay(new Date());
  };

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Select Date
        </label>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousWeek}
            disabled={isPast(addDays(selectedDate, -7))}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-2">
              {dateOptions.map((date) => {
                const isSelected =
                  format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const todayDate = isToday(date);
                const pastDate = isPast(date);

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    disabled={pastDate}
                    className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : pastDate
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="text-sm font-medium">
                      {format(date, 'EEE')}
                    </div>
                    <div className={`text-lg font-bold ${todayDate && !isSelected ? 'text-blue-600' : ''}`}>
                      {format(date, 'd')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(date, 'MMM')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleNextWeek}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Time Slots */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Available Times
        </label>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading available times...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-md">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 font-medium">No available times</p>
            <p className="text-sm text-gray-500 mt-1">
              Please select a different date
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {availableSlots.map((slot) => {
              const isSelected =
                selectedSlot &&
                selectedSlot.slot.startTime === slot.startTime &&
                format(selectedSlot.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

              return (
                <button
                  key={slot.startTime}
                  onClick={() => onSlotSelect(slot, selectedDate)}
                  className={`px-4 py-3 rounded-md font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white border-2 border-blue-600'
                      : 'bg-white border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-900'
                  }`}
                >
                  {slot.startTime}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Slot Summary */}
      {selectedSlot && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 text-blue-900">
            <Clock className="w-5 h-5" />
            <div>
              <p className="font-medium">
                {format(selectedSlot.date, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm">
                {selectedSlot.slot.startTime} - {selectedSlot.slot.endTime}
                {duration && ` (${duration} minutes)`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
