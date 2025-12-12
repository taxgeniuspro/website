'use client';

/**
 * Tax Preparer Calendar Client Component
 * Interactive calendar display with appointment management
 * Responsive design for mobile, tablet, and desktop
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
  Video,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'PENDING_APPROVAL':
      case 'REQUESTED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PHONE_CALL':
        return <Phone className="w-4 h-4" />;
      case 'VIDEO_CALL':
        return <Video className="w-4 h-4" />;
      case 'IN_PERSON':
        return <MapPin className="w-4 h-4" />;
      case 'CONSULTATION':
        return <Calendar className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  return (
    <div className="px-3 py-4 md:px-6 md:py-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header - Responsive */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2 md:gap-3">
              <Calendar className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-primary" />
              My Calendar
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Manage your appointments and availability
            </p>
          </div>

          <Link
            href="/dashboard/tax-preparer/settings"
            className="inline-flex items-center justify-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-card border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Availability</span> Settings
          </Link>
        </div>

        {/* Booking Status Banner */}
        {!profile.bookingEnabled && (
          <div className="mt-3 md:mt-4 p-3 md:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2 md:gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-200 text-sm md:text-base">Booking Disabled</p>
              <p className="text-xs md:text-sm text-yellow-700 dark:text-yellow-400">
                You are not currently accepting new appointments.{' '}
                <Link href="/dashboard/tax-preparer/settings" className="underline font-medium">
                  Enable in settings
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Calendar View */}
      <div className="bg-card rounded-lg shadow-sm">
        <CalendarView
          preparerId={profile.id}
          onAppointmentClick={handleAppointmentClick}
          onDateClick={handleDateClick}
        />
      </div>

      {/* Quick Stats - Responsive Grid */}
      <div className="mt-4 md:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {/* Booking Status */}
        <div className="bg-card p-4 md:p-5 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Booking Status</p>
              <p className="text-lg md:text-xl lg:text-2xl font-bold mt-0.5 md:mt-1">
                {profile.bookingEnabled ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className={cn(
              'w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center',
              profile.bookingEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
            )}>
              <Calendar className={cn(
                'w-5 h-5 md:w-6 md:h-6',
                profile.bookingEnabled ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'
              )} />
            </div>
          </div>
        </div>

        {/* Approval Mode */}
        <div className="bg-card p-4 md:p-5 rounded-lg shadow-sm border">
          <p className="text-xs md:text-sm text-muted-foreground">Approval Mode</p>
          <p className="text-lg md:text-xl lg:text-2xl font-bold mt-0.5 md:mt-1">
            {profile.requireApprovalForBookings ? 'Manual' : 'Auto'}
          </p>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2">
            {profile.requireApprovalForBookings
              ? 'You approve each booking'
              : 'Bookings auto-confirmed'}
          </p>
        </div>

        {/* Booking Types */}
        <div className="bg-card p-4 md:p-5 rounded-lg shadow-sm border">
          <p className="text-xs md:text-sm text-muted-foreground">Booking Types</p>
          <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2">
            {profile.allowPhoneBookings && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] md:text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                <Phone className="w-3 h-3" />
                Phone
              </span>
            )}
            {profile.allowVideoBookings && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] md:text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded">
                <Video className="w-3 h-3" />
                Video
              </span>
            )}
            {profile.allowInPersonBookings && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] md:text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                <MapPin className="w-3 h-3" />
                In-Person
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal - Mobile Optimized */}
      {showModal && appointmentDetails && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-card rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 md:p-6 rounded-t-2xl sm:rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  {getTypeIcon(appointmentDetails.type)}
                  <h2 className="text-lg md:text-xl font-bold">Appointment Details</h2>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
              <div className="mt-2 md:mt-3 flex items-center gap-2 flex-wrap">
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', getStatusColor(appointmentDetails.status))}>
                  {appointmentDetails.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs md:text-sm opacity-90">
                  {appointmentDetails.type.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Client Information */}
            <div className="p-4 md:p-6 border-b">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Client Information
              </h3>
              <div className="space-y-2 md:space-y-3">
                <p className="text-base md:text-lg font-bold">{appointmentDetails.clientName}</p>
                {appointmentDetails.clientEmail && (
                  <a
                    href={`mailto:${appointmentDetails.clientEmail}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {appointmentDetails.clientEmail}
                  </a>
                )}
                {appointmentDetails.clientPhone && (
                  <a
                    href={`tel:${formatPhoneForCall(appointmentDetails.clientPhone)}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {appointmentDetails.clientPhone}
                  </a>
                )}
              </div>

              {/* Quick Action Buttons - Full width on mobile */}
              <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {appointmentDetails.clientPhone && (
                  <>
                    <a
                      href={`tel:${formatPhoneForCall(appointmentDetails.clientPhone)}`}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                    <a
                      href={`sms:${formatPhoneForCall(appointmentDetails.clientPhone)}`}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Text
                    </a>
                  </>
                )}
                {appointmentDetails.clientEmail && (
                  <a
                    href={`mailto:${appointmentDetails.clientEmail}`}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium',
                      !appointmentDetails.clientPhone && 'col-span-2'
                    )}
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </a>
                )}
              </div>
            </div>

            {/* Appointment Time */}
            <div className="p-4 md:p-6 border-b">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Schedule
              </h3>
              <div className="space-y-1.5 md:space-y-2 text-sm md:text-base">
                <p>
                  <span className="font-semibold">Date:</span>{' '}
                  {new Date(appointmentDetails.scheduledFor).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p>
                  <span className="font-semibold">Time:</span>{' '}
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
              <div className="p-4 md:p-6 border-b">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Client Notes
                </h3>
                <p className="text-sm bg-muted p-3 md:p-4 rounded-lg italic">
                  &quot;{appointmentDetails.clientNotes}&quot;
                </p>
              </div>
            )}

            {/* Footer Actions */}
            <div className="p-4 md:p-6 bg-muted/30">
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                <button
                  onClick={closeModal}
                  className="w-full sm:w-auto px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Close
                </button>
                {appointmentDetails.clientId && (
                  <Link
                    href={`/dashboard/tax-preparer/leads?search=${encodeURIComponent(appointmentDetails.clientEmail || appointmentDetails.clientName)}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Client Record
                  </Link>
                )}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-3 text-center">
                Appointment ID: {appointmentDetails.id}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loadingDetails && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-card p-5 md:p-6 rounded-lg shadow-lg text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 text-sm text-muted-foreground">Loading appointment...</p>
          </div>
        </div>
      )}
    </div>
  );
}
