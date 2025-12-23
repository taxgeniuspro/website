'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Video, Phone, User, AlertCircle, CheckCircle, XCircle, CalendarX } from 'lucide-react';

interface AppointmentData {
  id: string;
  clientName: string;
  status: string;
  type: string;
  scheduledFor: string;
  scheduledEnd: string;
  duration: number;
  timezone: string | null;
  subject: string | null;
  meetingLink: string | null;
  location: string | null;
  preparer: {
    name: string;
    avatarUrl: string | null;
  } | null;
  service: {
    name: string;
    duration: number;
  } | null;
  canReschedule: boolean;
  canCancel: boolean;
}

type ViewState = 'loading' | 'details' | 'reschedule' | 'cancel' | 'success' | 'error';

export default function ManageAppointmentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const appointmentId = params.id as string;
  const token = searchParams.get('token');

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Reschedule form state
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Cancel form state
  const [cancelReason, setCancelReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing management link. Please use the link from your confirmation email.');
      setViewState('error');
      return;
    }

    fetchAppointment();
  }, [appointmentId, token]);

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/public?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load appointment');
        setViewState('error');
        return;
      }

      setAppointment(data);
      setViewState('details');

      // Pre-fill date/time for reschedule
      if (data.scheduledFor) {
        const date = new Date(data.scheduledFor);
        setNewDate(format(date, 'yyyy-MM-dd'));
        setNewTime(format(date, 'HH:mm'));
      }
    } catch {
      setError('Failed to load appointment details');
      setViewState('error');
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTime) {
      setError('Please select a new date and time');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const newScheduledFor = new Date(`${newDate}T${newTime}`).toISOString();

      const response = await fetch(`/api/appointments/${appointmentId}/public/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newScheduledFor, reason: rescheduleReason }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reschedule appointment');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage('Your appointment has been rescheduled successfully. You will receive a confirmation email shortly.');
      setViewState('success');
    } catch {
      setError('Failed to reschedule appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/public/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: cancelReason }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to cancel appointment');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage('Your appointment has been cancelled. You will receive a confirmation email shortly.');
      setViewState('success');
    } catch {
      setError('Failed to cancel appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO_CALL':
        return <Video className="w-5 h-5" />;
      case 'PHONE_CALL':
        return <Phone className="w-5 h-5" />;
      case 'IN_PERSON':
        return <MapPin className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      REQUESTED: 'bg-yellow-100 text-yellow-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  if (viewState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (viewState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Appointment</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (viewState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
          <p className="text-gray-600">{successMessage}</p>
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Your Appointment</h1>
          <p className="text-gray-600 mt-2">View, reschedule, or cancel your appointment</p>
        </div>

        {/* Appointment Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Status Banner */}
          <div className={`px-6 py-3 ${getStatusBadge(appointment.status)}`}>
            <span className="font-medium">Status: {appointment.status}</span>
          </div>

          {/* Appointment Details */}
          {viewState === 'details' && (
            <div className="p-6">
              <div className="space-y-4">
                {/* Date & Time */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {format(new Date(appointment.scheduledFor), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-gray-600">
                      {format(new Date(appointment.scheduledFor), 'h:mm a')} - {format(new Date(appointment.scheduledEnd), 'h:mm a')}
                      <span className="text-gray-400 ml-2">({appointment.duration} min)</span>
                    </p>
                  </div>
                </div>

                {/* Type */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getTypeIcon(appointment.type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {appointment.service?.name || formatType(appointment.type)}
                    </p>
                    {appointment.meetingLink && (
                      <a
                        href={appointment.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Join Meeting
                      </a>
                    )}
                    {appointment.location && (
                      <p className="text-gray-600 text-sm">{appointment.location}</p>
                    )}
                  </div>
                </div>

                {/* Preparer */}
                {appointment.preparer && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {appointment.preparer.avatarUrl ? (
                        <img
                          src={appointment.preparer.avatarUrl}
                          alt={appointment.preparer.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{appointment.preparer.name}</p>
                      <p className="text-gray-600 text-sm">Tax Preparer</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {(appointment.canReschedule || appointment.canCancel) && (
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  {appointment.canReschedule && (
                    <button
                      onClick={() => setViewState('reschedule')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                    >
                      <Clock className="w-5 h-5" />
                      Reschedule
                    </button>
                  )}
                  {appointment.canCancel && (
                    <button
                      onClick={() => setViewState('cancel')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium"
                    >
                      <CalendarX className="w-5 h-5" />
                      Cancel Appointment
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reschedule Form */}
          {viewState === 'reschedule' && (
            <form onSubmit={handleReschedule} className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Reschedule Appointment</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                  <textarea
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="Let us know why you need to reschedule..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setViewState('details');
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          )}

          {/* Cancel Form */}
          {viewState === 'cancel' && (
            <form onSubmit={handleCancel} className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Cancel Appointment</h2>

              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  Are you sure you want to cancel this appointment? This action cannot be undone.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for cancellation (optional)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Let us know why you need to cancel..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setViewState('details');
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          &copy; {new Date().getFullYear()} Tax Genius Pro. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function formatType(type: string): string {
  const labels: Record<string, string> = {
    PHONE_CALL: 'Phone Call',
    VIDEO_CALL: 'Video Call',
    IN_PERSON: 'In-Person Meeting',
    TAX_CONSULTATION: 'Tax Consultation',
    FOLLOW_UP: 'Follow-Up',
  };
  return labels[type] || type;
}
