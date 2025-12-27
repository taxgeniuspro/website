'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/supabase/useSession';
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
  MoreVertical,
  Eye,
  Pencil,
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
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
  const canConfirm = role === 'tax_preparer' || role === 'admin' ;

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

        {/* Stats - Enhanced responsive grid with colored icons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mb-6 md:mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-4 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Today</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-full">
                <CalendarDays className="w-4 h-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
              <div className="text-2xl lg:text-3xl font-bold text-blue-600">{todaysAppointments.length}</div>
              <p className="text-xs text-muted-foreground mt-1 hidden lg:block">Scheduled for today</p>
              <p className="text-xs text-muted-foreground lg:hidden">Appointments</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-4 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Upcoming</CardTitle>
              <div className="p-2 bg-purple-500/10 rounded-full">
                <Clock className="w-4 h-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
              <div className="text-2xl lg:text-3xl font-bold text-purple-600">{upcomingAppointments.length}</div>
              <p className="text-xs text-muted-foreground mt-1 hidden lg:block">Coming this week</p>
              <p className="text-xs text-muted-foreground lg:hidden">This week</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-4 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Requests</CardTitle>
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
              <div className="text-2xl lg:text-3xl font-bold text-yellow-600">{requestedAppointments.length}</div>
              <p className="text-xs text-muted-foreground mt-1 hidden lg:block">Awaiting scheduling</p>
              <p className="text-xs text-muted-foreground lg:hidden">Need action</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-4 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Total</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-full">
                <Calendar className="w-4 h-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
              <div className="text-2xl lg:text-3xl font-bold text-green-600">{appointments.length}</div>
              <p className="text-xs text-muted-foreground mt-1 hidden lg:block">All time appointments</p>
              <p className="text-xs text-muted-foreground lg:hidden">All appts</p>
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
              <CardHeader className="p-4 lg:p-6 pb-2 lg:pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base lg:text-lg">All Appointments</CardTitle>
                    <CardDescription className="text-xs lg:text-sm mt-1">
                      {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} total
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-6 pt-0">
                {appointments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No appointments scheduled</p>
                    <p className="text-sm mt-1">Create your first appointment to get started</p>
                  </div>
                ) : (
                  <>
                    {/* ===== MOBILE VIEW (< 640px) - Stack Cards ===== */}
                    <div className="sm:hidden space-y-3">
                      {appointments.map((apt) => (
                        <div key={apt.id} className="border rounded-lg p-3 bg-card hover:border-primary/30 transition-colors">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                  {apt.clientName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{apt.clientName}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-xs px-1.5 py-0',
                                      apt.status === 'CONFIRMED' && 'bg-green-100 text-green-800 border-green-300',
                                      apt.status === 'SCHEDULED' && 'bg-blue-100 text-blue-800 border-blue-300',
                                      apt.status === 'REQUESTED' && 'bg-yellow-100 text-yellow-800 border-yellow-300',
                                      apt.status === 'CANCELLED' && 'bg-red-100 text-red-800 border-red-300',
                                      apt.status === 'COMPLETED' && 'bg-gray-100 text-gray-800 border-gray-300'
                                    )}
                                  >
                                    {apt.status}
                                  </Badge>
                                  {apt.type && <span>· {apt.type.replace('_', ' ')}</span>}
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                                {canEdit && <DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
                                {apt.meetingLink && (
                                  <DropdownMenuItem asChild>
                                    <a href={apt.meetingLink} target="_blank" rel="noopener noreferrer">
                                      <Video className="h-4 w-4 mr-2" />Join Meeting
                                    </a>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {/* Appointment Info */}
                          <div className="space-y-1 text-xs text-muted-foreground mb-3">
                            {apt.scheduledFor && (
                              <div className="flex items-center gap-1 text-foreground font-medium">
                                <Clock className="h-3 w-3 shrink-0 text-primary" />
                                {new Date(apt.scheduledFor).toLocaleDateString()} at {new Date(apt.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {apt.duration && <span className="text-muted-foreground">({apt.duration}m)</span>}
                              </div>
                            )}
                            {apt.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{apt.location}</span>
                              </div>
                            )}
                          </div>
                          {/* Quick Actions */}
                          <div className="flex gap-2 pt-2 border-t">
                            <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                              <a href={`tel:${apt.clientPhone}`}><Phone className="w-4 h-4 mr-1" />Call</a>
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                              <a href={`sms:${apt.clientPhone}`}><MessageCircle className="w-4 h-4 mr-1" />Text</a>
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                              <a href={`mailto:${apt.clientEmail}`}><Mail className="w-4 h-4 mr-1" />Email</a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ===== TABLET VIEW (640px - 1024px) - Grid Cards ===== */}
                    <div className="hidden sm:grid sm:grid-cols-2 lg:hidden gap-4">
                      {appointments.map((apt) => (
                        <div key={apt.id} className="border rounded-xl p-4 bg-card hover:shadow-md hover:border-primary/30 transition-all">
                          {/* Header with Avatar */}
                          <div className="flex items-start gap-3 mb-3">
                            <Avatar className="h-12 w-12 shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                                {apt.clientName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base truncate">{apt.clientName}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    apt.status === 'CONFIRMED' && 'bg-green-100 text-green-800 border-green-300',
                                    apt.status === 'SCHEDULED' && 'bg-blue-100 text-blue-800 border-blue-300',
                                    apt.status === 'REQUESTED' && 'bg-yellow-100 text-yellow-800 border-yellow-300',
                                    apt.status === 'CANCELLED' && 'bg-red-100 text-red-800 border-red-300'
                                  )}
                                >
                                  {apt.status}
                                </Badge>
                                {apt.type && typeIcons[apt.type]}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                                {canEdit && <DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {/* Appointment Details */}
                          <div className="space-y-2 mb-4">
                            {apt.scheduledFor && (
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Clock className="h-4 w-4 shrink-0 text-primary" />
                                {new Date(apt.scheduledFor).toLocaleDateString()} · {new Date(apt.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            {apt.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 shrink-0" />
                                <span className="truncate">{apt.location}</span>
                              </div>
                            )}
                            {apt.meetingLink && (
                              <a href={apt.meetingLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                                <Video className="h-4 w-4 shrink-0" />
                                Join Meeting
                              </a>
                            )}
                          </div>
                          {/* Action Buttons */}
                          <div className="grid grid-cols-3 gap-2">
                            <Button variant="outline" size="sm" className="h-10" asChild>
                              <a href={`tel:${apt.clientPhone}`}><Phone className="w-4 h-4 mr-1" />Call</a>
                            </Button>
                            <Button variant="outline" size="sm" className="h-10" asChild>
                              <a href={`sms:${apt.clientPhone}`}><MessageCircle className="w-4 h-4 mr-1" />Text</a>
                            </Button>
                            <Button variant="outline" size="sm" className="h-10" asChild>
                              <a href={`mailto:${apt.clientEmail}`}><Mail className="w-4 h-4 mr-1" />Email</a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ===== DESKTOP VIEW (>= 1024px) - Enhanced List ===== */}
                    <div className="hidden lg:block space-y-3">
                      {appointments.map((apt) => (
                        <div key={apt.id} className="border rounded-lg p-4 bg-card hover:shadow-md hover:border-primary/30 transition-all">
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <Avatar className="h-12 w-12 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {apt.clientName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}
                              </AvatarFallback>
                            </Avatar>
                            {/* Main Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-base">{apt.clientName}</h3>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    apt.status === 'CONFIRMED' && 'bg-green-100 text-green-800 border-green-300',
                                    apt.status === 'SCHEDULED' && 'bg-blue-100 text-blue-800 border-blue-300',
                                    apt.status === 'REQUESTED' && 'bg-yellow-100 text-yellow-800 border-yellow-300',
                                    apt.status === 'CANCELLED' && 'bg-red-100 text-red-800 border-red-300',
                                    apt.status === 'COMPLETED' && 'bg-gray-100 text-gray-800 border-gray-300'
                                  )}
                                >
                                  {apt.status}
                                </Badge>
                                {apt.type && (
                                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                    {typeIcons[apt.type]}
                                    {apt.type.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                {apt.scheduledFor && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {new Date(apt.scheduledFor).toLocaleDateString()} at {new Date(apt.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {apt.duration && ` (${apt.duration}m)`}
                                  </span>
                                )}
                                {apt.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {apt.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Contact Info */}
                            <div className="hidden xl:flex flex-col gap-1 text-sm min-w-[200px]">
                              <a href={`mailto:${apt.clientEmail}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors truncate">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                {apt.clientEmail}
                              </a>
                              <a href={`tel:${apt.clientPhone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                {apt.clientPhone}
                              </a>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {apt.meetingLink && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={apt.meetingLink} target="_blank" rel="noopener noreferrer">
                                    <Video className="h-4 w-4 mr-2" />Join
                                  </a>
                                </Button>
                              )}
                              {apt.status === 'REQUESTED' && canCreate && (
                                <Button size="sm" onClick={() => handleScheduleClick(apt)}>
                                  Schedule
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={`tel:${apt.clientPhone}`} title="Call">
                                  <Phone className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={`mailto:${apt.clientEmail}`} title="Email">
                                  <Mail className="h-4 w-4" />
                                </a>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                                  {canEdit && <DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit Appointment</DropdownMenuItem>}
                                  <DropdownMenuItem asChild>
                                    <a href={`sms:${apt.clientPhone}`}><MessageCircle className="h-4 w-4 mr-2" />Send Text</a>
                                  </DropdownMenuItem>
                                  {canConfirm && apt.status === 'SCHEDULED' && (
                                    <DropdownMenuItem><CheckCircle2 className="h-4 w-4 mr-2" />Confirm</DropdownMenuItem>
                                  )}
                                  {canEdit && (
                                    <DropdownMenuItem className="text-destructive"><XCircle className="h-4 w-4 mr-2" />Cancel</DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader className="p-4 lg:p-6 pb-2 lg:pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base lg:text-lg">Appointment Requests</CardTitle>
                    <CardDescription className="text-xs lg:text-sm mt-1">
                      {requestedAppointments.length} pending request{requestedAppointments.length !== 1 ? 's' : ''} awaiting scheduling
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-6 pt-0">
                {requestedAppointments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-30 text-green-500" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-sm mt-1">No pending requests at the moment</p>
                  </div>
                ) : (
                  <>
                    {/* ===== MOBILE VIEW (< 640px) - Stack Cards ===== */}
                    <div className="sm:hidden space-y-3">
                      {requestedAppointments.map((apt) => (
                        <div key={apt.id} className="border border-yellow-300 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-950/20">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarFallback className="bg-yellow-100 text-yellow-700 text-sm font-medium">
                                  {apt.clientName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{apt.clientName}</p>
                                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                  Pending Request
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {/* Request Info */}
                          <div className="space-y-1 text-xs text-muted-foreground mb-3">
                            <p className="line-clamp-2">{apt.clientNotes || 'No notes provided'}</p>
                            <p className="text-yellow-700">Requested: {new Date(apt.requestedAt || apt.createdAt).toLocaleDateString()}</p>
                          </div>
                          {/* Actions */}
                          <div className="flex gap-2 pt-2 border-t border-yellow-200">
                            {canCreate && (
                              <Button size="sm" className="flex-1 h-9" onClick={() => handleScheduleClick(apt)}>
                                <CalendarDays className="w-4 h-4 mr-1" />Schedule
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                              <a href={`tel:${apt.clientPhone}`}><Phone className="w-4 h-4 mr-1" />Call</a>
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                              <a href={`mailto:${apt.clientEmail}`}><Mail className="w-4 h-4 mr-1" />Email</a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ===== TABLET VIEW (640px - 1024px) - Grid Cards ===== */}
                    <div className="hidden sm:grid sm:grid-cols-2 lg:hidden gap-4">
                      {requestedAppointments.map((apt) => (
                        <div key={apt.id} className="border border-yellow-300 rounded-xl p-4 bg-yellow-50 dark:bg-yellow-950/20">
                          {/* Header */}
                          <div className="flex items-start gap-3 mb-3">
                            <Avatar className="h-12 w-12 shrink-0">
                              <AvatarFallback className="bg-yellow-100 text-yellow-700 font-semibold">
                                {apt.clientName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base truncate">{apt.clientName}</h3>
                              <Badge variant="outline" className="text-xs mt-1 bg-yellow-100 text-yellow-800 border-yellow-300">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pending Request
                              </Badge>
                            </div>
                          </div>
                          {/* Details */}
                          <div className="space-y-2 mb-4">
                            <p className="text-sm text-muted-foreground line-clamp-2">{apt.clientNotes || 'No notes provided'}</p>
                            <div className="flex flex-col gap-1 text-sm">
                              <a href={`mailto:${apt.clientEmail}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                                <Mail className="h-4 w-4 shrink-0" />
                                <span className="truncate">{apt.clientEmail}</span>
                              </a>
                              <a href={`tel:${apt.clientPhone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                                <Phone className="h-4 w-4 shrink-0" />
                                {apt.clientPhone}
                              </a>
                            </div>
                            <p className="text-xs text-yellow-700">
                              Requested: {new Date(apt.requestedAt || apt.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {/* Actions */}
                          <div className="grid grid-cols-2 gap-2">
                            {canCreate && (
                              <Button size="sm" className="h-10" onClick={() => handleScheduleClick(apt)}>
                                <CalendarDays className="w-4 h-4 mr-1" />Schedule
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-10" onClick={() => handleContactClick(apt)}>
                              <Mail className="w-4 h-4 mr-1" />Contact
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ===== DESKTOP VIEW (>= 1024px) - Enhanced List ===== */}
                    <div className="hidden lg:block space-y-3">
                      {requestedAppointments.map((apt) => (
                        <div key={apt.id} className="border border-yellow-300 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950/20 hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <Avatar className="h-12 w-12 shrink-0">
                              <AvatarFallback className="bg-yellow-100 text-yellow-700 font-semibold">
                                {apt.clientName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}
                              </AvatarFallback>
                            </Avatar>
                            {/* Main Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-base">{apt.clientName}</h3>
                                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Pending Request
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{apt.clientNotes || 'No notes provided'}</p>
                              <p className="text-xs text-yellow-700 mt-1">
                                Requested: {new Date(apt.requestedAt || apt.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {/* Contact Info */}
                            <div className="hidden xl:flex flex-col gap-1 text-sm min-w-[200px]">
                              <a href={`mailto:${apt.clientEmail}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors truncate">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                {apt.clientEmail}
                              </a>
                              <a href={`tel:${apt.clientPhone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                {apt.clientPhone}
                              </a>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {canCreate && (
                                <Button size="sm" onClick={() => handleScheduleClick(apt)}>
                                  <CalendarDays className="h-4 w-4 mr-2" />Schedule
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={() => handleContactClick(apt)}>
                                <Mail className="h-4 w-4 mr-2" />Contact
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={`tel:${apt.clientPhone}`} title="Call">
                                  <Phone className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={`sms:${apt.clientPhone}`} title="Text">
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
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
