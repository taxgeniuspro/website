'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from '@/lib/supabase/useSession';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderOpen, Save } from 'lucide-react';
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
  ClipboardList,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { TaxIntakeDetails } from '@/components/crm/TaxIntakeDetails';
import { format } from 'date-fns';

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

interface ClientFolder {
  id: string;
  name: string;
  path: string;
}

interface TaxIntakeLead {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email: string;
  phone: string;
  country_code: string;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  full_form_data?: any;
  completed: boolean;
  created_at: string;
  updated_at: string;
  referrerUsername?: string | null;
  referrerType?: string | null;
  attributionMethod?: string | null;
  assignedPreparerId?: string | null;
  contactRequested: boolean;
  contactMethod?: string | null;
  lastContactedAt?: string | null;
  contactNotes?: string | null;
  convertedToClient: boolean;
  leadScore?: number | null;
  urgency?: string | null;
  clientFolderId?: string | null;
  clientFolder?: ClientFolder | null;
}

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
  taxIntakeLead?: TaxIntakeLead | null;
}

// Pipeline stages - must match PipelineStage enum in Prisma schema
const PIPELINE_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'DOCUMENTS', 'FILED', 'CLOSED', 'LOST'];

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
  });

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

  // Update pipeline stage
  const handleStageChange = async (newStage: string) => {
    if (!contact) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/crm/contacts/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!response.ok) {
        throw new Error('Failed to update stage');
      }

      const data = await response.json();
      setContact({ ...contact, stage: newStage });
    } catch (err: any) {
      logger.error('Error updating stage:', err);
      alert('Failed to update stage: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Open edit dialog and populate form
  const openEditDialog = () => {
    if (!contact) return;
    setEditForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone || '',
      company: contact.company || '',
    });
    setIsEditDialogOpen(true);
  };

  // Save contact edits
  const handleSaveEdit = async () => {
    if (!contact) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/crm/contacts/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }

      const data = await response.json();
      setContact({ ...contact, ...editForm });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      logger.error('Error updating contact:', err);
      alert('Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

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
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={openEditDialog}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
              <DialogDescription>
                Update contact information. Click save when you&apos;re done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="company" className="text-right">
                  Company
                </Label>
                <Input
                  id="company"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

              {/* Pipeline Stage - Editable Dropdown */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Pipeline Stage</p>
                <Select
                  value={contact.stage}
                  onValueChange={handleStageChange}
                  disabled={isSaving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
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
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        <Badge
                          className={cn(
                            stage === 'NEW' && 'bg-blue-500',
                            stage === 'CONTACTED' && 'bg-purple-500',
                            stage === 'QUALIFIED' && 'bg-indigo-500',
                            stage === 'DOCUMENTS' && 'bg-yellow-500',
                            stage === 'FILED' && 'bg-orange-500',
                            stage === 'CLOSED' && 'bg-green-500',
                            stage === 'LOST' && 'bg-red-500'
                          )}
                        >
                          {stage}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          <Tabs defaultValue={contact.taxIntakeLead ? 'tax-details' : 'timeline'} className="space-y-4">
            <TabsList className="flex-wrap">
              {contact.taxIntakeLead && (
                <TabsTrigger value="tax-details">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Tax Details
                </TabsTrigger>
              )}
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

            {/* Tax Details Tab */}
            {contact.taxIntakeLead && (
              <TabsContent value="tax-details">
                <Card>
                  <CardHeader>
                    <CardTitle>Tax Intake Information</CardTitle>
                    <CardDescription>
                      Complete tax intake form data submitted by the client
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TaxIntakeDetails taxIntakeLead={contact.taxIntakeLead} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

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
                        <InteractionCard
                          key={interaction.id}
                          interaction={interaction}
                          contact={contact}
                        />
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
                  {contact.taxIntakeLead?.clientFolder ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FolderOpen className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{contact.taxIntakeLead.clientFolder.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {contact.taxIntakeLead.clientFolder.path}
                            </p>
                          </div>
                        </div>
                        <Button asChild>
                          <a
                            href={`/en/dashboard/tax-preparer/documents?folder=${contact.taxIntakeLead.clientFolder.id}`}
                          >
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Open Folder
                          </a>
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        View uploaded tax documents and ID photos in the client folder.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No client folder yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        A folder will be created when the client submits their intake form.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

/**
 * InteractionCard - User-friendly display of timeline interactions
 * Parses tax intake form submissions into clean, scannable cards
 */
function InteractionCard({
  interaction,
  contact,
}: {
  interaction: any;
  contact: Contact;
}) {
  // Check if this is a tax intake form submission
  const isTaxIntakeSubmission =
    interaction.subject?.includes('Tax Intake Form') ||
    interaction.body?.includes('Tax Intake Form');

  // Parse the body to extract structured data
  const parseIntakeBody = (body: string) => {
    if (!body) return null;

    const data: Record<string, string> = {};

    // Extract name
    const nameMatch = body.match(/Name:\s*(.+?)(?:\n|$)/);
    if (nameMatch) data.name = nameMatch[1].trim();

    // Extract email
    const emailMatch = body.match(/Email:\s*(.+?)(?:\n|$)/);
    if (emailMatch) data.email = emailMatch[1].trim();

    // Extract phone
    const phoneMatch = body.match(/Phone:\s*(.+?)(?:\n|$)/);
    if (phoneMatch) data.phone = phoneMatch[1].trim();

    // Extract address (multi-line)
    const addressSection = body.match(/\*\*Address:\*\*\n([\s\S]*?)(?:\n\n|\*\*)/);
    if (addressSection) {
      data.address = addressSection[1].trim().replace(/\n/g, ', ');
    }

    // Extract source
    const sourceMatch = body.match(/Source:\s*(.+?)(?:\n|$)/);
    if (sourceMatch) data.source = sourceMatch[1].trim();

    // Extract referrer
    const referrerMatch = body.match(/Referrer:\s*(.+?)(?:\n|$)/);
    if (referrerMatch) data.referrer = referrerMatch[1].trim();

    // Extract status
    const statusMatch = body.match(/Status:\s*(.+?)(?:\n|$)/);
    if (statusMatch) data.status = statusMatch[1].trim();

    // Extract Lead ID
    const leadIdMatch = body.match(/Lead ID:\s*(.+?)(?:\n|$)/);
    if (leadIdMatch) data.leadId = leadIdMatch[1].trim();

    return data;
  };

  // Get icon based on interaction type or subject
  const getIcon = () => {
    if (isTaxIntakeSubmission) {
      return interaction.subject?.includes('Complete')
        ? CheckCircle
        : Clock;
    }
    switch (interaction.type) {
      case 'EMAIL':
        return Mail;
      case 'PHONE_CALL':
        return Phone;
      case 'MEETING':
        return Calendar;
      case 'NOTE':
        return MessageCircle;
      default:
        return Activity;
    }
  };

  // Get badge color based on type
  const getBadgeColor = () => {
    if (interaction.subject?.includes('Complete')) return 'bg-green-500';
    if (interaction.subject?.includes('Partial')) return 'bg-yellow-500';
    if (interaction.type === 'EMAIL') return 'bg-blue-500';
    if (interaction.type === 'PHONE_CALL') return 'bg-purple-500';
    return 'bg-primary';
  };

  const Icon = getIcon();
  const parsedData = isTaxIntakeSubmission ? parseIntakeBody(interaction.body) : null;

  // For tax intake submissions, render a clean card
  if (isTaxIntakeSubmission && parsedData) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn('rounded-full p-2', getBadgeColor())}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold">{interaction.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(interaction.occurredAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            {parsedData.status && (
              <Badge variant="outline" className="text-xs">
                {parsedData.status}
              </Badge>
            )}
          </div>

          {/* Contact Info - Clean Grid */}
          <div className="grid gap-3 md:grid-cols-2 mt-4">
            {/* Name & Quick Actions */}
            <div className="space-y-2">
              {parsedData.name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{parsedData.name}</span>
                </div>
              )}
              <div className="flex gap-2">
                {parsedData.phone && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${parsedData.phone.replace(/\D/g, '')}`}>
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </a>
                  </Button>
                )}
                {parsedData.email && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${parsedData.email}`}>
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Address */}
            {parsedData.address && parsedData.address !== 'Not provided' && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm">{parsedData.address}</p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(parsedData.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View on Map
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Attribution Footer */}
          {(parsedData.source || parsedData.referrer) && (
            <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
              {parsedData.source && (
                <span>
                  Source: <span className="font-medium">{parsedData.source}</span>
                </span>
              )}
              {parsedData.referrer && (
                <span>
                  Referrer: <span className="font-medium">{parsedData.referrer}</span>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default rendering for non-tax-intake interactions
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn('rounded-full p-2', getBadgeColor())}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="h-full w-px bg-border mt-2" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{interaction.type}</p>
            {interaction.subject && (
              <p className="text-sm text-muted-foreground">{interaction.subject}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(interaction.occurredAt), 'MMM d, yyyy h:mm a')}
          </span>
        </div>
        {interaction.body && (
          <div className="mt-2 text-sm text-muted-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">
            {interaction.body}
          </div>
        )}
      </div>
    </div>
  );
}
