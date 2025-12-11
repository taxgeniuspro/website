'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Users,
  Home,
  CreditCard,
  Shield,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

interface TaxIntakeLeadData {
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
}

interface TaxIntakeDetailsProps {
  taxIntakeLead: TaxIntakeLeadData;
}

export function TaxIntakeDetails({ taxIntakeLead }: TaxIntakeDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const formData = taxIntakeLead.full_form_data || {};

  // Mask SSN for display (show last 4 only)
  const maskSSN = (ssn: string | undefined) => {
    if (!ssn) return 'Not provided';
    return `***-**-${ssn.slice(-4)}`;
  };

  // Format phone number
  const formatPhone = (phone: string, countryCode: string = '+1') => {
    if (!phone) return 'Not provided';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${countryCode} (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return `${countryCode} ${phone}`;
  };

  // Get submission status badge
  const getStatusBadge = () => {
    if (taxIntakeLead.convertedToClient) {
      return (
        <Badge className="bg-purple-500 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Converted to Client
        </Badge>
      );
    }
    if (taxIntakeLead.completed) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Complete Submission
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-500 text-white">
        <Clock className="h-3 w-3 mr-1" />
        Partial Submission
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Tax Intake Form</h3>
            <p className="text-sm text-muted-foreground">
              Submitted {format(new Date(taxIntakeLead.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={`tel:${taxIntakeLead.country_code}${taxIntakeLead.phone}`}>
            <Phone className="h-4 w-4 mr-2" />
            Call
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={`mailto:${taxIntakeLead.email}`}>
            <Mail className="h-4 w-4 mr-2" />
            Email
          </a>
        </Button>
        {taxIntakeLead.address_line_1 && taxIntakeLead.city && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(
                `${taxIntakeLead.address_line_1}, ${taxIntakeLead.city}, ${taxIntakeLead.state} ${taxIntakeLead.zip_code}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Map
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        )}
      </div>

      <Separator />

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full Name</span>
              <span className="font-medium">
                {taxIntakeLead.first_name} {taxIntakeLead.middle_name || ''} {taxIntakeLead.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <a href={`mailto:${taxIntakeLead.email}`} className="font-medium text-primary hover:underline">
                {taxIntakeLead.email}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <a
                href={`tel:${taxIntakeLead.country_code}${taxIntakeLead.phone}`}
                className="font-medium text-primary hover:underline"
              >
                {formatPhone(taxIntakeLead.phone, taxIntakeLead.country_code)}
              </a>
            </div>
            {formData.date_of_birth && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-medium">{formData.date_of_birth}</span>
              </div>
            )}
            {formData.ssn && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SSN</span>
                <span className="font-medium font-mono">{maskSSN(formData.ssn)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-500" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {taxIntakeLead.address_line_1 ? (
              <div className="space-y-1">
                <p className="font-medium">{taxIntakeLead.address_line_1}</p>
                {taxIntakeLead.address_line_2 && (
                  <p className="font-medium">{taxIntakeLead.address_line_2}</p>
                )}
                <p className="font-medium">
                  {taxIntakeLead.city}, {taxIntakeLead.state} {taxIntakeLead.zip_code}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No address provided</p>
            )}
          </CardContent>
        </Card>

        {/* Tax Filing Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-500" />
              Tax Filing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Filing Status</span>
              <span className="font-medium capitalize">
                {formData.filing_status?.replace(/_/g, ' ') || 'Not specified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Employment</span>
              <span className="font-medium">{formData.employment_type || 'Not specified'}</span>
            </div>
            {formData.occupation && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Occupation</span>
                <span className="font-medium">{formData.occupation}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claimed as Dependent</span>
              <span className="font-medium">
                {formData.claimed_as_dependent === 'yes' ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currently in College</span>
              <span className="font-medium">{formData.in_college === 'yes' ? 'Yes' : 'No'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Dependents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              Dependents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Has Dependents</span>
              <span className="font-medium">{formData.has_dependents === 'yes' ? 'Yes' : 'No'}</span>
            </div>
            {formData.has_dependents === 'yes' && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number</span>
                  <span className="font-medium">{formData.number_of_dependents || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Under 24 / Student / Disabled</span>
                  <span className="font-medium">
                    {formData.dependents_under_24_student_or_disabled === 'yes' ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In College</span>
                  <span className="font-medium">
                    {formData.dependents_in_college === 'yes' ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Child Care Provider</span>
                  <span className="font-medium">
                    {formData.child_care_provider === 'yes' ? 'Yes' : 'No'}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Property & Credits */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Home className="h-4 w-4 text-teal-500" />
              Property & Credits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Has Mortgage</span>
              <span className="font-medium">{formData.has_mortgage === 'yes' ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previously Denied EITC</span>
              <span className="font-medium">{formData.denied_eitc === 'yes' ? 'Yes' : 'No'}</span>
            </div>
          </CardContent>
        </Card>

        {/* IRS & Refund */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-red-500" />
              IRS & Refund
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Has IRS PIN</span>
              <span className="font-medium">
                {formData.has_irs_pin === 'yes'
                  ? `Yes (${formData.irs_pin || 'N/A'})`
                  : formData.has_irs_pin === 'yes_locate'
                  ? 'Yes (Need to Locate)'
                  : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wants Refund Advance</span>
              <Badge variant={formData.wants_refund_advance === 'yes' ? 'default' : 'secondary'}>
                {formData.wants_refund_advance === 'yes' ? 'Yes' : 'No'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Identification - Collapsible */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  Identification & Attribution
                </CardTitle>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Driver's License */}
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-muted-foreground">Driver's License</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Number</span>
                    <span className="font-medium font-mono">
                      {formData.drivers_license || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expiration</span>
                    <span className="font-medium">{formData.license_expiration || 'N/A'}</span>
                  </div>
                </div>

                {/* Attribution */}
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-muted-foreground">Lead Source</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source</span>
                    <Badge variant="outline">
                      {taxIntakeLead.attributionMethod || 'Direct'}
                    </Badge>
                  </div>
                  {taxIntakeLead.referrerUsername && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Referrer</span>
                      <span className="font-medium">
                        {taxIntakeLead.referrerUsername} ({taxIntakeLead.referrerType})
                      </span>
                    </div>
                  )}
                  {taxIntakeLead.leadScore !== null && taxIntakeLead.leadScore !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lead Score</span>
                      <Badge
                        variant={
                          taxIntakeLead.leadScore >= 70
                            ? 'default'
                            : taxIntakeLead.leadScore >= 40
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {taxIntakeLead.leadScore}/100
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Contact Notes */}
      {taxIntakeLead.contactNotes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Latest Contact Notes
            </CardTitle>
            {taxIntakeLead.lastContactedAt && (
              <CardDescription>
                Last contacted: {format(new Date(taxIntakeLead.lastContactedAt), 'MMM d, yyyy h:mm a')}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm bg-muted p-3 rounded-md">{taxIntakeLead.contactNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
