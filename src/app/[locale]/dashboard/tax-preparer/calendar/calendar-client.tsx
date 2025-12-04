'use client';

/**
 * Tax Preparer Calendar Client Component
 * Interactive calendar display with appointment management
 */

import React, { useState } from 'react';
import { CalendarView } from '@/components/calendar/CalendarView';
import { Calendar, Settings, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Appointment {
  id: string;
  clientName: string;
  scheduledFor: string;
  scheduledEnd: string;
  status: string;
  subject?: string;
  type: string;
}

interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  bookingEnabled: boolean;
  allowPhoneBookings: boolean;
  allowVideoBookings: boolean;
  allowInPersonBookings: boolean;
  requireApprovalForBookings: boolean;
  customBookingMessage: string | null;
  bookingCalendarColor: string | null;
}

interface TaxPreparerCalendarClientProps {
  profile: Profile;
}

export default function TaxPreparerCalendarClient({ profile }: TaxPreparerCalendarClientProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    // TODO: Open appointment details modal
  };

  const handleDateClick = (date: Date) => {
    // TODO: Open booking modal for this date
    console.log('Date clicked:', date);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              My Calendar
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your appointments and availability
            </p>
          </div>

          <Link
            href="/dashboard/tax-preparer/calendar/settings"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Availability Settings
          </Link>
        </div>

        {/* Booking Status Banner */}
        {!profile.bookingEnabled && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Booking Disabled</p>
              <p className="text-sm text-yellow-700">
                You are not currently accepting new appointments. Enable booking in{' '}
                <Link href="/dashboard/tax-preparer/calendar/settings" className="underline">
                  settings
                </Link>
                .
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-lg shadow-sm">
        <CalendarView
          preparerId={profile.id}
          onAppointmentClick={handleAppointmentClick}
          onDateClick={handleDateClick}
        />
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Booking Status</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {profile.bookingEnabled ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${profile.bookingEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Calendar className={`w-6 h-6 ${profile.bookingEnabled ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approval Mode</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {profile.requireApprovalForBookings ? 'Manual' : 'Auto'}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {profile.requireApprovalForBookings
              ? 'You approve each booking'
              : 'Bookings are automatically confirmed'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Booking Types</p>
              <div className="flex gap-2 mt-2">
                {profile.allowPhoneBookings && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Phone</span>
                )}
                {profile.allowVideoBookings && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Video</span>
                )}
                {profile.allowInPersonBookings && (
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">In-Person</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Appointment Details (Simple) */}
      {selectedAppointment && (
        <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Selected Appointment</h3>
          <p className="text-sm text-blue-800">
            <strong>Client:</strong> {selectedAppointment.clientName}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Time:</strong> {new Date(selectedAppointment.scheduledFor).toLocaleString()}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Status:</strong> {selectedAppointment.status}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Type:</strong> {selectedAppointment.type}
          </p>
          <button
            onClick={() => setSelectedAppointment(null)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
