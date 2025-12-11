'use client';

/**
 * Tax Preparer Calendar Client Component
 * Interactive calendar display with appointment management
 */

import React, { useState, useEffect } from 'react';
import { CalendarView } from '@/components/calendar/CalendarView';
import {
  Calendar,
  Settings,
  AlertCircle,
  X,
  Phone,
  Mail,
  MessageSquare,
  User,
  Clock,
  FileText,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface Appointment {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  scheduledFor: string;
  scheduledEnd: string;
  status: string;
  subject?: string;
  type: string;
  clientNotes?: string;
  clientId?: string;
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
  const [appointmentDetails, setAppointmentDetails] = useState<Appointment | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Fetch full appointment details when an appointment is selected
  useEffect(() => {
    async function fetchAppointmentDetails() {
      if (!selectedAppointment?.id) return;

      setLoadingDetails(true);
      try {
        const response = await fetch(`/api/appointments/${selectedAppointment.id}`);
        if (response.ok) {
          const data = await response.json();
          setAppointmentDetails(data.appointment);
          setShowModal(true);
        }
      } catch (error) {
        console.error('Failed to fetch appointment details:', error);
        // Still show modal with basic info
        setAppointmentDetails(selectedAppointment);
        setShowModal(true);
      } finally {
        setLoadingDetails(false);
      }
    }

    if (selectedAppointment) {
      fetchAppointmentDetails();
    }
  }, [selectedAppointment]);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
    setAppointmentDetails(null);
  };

  const formatPhoneForCall = (phone: string) => {
    return phone.replace(/[^+\d]/g, '');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'SCHEDULED':
        return 'bg-green-100 text-green-800';
      case 'PENDING_APPROVAL':
      case 'REQUESTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PHONE_CALL':
        return <Phone className="w-4 h-4" />;
      case 'VIDEO_CALL':
      case 'CONSULTATION':
        return <Calendar className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
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

      {/* Appointment Detail Modal */}
      {showModal && appointmentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getTypeIcon(appointmentDetails.type)}
                  <h2 className="text-xl font-bold">Appointment Details</h2>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(appointmentDetails.status)}`}>
                  {appointmentDetails.status.replace(/_/g, ' ')}
                </span>
                <span className="text-sm opacity-90">
                  {appointmentDetails.type.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Client Information */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Client Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-bold text-gray-900">{appointmentDetails.clientName}</p>
                </div>
                {appointmentDetails.clientEmail && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a
                      href={`mailto:${appointmentDetails.clientEmail}`}
                      className="hover:text-green-600 hover:underline"
                    >
                      {appointmentDetails.clientEmail}
                    </a>
                  </div>
                )}
                {appointmentDetails.clientPhone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a
                      href={`tel:${formatPhoneForCall(appointmentDetails.clientPhone)}`}
                      className="hover:text-green-600 hover:underline"
                    >
                      {appointmentDetails.clientPhone}
                    </a>
                  </div>
                )}
              </div>

              {/* Quick Action Buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                {appointmentDetails.clientPhone && (
                  <>
                    <a
                      href={`tel:${formatPhoneForCall(appointmentDetails.clientPhone)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                    <a
                      href={`sms:${formatPhoneForCall(appointmentDetails.clientPhone)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Text
                    </a>
                  </>
                )}
                {appointmentDetails.clientEmail && (
                  <a
                    href={`mailto:${appointmentDetails.clientEmail}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-400 transition-colors text-sm font-medium"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </a>
                )}
              </div>
            </div>

            {/* Appointment Time */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Schedule
              </h3>
              <div className="space-y-2">
                <p className="text-gray-900">
                  <strong>Date:</strong>{' '}
                  {new Date(appointmentDetails.scheduledFor).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-gray-900">
                  <strong>Time:</strong>{' '}
                  {new Date(appointmentDetails.scheduledFor).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                  {appointmentDetails.scheduledEnd && (
                    <>
                      {' - '}
                      {new Date(appointmentDetails.scheduledEnd).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Client Notes */}
            {appointmentDetails.clientNotes && (
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Client Notes
                </h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg italic">
                  &quot;{appointmentDetails.clientNotes}&quot;
                </p>
              </div>
            )}

            {/* Footer Actions */}
            <div className="p-6 bg-gray-50 rounded-b-xl">
              <div className="flex flex-wrap gap-3 justify-end">
                {appointmentDetails.clientId && (
                  <Link
                    href={`/dashboard/tax-preparer/leads?search=${encodeURIComponent(appointmentDetails.clientEmail || appointmentDetails.clientName)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Client Record
                  </Link>
                )}
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Appointment ID: {appointmentDetails.id}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loadingDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading appointment details...</p>
          </div>
        </div>
      )}
    </div>
  );
}
