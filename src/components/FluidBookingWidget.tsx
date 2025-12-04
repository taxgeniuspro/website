'use client';

/**
 * Fluid Booking Widget - Calendly Replacement
 * Complete booking interface for scheduling appointments with tax preparers
 */

import React, { useState } from 'react';
import { AvailabilitySlotPicker } from './calendar/AvailabilitySlotPicker';
import { Calendar, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface TimeSlot {
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
}

interface FluidBookingWidgetProps {
  preparerId: string;
  preparerName?: string;
  clientInfo: ClientInfo;
  appointmentType?: 'PHONE_CALL' | 'VIDEO_CALL' | 'IN_PERSON' | 'CONSULTATION' | 'FOLLOW_UP';
  duration?: number; // minutes
  serviceId?: string;
  source?: string; // 'preparer_app', 'tax_intake', etc.
  onBookingComplete?: (appointmentId: string) => void;
  customMessage?: string;
}

export default function FluidBookingWidget({
  preparerId,
  preparerName,
  clientInfo,
  appointmentType = 'CONSULTATION',
  duration = 30,
  serviceId,
  source = 'preparer_app',
  onBookingComplete,
  customMessage,
}: FluidBookingWidgetProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ slot: TimeSlot; date: Date } | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const handleBooking = async () => {
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Construct the scheduled date/time from the selected slot and date
      const scheduledFor = new Date(selectedSlot.date);
      const [hours, minutes] = selectedSlot.slot.startTime.split(':');
      scheduledFor.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      const response = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: clientInfo.name,
          clientEmail: clientInfo.email,
          clientPhone: clientInfo.phone,
          appointmentType,
          scheduledFor: scheduledFor.toISOString(),
          duration,
          serviceId,
          notes,
          source,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book appointment');
      }

      setSuccess(true);
      setAppointmentId(data.appointmentId);
      onBookingComplete?.(data.appointmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Scheduled!</h2>

          <p className="text-gray-600 mb-6">
            Your appointment has been successfully scheduled{preparerName && ` with ${preparerName}`}.
            You will receive a confirmation email shortly.
          </p>

          {selectedSlot && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-blue-900 mb-1">Appointment Details:</p>
              <p className="text-blue-800">
                {selectedSlot.date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-blue-800 font-semibold">
                {selectedSlot.slot.startTime} - {selectedSlot.slot.endTime}
              </p>
            </div>
          )}

          {appointmentId && (
            <p className="text-xs text-gray-500">
              Reference ID: {appointmentId}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Main booking interface
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <Calendar className="w-7 h-7 text-blue-600" />
          Schedule Your Appointment
        </h2>

        {preparerName && (
          <p className="text-gray-600">
            Book a meeting with <span className="font-semibold">{preparerName}</span>
          </p>
        )}

        {customMessage && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-900">{customMessage}</p>
          </div>
        )}
      </div>

      {/* Client Info Display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Booking for:</span> {clientInfo.name}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Email:</span> {clientInfo.email}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Phone:</span> {clientInfo.phone}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Booking Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Availability Slot Picker */}
      <div className="mb-6">
        <AvailabilitySlotPicker
          preparerId={preparerId}
          duration={duration}
          serviceId={serviceId}
          onSlotSelect={(slot, date) => setSelectedSlot({ slot, date })}
          selectedSlot={selectedSlot}
        />
      </div>

      {/* Notes (Optional) */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Is there anything you'd like us to know before the appointment?"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>

      {/* Book Button */}
      <button
        onClick={handleBooking}
        disabled={!selectedSlot || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Booking Appointment...
          </>
        ) : (
          <>
            <Calendar className="w-5 h-5" />
            Confirm Appointment
          </>
        )}
      </button>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        By booking this appointment, you agree to receive email and SMS notifications about your appointment.
      </p>
    </div>
  );
}
