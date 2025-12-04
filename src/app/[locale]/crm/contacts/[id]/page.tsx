'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  User,
  TrendingUp,
  MessageCircle,
  FileText,
  CheckCircle,
  Clock,
  Tag,
  Edit,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  Activity,
  Zap,
} from 'lucide-react';

/**
 * CRM Contact Detail Page
 *
 * Full contact profile with:
 * - Contact information
 * - Lead score indicator
 * - Timeline of all interactions
 * - Tasks list
 * - Email activity
 * - Documents
 * - Tags
 */

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  contactType: string;
  stage: string;
  leadScore: number;
  lastScoredAt?: string;
  assignedPreparerId?: string;
  createdAt: string;
  lastContactedAt?: string;
  filingStatus?: string;
  dependents?: number;
  taxYear?: number;
  interactions?: any[];
  tasks?: any[];
  tags?: any[];
  emailActivities?: any[];
  stageHistory?: any[];
}

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  const role = user?.role as UserRole | undefined;
  const permissions = role
    ? getUserPermissions(role, user?.permissions as any)
    : null;

  // Fetch contact details
  useEffect(() => {
    if (!isLoaded || !user || !params.id) return;

    const fetchContact = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/crm/contacts/${params.id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch contact');
        }

        const data = await response.json();
        setContact(data.data);
      } catch (err: any) {
        setError(err.message);
        logger.error('Error fetching contact:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [isLoaded, user, params.id]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error || 'Contact not found'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getLeadScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getLeadScoreLabel = (score: number) => {
    if (score >= 70) return 'Hot Lead';
    if (score >= 40) return 'Warm Lead';
    return 'Cold Lead';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {contact.firstName} {contact.lastName}
          </h1>
          <p className="text-muted-foreground">Contact Details</p>
        </div>
        <Button variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Contact Info */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {contact.firstName[0]}
                    {contact.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold">
                    {contact.firstName} {contact.lastName}
                  </div>
                  <Badge variant="outline">{contact.contactType}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                  <span>{contact.email}</span>
                </div>
                {contact.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center text-sm">
                    <Building className="h-4 w-4 mr-3 text-muted-foreground" />
                    <span>{contact.company}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Pipeline Stage */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Pipeline Stage</p>
                <Badge
                  className={cn(
                    contact.stage === 'NEW' && 'bg-blue-500',
                    contact.stage === 'CONTACTED' && 'bg-purple-500',
                    contact.stage === 'QUALIFIED' && 'bg-indigo-500',
                    contact.stage === 'DOCUMENTS' && 'bg-yellow-500',
                    contact.stage === 'FILED' && 'bg-orange-500',
                    contact.stage === 'CLOSED' && 'bg-green-500',
                    contact.stage === 'LOST' && 'bg-red-500'
                  )}
                >
                  {contact.stage}
                </Badge>
              </div>

              {/* Lead Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Lead Score</p>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        contact.leadScore >= 70 && 'bg-green-500',
                        contact.leadScore >= 40 && contact.leadScore < 70 && 'bg-yellow-500',
                        contact.leadScore < 40 && 'bg-red-500'
                      )}
                      style={{ width: `${contact.leadScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold">{contact.leadScore}</span>
                </div>
                <p className={cn('text-xs mt-1 font-medium', getLeadScoreColor(contact.leadScore))}>
                  {getLeadScoreLabel(contact.leadScore)}
                </p>
              </div>

              <Separator />

              {/* Tax Info */}
              {contact.taxYear && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tax Information</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Tax Year: {contact.taxYear}</div>
                    {contact.filingStatus && <div>Filing Status: {contact.filingStatus}</div>}
                    {contact.dependents !== undefined && (
                      <div>Dependents: {contact.dependents}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Tags</p>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {contact.tags && contact.tags.length > 0 ? (
                    contact.tags.map((tag: any) => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.tag.name}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Activity Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Interactions</span>
                <span className="font-bold">{contact.interactions?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tasks</span>
                <span className="font-bold">{contact.tasks?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Emails</span>
                <span className="font-bold">{contact.emailActivities?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Timeline & Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="timeline" className="space-y-4">
            <TabsList>
              <TabsTrigger value="timeline">
                <Activity className="h-4 w-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <CheckCircle className="h-4 w-4 mr-2" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="emails">
                <Mail className="h-4 w-4 mr-2" />
                Emails
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
            </TabsList>

            {/* Timeline Tab */}
            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>Complete history of all interactions and events</CardDescription>
                </CardHeader>
                <CardContent>
                  {contact.interactions && contact.interactions.length > 0 ? (
                    <div className="space-y-4">
                      {contact.interactions.map((interaction: any) => (
                        <div key={interaction.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="rounded-full bg-primary p-2">
                              <MessageCircle className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <div className="h-full w-px bg-border mt-2" />
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{interaction.type}</p>
                                {interaction.subject && (
                                  <p className="text-sm text-muted-foreground">
                                    {interaction.subject}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(interaction.occurredAt).toLocaleDateString()}
                              </span>
                            </div>
                            {interaction.body && (
                              <p className="text-sm mt-2 text-muted-foreground">
                                {interaction.body}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No interactions yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tasks</CardTitle>
                      <CardDescription>Manage tasks for this contact</CardDescription>
                    </div>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">
                    Task management coming soon
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Emails Tab */}
            <TabsContent value="emails">
              <Card>
                <CardHeader>
                  <CardTitle>Email Activity</CardTitle>
                  <CardDescription>Track all email communications</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">
                    Email tracking coming soon
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Files attached to this contact</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">
                    Document management coming soon
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
