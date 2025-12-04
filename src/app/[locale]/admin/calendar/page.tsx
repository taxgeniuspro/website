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
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="w-8 h-8" />
              Calendar & Appointments
            </h1>
            {canCreate && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Appointment
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">Manage appointments and schedules</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
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
          <TabsList>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {requestedAppointments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {requestedAppointments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>Interactive calendar view of all appointments</CardDescription>
              </CardHeader>
              <CardContent>
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
              <CardHeader>
                <CardTitle>All Appointments</CardTitle>
                <CardDescription>Complete list of all scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No appointments scheduled</p>
                    </div>
                  ) : (
                    appointments.map((apt) => (
                      <div key={apt.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {apt.type && typeIcons[apt.type]}
                              <p className="font-medium">{apt.subject || apt.type}</p>
                              <Badge variant={statusColors[apt.status] as any}>{apt.status}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {apt.clientName}
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {apt.clientPhone}
                              </div>
                            </div>
                            {apt.scheduledFor && (
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="w-3 h-3" />
                                {new Date(apt.scheduledFor).toLocaleString()}
                                {apt.duration && ` (${apt.duration} mins)`}
                              </div>
                            )}
                            {apt.location && (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="w-3 h-3" />
                                {apt.location}
                              </div>
                            )}
                            {apt.meetingLink && (
                              <div className="flex items-center gap-1 text-sm">
                                <Video className="w-3 h-3" />
                                Meeting link available
                              </div>
                            )}
                          </div>
                          <div className="space-x-2">
                            {apt.status === 'REQUESTED' && canCreate && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleScheduleClick(apt)}
                              >
                                Schedule
                              </Button>
                            )}
                          </div>
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
              <CardHeader>
                <CardTitle>Appointment Requests</CardTitle>
                <CardDescription>Pending appointment requests that need scheduling</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requestedAppointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No pending requests</p>
                    </div>
                  ) : (
                    requestedAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950/20"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">REQUEST</Badge>
                              <p className="font-medium">{apt.clientName}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {apt.clientNotes || 'No notes provided'}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {apt.clientEmail}
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {apt.clientPhone}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Requested: {new Date(apt.requestedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="space-x-2">
                            {canCreate && (
                              <Button size="sm" onClick={() => handleScheduleClick(apt)}>
                                Schedule
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleContactClick(apt)}
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
