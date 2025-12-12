'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { getUserPermissions, UserRole, type UserPermissions } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  Users,
  Plus,
  CalendarDays,
  User,
  Mail,
  Loader2,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import CalendarView from '@/components/CalendarView';
import AppointmentDialog from '@/components/AppointmentDialog';

const statusColors: Record<string, string> = {
  REQUESTED: 'secondary',
  SCHEDULED: 'default',
  CONFIRMED: 'success',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
  NO_SHOW: 'warning',
  RESCHEDULED: 'secondary',
};

const typeIcons: Record<string, React.ReactElement> = {
  PHONE_CALL: <Phone className="w-4 h-4" />,
  VIDEO_CALL: <Video className="w-4 h-4" />,
  IN_PERSON: <MapPin className="w-4 h-4" />,
  CONSULTATION: <Users className="w-4 h-4" />,
  FOLLOW_UP: <Clock className="w-4 h-4" />,
};

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoaded = status !== 'loading';

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedRequestAppointment, setSelectedRequestAppointment] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const role = user?.role as UserRole | undefined;
  const customPermissions = user?.permissions as Partial<UserPermissions> | undefined;
  const permissions = getUserPermissions(role || 'client', customPermissions);

  // Check main permission for page access
  useEffect(() => {
    if (isLoaded && (!user || !permissions.calendar)) {
      redirect('/forbidden');
    }
  }, [isLoaded, user, permissions]);

  // Extract micro-permissions for calendar features
  const canView = permissions.calendar_view ?? permissions.calendar;
  const canCreate = permissions.calendar_create ?? false;
  const canEdit = permissions.calendar_edit ?? false;
  const canConfirm = role === 'tax_preparer' || role === 'admin' || role === 'super_admin';

  // Fetch appointments
  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/appointments/list');

        if (!response.ok) {
          throw new Error('Failed to fetch appointments');
        }

        const data = await response.json();
        setAppointments(data.appointments || []);
      } catch (error) {
        logger.error('Error fetching appointments:', error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [isLoaded, user, refreshKey]);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    setCreateDialogOpen(false);
    setScheduleDialogOpen(false);
    setSelectedRequestAppointment(null);
  };

  const handleScheduleClick = (appointment: any) => {
    setSelectedRequestAppointment(appointment);
    setScheduleDialogOpen(true);
  };

  const handleContactClick = (appointment: any) => {
    // Open mailto link with pre-filled subject
    const subject = `Re: Appointment Request - ${appointment.clientName}`;
    const body = `Hello ${appointment.clientName},\n\nThank you for your appointment request...`;
    window.location.href = `mailto:${appointment.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Get today's appointments
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysAppointments = appointments.filter((apt) => {
    if (!apt.scheduledFor) return false;
    const scheduled = new Date(apt.scheduledFor);
    return scheduled >= today && scheduled < tomorrow;
  });

  // Get upcoming appointments
  const upcomingAppointments = appointments.filter((apt) => {
    if (!apt.scheduledFor) return false;
    const scheduled = new Date(apt.scheduledFor);
    return scheduled >= tomorrow;
  });

  // Get requested appointments (need scheduling)
  const requestedAppointments = appointments.filter((apt) => apt.status === 'REQUESTED');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-8">
        {/* Header - Mobile responsive */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8" />
                <span className="hidden sm:inline">Calendar & Appointments</span>
                <span className="sm:hidden">Calendar</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Manage appointments and schedules</p>
            </div>
            {canCreate && (
              <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Appointment
              </Button>
            )}
          </div>
        </div>

        {/* Stats - Responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaysAppointments.length}</div>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Requests</CardTitle>
              <Users className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requestedAppointments.length}</div>
              <p className="text-xs text-muted-foreground">Need scheduling</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
              <p className="text-xs text-muted-foreground">All appointments</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          {/* Tabs - Scrollable on mobile */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="calendar" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Calendar View</span>
                <span className="sm:hidden">Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">List View</span>
                <span className="sm:hidden">List</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-xs sm:text-sm">
                Requests
                {requestedAppointments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                    {requestedAppointments.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="calendar">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Calendar</CardTitle>
                <CardDescription className="text-xs md:text-sm">Interactive calendar view of all appointments</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-4 md:p-6">
                <CalendarView
                  appointments={appointments}
                  canCreate={canCreate}
                  canEdit={canEdit}
                  canConfirm={canConfirm}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">All Appointments</CardTitle>
                <CardDescription className="text-xs md:text-sm">Complete list of all scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                <div className="space-y-3 md:space-y-4">
                  {appointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No appointments scheduled</p>
                    </div>
                  ) : (
                    appointments.map((apt) => (
                      <div key={apt.id} className="border rounded-lg p-3 md:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {apt.type && typeIcons[apt.type]}
                              <p className="font-medium text-sm md:text-base truncate">{apt.subject || apt.type}</p>
                              <Badge variant={statusColors[apt.status] as any} className="text-xs">{apt.status}</Badge>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 shrink-0" />
                                <span className="truncate">{apt.clientName}</span>
                              </div>
                              <a href={`tel:${apt.clientPhone}`} className="flex items-center gap-1 text-primary hover:underline">
                                <Phone className="w-3 h-3 shrink-0" />
                                {apt.clientPhone}
                              </a>
                            </div>
                            {apt.scheduledFor && (
                              <div className="flex items-center gap-1 text-xs sm:text-sm">
                                <Clock className="w-3 h-3 shrink-0" />
                                {new Date(apt.scheduledFor).toLocaleString()}
                                {apt.duration && ` (${apt.duration} mins)`}
                              </div>
                            )}
                            {apt.location && (
                              <div className="flex items-center gap-1 text-xs sm:text-sm">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{apt.location}</span>
                              </div>
                            )}
                            {apt.meetingLink && (
                              <div className="flex items-center gap-1 text-xs sm:text-sm">
                                <Video className="w-3 h-3 shrink-0" />
                                <a href={apt.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  Join Meeting
                                </a>
                              </div>
                            )}
                          </div>
                          {apt.status === 'REQUESTED' && canCreate && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleScheduleClick(apt)}
                              className="w-full sm:w-auto"
                            >
                              Schedule
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Appointment Requests</CardTitle>
                <CardDescription className="text-xs md:text-sm">Pending appointment requests that need scheduling</CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                <div className="space-y-3 md:space-y-4">
                  {requestedAppointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No pending requests</p>
                    </div>
                  ) : (
                    requestedAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="border rounded-lg p-3 md:p-4 bg-yellow-50 dark:bg-yellow-950/20"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-xs">REQUEST</Badge>
                              <p className="font-medium text-sm md:text-base">{apt.clientName}</p>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {apt.clientNotes || 'No notes provided'}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm">
                              <a href={`mailto:${apt.clientEmail}`} className="flex items-center gap-1 text-primary hover:underline truncate">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{apt.clientEmail}</span>
                              </a>
                              <a href={`tel:${apt.clientPhone}`} className="flex items-center gap-1 text-primary hover:underline">
                                <Phone className="w-3 h-3 shrink-0" />
                                {apt.clientPhone}
                              </a>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Requested: {new Date(apt.requestedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            {canCreate && (
                              <Button size="sm" onClick={() => handleScheduleClick(apt)} className="flex-1 sm:flex-none">
                                Schedule
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleContactClick(apt)}
                              className="flex-1 sm:flex-none"
                            >
                              Contact
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Appointment Dialog */}
        <AppointmentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={handleSuccess}
          mode="create"
        />

        {/* Schedule Appointment Dialog */}
        {selectedRequestAppointment && (
          <AppointmentDialog
            open={scheduleDialogOpen}
            onOpenChange={setScheduleDialogOpen}
            onSuccess={handleSuccess}
            appointment={selectedRequestAppointment}
            mode="schedule"
          />
        )}
      </div>
    </div>
  );
}
