'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/lib/supabase/useSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  DollarSign,
  Shield,
  IdCard,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { formatDistanceToNow, format } from 'date-fns';

interface LeadDetail {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone: string;
  country_code?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  tax_year: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
  status: string;
  // Form data
  full_form_data?: {
    date_of_birth?: string;
    ssn?: string;
    filing_status?: string;
    employment_type?: string;
    occupation?: string;
    claimed_as_dependent?: string;
    in_college?: string;
    has_dependents?: string;
    number_of_dependents?: string;
    dependents_under_24_student_or_disabled?: string;
    dependents_in_college?: string;
    child_care_provider?: string;
    has_mortgage?: string;
    denied_eitc?: string;
    has_irs_pin?: string;
    irs_pin?: string;
    wants_refund_advance?: string;
    drivers_license?: string;
    license_expiration?: string;
    drivers_license_image_url?: string;
    submitted_at?: string;
  };
  // Lead management
  convertedToClient: boolean;
  lastContactedAt?: string;
  contactNotes?: string;
  unqualified?: boolean;
  // Folder info
  clientFolderId?: string;
  clientFolder?: {
    id: string;
    name: string;
    path: string;
  };
  // CRM info
  crmContactId?: string;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  converted: 'bg-green-100 text-green-800',
  complete: 'bg-emerald-100 text-emerald-800',
  unqualified: 'bg-red-100 text-red-800',
};

function formatYesNo(value?: string | boolean): string {
  if (value === undefined || value === null) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value === 'yes' || value === 'true' ? 'Yes' : value === 'no' || value === 'false' ? 'No' : value;
}

function formatSSN(ssn?: string): string {
  if (!ssn) return '-';
  // Only show last 4 digits for privacy
  return `***-**-${ssn.slice(-4)}`;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const leadId = params.id as string;

  useEffect(() => {
    async function fetchLead() {
      if (sessionStatus === 'loading' || !session?.user) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/tax-preparer/leads/${leadId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Lead not found');
          } else if (response.status === 403) {
            setError('Access denied');
          } else {
            setError('Failed to load lead details');
          }
          return;
        }

        const data = await response.json();
        setLead(data.lead);
      } catch (err) {
        logger.error('Error fetching lead:', err);
        setError('Failed to load lead details');
      } finally {
        setLoading(false);
      }
    }

    fetchLead();
  }, [leadId, session, sessionStatus]);

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6 pb-20 md:pb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6 pb-20 md:pb-6">
        <Breadcrumbs />
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">{error}</h1>
          <p className="text-muted-foreground mb-4">
            Unable to load this lead. It may have been deleted or you may not have access.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  const formData = lead.full_form_data || {};
  const hasCompleteData = lead.completed;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 pb-20 md:pb-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/tax-preparer/leads">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              {lead.first_name} {lead.middle_name} {lead.last_name}
              {hasCompleteData && (
                <Badge variant="outline" className="ml-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete Intake
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Tax Year {lead.tax_year} - Submitted {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <Badge className={statusColors[lead.status] || 'bg-gray-100 text-gray-800'}>
          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tax-info">Tax Information</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                    {lead.email}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                    {lead.country_code || '+1'} {lead.phone}
                  </a>
                </div>
                {lead.address_line_1 && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p>{lead.address_line_1}</p>
                      {lead.address_line_2 && <p>{lead.address_line_2}</p>}
                      <p>{lead.city}, {lead.state} {lead.zip_code}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IdCard className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Date of Birth</dt>
                    <dd className="font-medium">{formData.date_of_birth || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">SSN</dt>
                    <dd className="font-medium">{formatSSN(formData.ssn)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Filing Status</dt>
                    <dd className="font-medium">{formData.filing_status || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Employment Type</dt>
                    <dd className="font-medium">{formData.employment_type || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Occupation</dt>
                    <dd className="font-medium">{formData.occupation || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">In College</dt>
                    <dd className="font-medium">{formatYesNo(formData.in_college)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Dependents & Credits */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dependents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Has Dependents</dt>
                    <dd className="font-medium">{formatYesNo(formData.has_dependents)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Number</dt>
                    <dd className="font-medium">{formData.number_of_dependents || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Under 24 (Student/Disabled)</dt>
                    <dd className="font-medium">{formatYesNo(formData.dependents_under_24_student_or_disabled)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">In College</dt>
                    <dd className="font-medium">{formatYesNo(formData.dependents_in_college)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Child Care Provider</dt>
                    <dd className="font-medium">{formatYesNo(formData.child_care_provider)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Tax Credits & Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Has Mortgage</dt>
                    <dd className="font-medium">{formatYesNo(formData.has_mortgage)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ever Denied EITC</dt>
                    <dd className="font-medium">{formatYesNo(formData.denied_eitc)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Has IRS PIN</dt>
                    <dd className="font-medium">{formatYesNo(formData.has_irs_pin)}</dd>
                  </div>
                  {formData.irs_pin && (
                    <div>
                      <dt className="text-muted-foreground">IRS PIN</dt>
                      <dd className="font-medium">{formData.irs_pin}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Wants Refund Advance</dt>
                    <dd className="font-medium">{formatYesNo(formData.wants_refund_advance)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tax Information Tab */}
        <TabsContent value="tax-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Identification Documents
              </CardTitle>
              <CardDescription>
                Driver's license and other ID information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Driver's License #</dt>
                  <dd className="font-medium">{formData.drivers_license || '-'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">License Expiration</dt>
                  <dd className="font-medium">{formData.license_expiration || '-'}</dd>
                </div>
              </dl>

              {/* Driver's License Image Preview */}
              {formData.drivers_license_image_url && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Driver's License Image
                  </h4>
                  <div className="border rounded-lg overflow-hidden max-w-md">
                    <img
                      src={formData.drivers_license_image_url}
                      alt="Driver's License"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                  <a
                    href={formData.drivers_license_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mt-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Full Size
                  </a>
                </div>
              )}

              {!formData.drivers_license_image_url && (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground mt-4">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No driver's license image uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Client Documents
              </CardTitle>
              <CardDescription>
                Documents uploaded by this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lead.clientFolderId ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This client has a document folder. View their uploaded files in the File Center.
                  </p>
                  <Button asChild>
                    <Link href={`/dashboard/tax-preparer/documents?folderId=${lead.clientFolderId}`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Open Client Folder
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No document folder created yet</p>
                  <p className="text-sm mt-1">Documents will be linked when the client uploads files</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Client</CardTitle>
                <CardDescription>
                  Reach out to this lead
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" asChild>
                  <a href={`mailto:${lead.email}?subject=Tax Filing for ${lead.tax_year}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </a>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call Client
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Manage this lead
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.crmContactId && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/crm/contacts/${lead.crmContactId}`}>
                      <User className="h-4 w-4 mr-2" />
                      View CRM Contact
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/tax-preparer/calendar">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Lead History */}
          <Card>
            <CardHeader>
              <CardTitle>Lead History</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{format(new Date(lead.created_at), 'PPpp')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last Updated</dt>
                  <dd>{format(new Date(lead.updated_at), 'PPpp')}</dd>
                </div>
                {formData.submitted_at && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Form Submitted</dt>
                    <dd>{format(new Date(formData.submitted_at), 'PPpp')}</dd>
                  </div>
                )}
                {lead.lastContactedAt && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Last Contacted</dt>
                    <dd>{format(new Date(lead.lastContactedAt), 'PPpp')}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
