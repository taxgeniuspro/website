'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { addRecentItem } from '@/lib/recent-items';
import {
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Filter,
  UserPlus,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  UserCheck,
  PhoneCall,
  FileText,
  TrendingUp,
  Users,
  ExternalLink,
  FolderOpen,
  FolderPlus,
} from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays, isBefore } from 'date-fns';
import { LeadConversionDialog } from './LeadConversionDialog';

// CRMContact interface - matches the new /api/tax-preparer/crm-contacts endpoint
interface CRMContact {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  contactType: string;
  stage: string; // NEW, CONTACTED, QUALIFIED, CONVERTED, LOST
  source: string | null;
  leadScore: number | null;
  createdAt: string;
  lastContactedAt: string | null;
  lastInteraction: {
    type: string;
    subject: string | null;
    occurredAt: string;
  } | null;
  attribution: {
    referrerUsername: string | null;
    referrerType: string | null;
    method: string | null;
  };
  taxInfo: {
    filingStatus: string | null;
    taxYear: number | null;
  };
}

// Legacy interface for TaxIntakeLead - still used for some operations
interface TaxIntakeLead {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email: string;
  phone: string;
  country_code: string;
  address_line_1?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  assignedPreparerId?: string | null;
  contactRequested: boolean;
  contactMethod?: string | null;
  lastContactedAt?: string | null;
  contactNotes?: string | null;
  convertedToClient: boolean;
  convertedAt?: string | null; // When return was filed / marked complete
  created_at: string;
  updated_at: string;
  full_form_data?: any;
  crmContactId?: string | null;
  clientFolderId?: string | null;
  // Unqualified status fields
  unqualified?: boolean;
  unqualifiedReason?: string | null;
  unqualifiedAt?: string | null;
  unqualifiedNotes?: string | null;
  // Lead expiration (auto-delete after 6 months if not converted)
  expiresAt?: string | null;
}

interface LeadStats {
  total: number;
  NEW: number;
  CONTACTED: number;
  QUALIFIED: number;
  CONVERTED: number;
  LOST: number;
}

interface LeadDashboardProps {
  preparerId?: string;
  isAdmin?: boolean;
}

// CRM Pipeline Stages - matches the database enum
const CRM_STAGES = [
  { value: 'NEW', label: 'New', color: 'bg-blue-500', icon: AlertCircle },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-yellow-500', icon: PhoneCall },
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-green-500', icon: CheckCircle },
  { value: 'CONVERTED', label: 'Converted', color: 'bg-purple-500', icon: UserCheck },
  { value: 'LOST', label: 'Lost', color: 'bg-gray-500', icon: XCircle },
];

// Legacy statuses for old lead system (deprecated)
const LEAD_STATUSES = CRM_STAGES;

const UNQUALIFIED_REASONS = [
  { value: 'wrong_state', label: 'Wrong State (Cannot File)' },
  { value: 'no_income', label: 'No Taxable Income' },
  { value: 'already_filed', label: 'Already Filed Elsewhere' },
  { value: 'unresponsive', label: 'Unresponsive (No Contact)' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'other', label: 'Other (Specify in Notes)' },
];

// Helper to check if lead is expiring soon (within 30 days) or already expired
function getExpirationInfo(expiresAt: string | null | undefined) {
  if (!expiresAt) return null;

  const expirationDate = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiration = differenceInDays(expirationDate, now);

  if (daysUntilExpiration < 0) {
    return { status: 'expired', daysUntilExpiration: 0, message: 'Expired' };
  }
  if (daysUntilExpiration <= 30) {
    return {
      status: 'expiring',
      daysUntilExpiration,
      message: daysUntilExpiration === 0 ? 'Expires today' : `Expires in ${daysUntilExpiration} days`
    };
  }
  return null;
}

export function LeadDashboard({ preparerId, isAdmin = false }: LeadDashboardProps) {
  // Use CRMContact as the primary data type
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    CONVERTED: 0,
    LOST: 0,
  });

  // Contact dialog state
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<TaxIntakeLead | null>(null);
  const [contactNote, setContactNote] = useState('');
  const [contactMethod, setContactMethod] = useState<string>('CALL');
  const [submitting, setSubmitting] = useState(false);

  // Tax details dialog state
  const [taxDetailsDialogOpen, setTaxDetailsDialogOpen] = useState(false);
  const [taxDetailsLead, setTaxDetailsLead] = useState<TaxIntakeLead | null>(null);

  // Folder creation state
  const [creatingFolderId, setCreatingFolderId] = useState<string | null>(null);

  // Unqualified dialog state
  const [unqualifiedDialogOpen, setUnqualifiedDialogOpen] = useState(false);
  const [unqualifiedLead, setUnqualifiedLead] = useState<TaxIntakeLead | null>(null);
  const [unqualifiedReason, setUnqualifiedReason] = useState<string>('');
  const [unqualifiedNotes, setUnqualifiedNotes] = useState('');

  // Conversion dialog state
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [conversionLead, setConversionLead] = useState<TaxIntakeLead | null>(null);

  // Fetch CRM contacts
  useEffect(() => {
    fetchContacts();
  }, [preparerId, stageFilter, searchTerm]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      // Note: preparerId is handled server-side via session for /api/tax-preparer/crm-contacts
      if (stageFilter && stageFilter !== 'all') {
        params.append('stage', stageFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      // Use the new CRM contacts endpoint
      const response = await fetch(`/api/tax-preparer/crm-contacts?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      setContacts(data.contacts || []);

      // Calculate stats from stageCounts
      const stageCounts = data.filters?.stageCounts || {};
      const totalCount = data.pagination?.total || 0;
      setStats({
        total: totalCount,
        NEW: stageCounts['NEW'] || 0,
        CONTACTED: stageCounts['CONTACTED'] || 0,
        QUALIFIED: stageCounts['QUALIFIED'] || 0,
        CONVERTED: stageCounts['CONVERTED'] || 0,
        LOST: stageCounts['LOST'] || 0,
      });
    } catch (err: any) {
      setError(err.message);
      logger.error('Error fetching CRM contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  // For CRMContact - stage is already set, just return it
  const getContactStage = (contact: CRMContact): string => {
    return contact.stage || 'NEW';
  };

  // Legacy function for TaxIntakeLead (deprecated)
  const getLeadStatus = (lead: TaxIntakeLead): string => {
    if (lead.unqualified) return 'LOST';
    if (lead.convertedToClient && lead.convertedAt) return 'CONVERTED';
    if (lead.convertedToClient) return 'CONVERTED';
    if (lead.contactNotes && lead.lastContactedAt) return 'QUALIFIED';
    if (lead.lastContactedAt) return 'CONTACTED';
    return 'NEW';
  };

  const getStageBadge = (stage: string) => {
    const stageConfig = CRM_STAGES.find((s) => s.value === stage);
    if (!stageConfig) return null;

    const Icon = stageConfig.icon;
    return (
      <Badge className={cn('gap-1', stageConfig.color, 'text-white')}>
        <Icon className="h-3 w-3" />
        {stageConfig.label}
      </Badge>
    );
  };

  // Alias for backward compatibility
  const getStatusBadge = getStageBadge;

  const handleAddContact = (lead: TaxIntakeLead) => {
    setSelectedLead(lead);
    setContactNote('');
    setContactMethod('CALL');
    setContactDialogOpen(true);

    // Track recently accessed lead
    addRecentItem({
      id: lead.id,
      type: 'lead',
      title: `${lead.first_name} ${lead.last_name}`,
      subtitle: lead.email,
      href: '/dashboard/tax-preparer/leads',
      metadata: {
        phone: lead.phone,
        status: getLeadStatus(lead),
      },
    });
  };

  const handleCreateFolder = async (lead: TaxIntakeLead) => {
    try {
      setCreatingFolderId(lead.id);

      const response = await fetch('/api/tax-preparer/lead-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create folder');
      }

      const data = await response.json();

      // Refresh contacts after folder creation
      await fetchContacts();

      // Navigate to the documents page with the new folder
      window.location.href = `/en/dashboard/tax-preparer/documents?folderId=${data.folder.id}`;
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder');
    } finally {
      setCreatingFolderId(null);
    }
  };

  const handleSubmitContact = async () => {
    if (!selectedLead || !contactNote.trim()) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/tax-preparer/leads/${selectedLead.id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactMethod,
          contactNotes: contactNote,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save contact note');
      }

      // Refresh contacts
      await fetchContacts();
      setContactDialogOpen(false);
      setSelectedLead(null);
      setContactNote('');
    } catch (err: any) {
      logger.error('Error saving contact note:', err);
      alert('Failed to save contact note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToClient = async (leadId: string) => {
    if (!confirm('Convert this lead to a client? This will create a client profile and assign them to you.')) {
      return;
    }

    try {
      const response = await fetch(`/api/tax-preparer/leads/${leadId}/convert`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to convert lead');
      }

      alert('Lead converted to client successfully!');
      await fetchContacts();
    } catch (err: any) {
      logger.error('Error converting lead:', err);
      alert('Failed to convert lead. Please try again.');
    }
  };

  const handleMarkComplete = async (leadId: string, leadName: string, hasReferrer: boolean) => {
    const confirmMessage = hasReferrer
      ? `Mark ${leadName}'s return as filed? This will credit the referrer's commission.`
      : `Mark ${leadName}'s return as filed?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/tax-preparer/leads/${leadId}/complete`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete lead');
      }

      if (data.commission) {
        alert(
          `Return filed successfully!\n\nCommission of $${data.commission.amount} credited to ${data.commission.referrerName} (${data.commission.tier}).`
        );
      } else {
        alert('Return filed successfully!');
      }

      await fetchContacts();
    } catch (err: any) {
      logger.error('Error completing lead:', err);
      alert(err.message || 'Failed to complete lead. Please try again.');
    }
  };

  const handleOpenUnqualifyDialog = (lead: TaxIntakeLead) => {
    setUnqualifiedLead(lead);
    setUnqualifiedReason('');
    setUnqualifiedNotes('');
    setUnqualifiedDialogOpen(true);
  };

  const handleSubmitUnqualify = async () => {
    if (!unqualifiedLead || !unqualifiedReason) return;
    if (unqualifiedReason === 'other' && !unqualifiedNotes.trim()) {
      alert('Please provide notes explaining why this lead is unqualified.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`/api/tax-preparer/leads/${unqualifiedLead.id}/unqualify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: unqualifiedReason,
          notes: unqualifiedNotes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark lead as unqualified');
      }

      alert('Lead marked as unqualified.');
      setUnqualifiedDialogOpen(false);
      setUnqualifiedLead(null);
      await fetchContacts();
    } catch (err: any) {
      logger.error('Error marking lead as unqualified:', err);
      alert(err.message || 'Failed to mark lead as unqualified. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopenLead = async (leadId: string, leadName: string) => {
    if (!confirm(`Reopen ${leadName}? This will allow you to work with them again.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tax-preparer/leads/${leadId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reopen lead');
      }

      alert('Lead reopened successfully!');
      await fetchContacts();
    } catch (err: any) {
      logger.error('Error reopening lead:', err);
      alert(err.message || 'Failed to reopen lead. Please try again.');
    }
  };

  // Filter contacts - search is also handled server-side, but do client-side for instant feedback
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      searchTerm === '' ||
      contact.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.phone && contact.phone.includes(searchTerm));

    const contactStage = getContactStage(contact);
    const matchesStage = stageFilter === 'all' || contactStage === stageFilter;

    return matchesSearch && matchesStage;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading leads: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - Updated for CRM stages */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Contacts</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>New</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.NEW}</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Contacted</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.CONTACTED}</CardTitle>
          </CardHeader>
          <CardContent>
            <PhoneCall className="h-4 w-4 text-yellow-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Qualified</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.QUALIFIED}</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Converted</CardDescription>
            <CardTitle className="text-3xl text-purple-600">{stats.CONVERTED}</CardTitle>
          </CardHeader>
          <CardContent>
            <UserCheck className="h-4 w-4 text-purple-600" />
          </CardContent>
        </Card>
      </div>

      {/* Filters - Updated for CRM stages */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>My Leads</CardTitle>
              <CardDescription>Contact and manage your CRM contacts</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                  <SelectItem value="QUALIFIED">Qualified</SelectItem>
                  <SelectItem value="CONVERTED">Converted</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No contacts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContacts.map((contact) => {
                const stage = getContactStage(contact);
                return (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        {/* Contact Info */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {contact.firstName} {contact.lastName}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {getStageBadge(stage)}
                                {contact.attribution.referrerUsername && (
                                  <a
                                    href={`https://taxgeniuspro.tax/go/${contact.attribution.referrerUsername}-intake`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1"
                                  >
                                    <Badge variant="outline" className="text-xs hover:bg-accent cursor-pointer">
                                      🔗 {contact.attribution.referrerUsername}-intake
                                    </Badge>
                                  </a>
                                )}
                                {contact.leadScore !== null && contact.leadScore > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Score: {contact.leadScore}
                                  </Badge>
                                )}
                                {contact.source && (
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {contact.source.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(contact.createdAt), 'MMM d, yyyy')}
                            </span>
                          </div>

                          <div className="grid gap-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <a href={`mailto:${contact.email}`} className="hover:underline">
                                {contact.email}
                              </a>
                            </div>
                            {contact.phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <a href={`tel:${contact.phone}`} className="hover:underline">
                                  {contact.phone}
                                </a>
                              </div>
                            )}
                            {/* Quick Contact Buttons */}
                            <div className="flex gap-2 mt-2">
                              {contact.phone && (
                                <>
                                  <a
                                    href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                  >
                                    <Phone className="h-3 w-3" />
                                    Call
                                  </a>
                                  <a
                                    href={`sms:${contact.phone.replace(/[^0-9+]/g, '')}`}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    Text
                                  </a>
                                </>
                              )}
                              <a
                                href={`mailto:${contact.email}`}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500 text-gray-900 text-xs rounded hover:bg-yellow-400 transition-colors"
                              >
                                <Mail className="h-3 w-3" />
                                Email
                              </a>
                            </div>
                          </div>

                          {contact.lastContactedAt && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              Last contacted: {format(new Date(contact.lastContactedAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          )}

                          {contact.lastInteraction && (
                            <div className="bg-muted p-3 rounded-md text-sm">
                              <p className="font-medium mb-1">Last Interaction ({contact.lastInteraction.type}):</p>
                              <p className="text-muted-foreground">{contact.lastInteraction.subject || 'No subject'}</p>
                            </div>
                          )}

                          {/* Tax Info if available */}
                          {contact.taxInfo.filingStatus && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span className="capitalize">{contact.taxInfo.filingStatus.replace(/_/g, ' ')}</span>
                              {contact.taxInfo.taxYear && <span>({contact.taxInfo.taxYear})</span>}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 md:w-48">
                          {/* View in CRM - Primary action */}
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            asChild
                          >
                            <Link href={`/en/crm/contacts/${contact.id}`}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </Button>

                          {/* Update Stage */}
                          <Select
                            value={stage}
                            onValueChange={async (newStage) => {
                              try {
                                const response = await fetch('/api/tax-preparer/crm-contacts', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: contact.id, stage: newStage }),
                                });
                                if (response.ok) {
                                  fetchContacts();
                                }
                              } catch (err) {
                                logger.error('Error updating stage:', err);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Change stage" />
                            </SelectTrigger>
                            <SelectContent>
                              {CRM_STAGES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Contact Actions */}
                          {contact.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              asChild
                            >
                              <a href={`tel:${contact.phone}`}>
                                <PhoneCall className="h-4 w-4 mr-2" />
                                Call Contact
                              </a>
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            asChild
                          >
                            <a href={`mailto:${contact.email}`}>
                              <Mail className="h-4 w-4 mr-2" />
                              Email Contact
                            </a>
                          </Button>

                          {/* Mark as Lost button for non-converted contacts */}
                          {stage !== 'CONVERTED' && stage !== 'LOST' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-gray-600 hover:bg-gray-100"
                              onClick={async () => {
                                if (!confirm(`Mark ${contact.firstName} ${contact.lastName} as Lost?`)) return;
                                try {
                                  const response = await fetch('/api/tax-preparer/crm-contacts', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: contact.id, stage: 'LOST', notes: 'Marked as lost' }),
                                  });
                                  if (response.ok) {
                                    fetchContacts();
                                  }
                                } catch (err) {
                                  logger.error('Error marking as lost:', err);
                                }
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Mark as Lost
                            </Button>
                          )}

                          {/* Convert to Client - For qualified leads */}
                          {stage === 'QUALIFIED' && (
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full bg-purple-600 hover:bg-purple-700"
                              onClick={async () => {
                                if (!confirm(`Convert ${contact.firstName} ${contact.lastName} to client?`)) return;
                                try {
                                  const response = await fetch('/api/tax-preparer/crm-contacts', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: contact.id, stage: 'CONVERTED', notes: 'Converted to client' }),
                                  });
                                  if (response.ok) {
                                    fetchContacts();
                                  }
                                } catch (err) {
                                  logger.error('Error converting to client:', err);
                                }
                              }}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Convert to Client
                            </Button>
                          )}

                          {/* Converted badge */}
                          {stage === 'CONVERTED' && (
                            <Badge className="w-full justify-center bg-purple-600">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Converted Client
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact Note</DialogTitle>
            <DialogDescription>
              Record your interaction with{' '}
              {selectedLead && `${selectedLead.first_name} ${selectedLead.last_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Contact Method</Label>
              <Select value={contactMethod} onValueChange={setContactMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">Phone Call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="TEXT">Text Message</SelectItem>
                  <SelectItem value="IN_PERSON">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="What did you discuss? Next steps?"
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitContact} disabled={!contactNote.trim() || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Note'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax Details Dialog */}
      <Dialog open={taxDetailsDialogOpen} onOpenChange={setTaxDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Tax Intake Details</DialogTitle>
            <DialogDescription>
              Full tax information for{' '}
              {taxDetailsLead && `${taxDetailsLead.first_name} ${taxDetailsLead.last_name}`}
            </DialogDescription>
          </DialogHeader>

          {taxDetailsLead?.full_form_data && (
            <div className="space-y-4">
              {/* Quick Actions Bar */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      asChild
                    >
                      <a href={`tel:${taxDetailsLead.country_code || '+1'}${taxDetailsLead.phone.replace(/[^0-9]/g, '')}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      asChild
                    >
                      <a href={`sms:${taxDetailsLead.country_code || '+1'}${taxDetailsLead.phone.replace(/[^0-9]/g, '')}`}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Text
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                      asChild
                    >
                      <a href={`mailto:${taxDetailsLead.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link href={`/en/dashboard/tax-preparer/calendar`}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule
                      </Link>
                    </Button>
                    {taxDetailsLead.clientFolderId && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link href={`/en/dashboard/tax-preparer/documents?folderId=${taxDetailsLead.clientFolderId}`}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Documents
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Full Name</p>
                    <p className="font-medium">
                      {taxDetailsLead.full_form_data.first_name}{' '}
                      {taxDetailsLead.full_form_data.middle_name || ''}{' '}
                      {taxDetailsLead.full_form_data.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{taxDetailsLead.full_form_data.date_of_birth || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">SSN</p>
                    <p className="font-medium">{taxDetailsLead.full_form_data.ssn || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {taxDetailsLead.full_form_data.country_code || '+1'} {taxDetailsLead.full_form_data.phone}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide">Address</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">{taxDetailsLead.full_form_data.address_line_1}</p>
                  {taxDetailsLead.full_form_data.address_line_2 && (
                    <p className="font-medium">{taxDetailsLead.full_form_data.address_line_2}</p>
                  )}
                  <p className="font-medium">
                    {taxDetailsLead.full_form_data.city}, {taxDetailsLead.full_form_data.state}{' '}
                    {taxDetailsLead.full_form_data.zip_code}
                  </p>
                </CardContent>
              </Card>

              {/* Tax Filing */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide">Tax Filing</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Filing Status</p>
                    <p className="font-medium capitalize">
                      {taxDetailsLead.full_form_data.filing_status?.replace(/_/g, ' ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Employment</p>
                    <p className="font-medium">{taxDetailsLead.full_form_data.employment_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Occupation</p>
                    <p className="font-medium">{taxDetailsLead.full_form_data.occupation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Claimed as Dependent</p>
                    <p className="font-medium">
                      {taxDetailsLead.full_form_data.claimed_as_dependent === 'yes' ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Currently in College</p>
                    <p className="font-medium">
                      {taxDetailsLead.full_form_data.in_college === 'yes' ? 'Yes' : 'No'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Dependents */}
              {taxDetailsLead.full_form_data.has_dependents === 'yes' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide">Dependents</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Number of Dependents</p>
                      <p className="font-medium">{taxDetailsLead.full_form_data.number_of_dependents || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Under 24 / Student / Disabled</p>
                      <p className="font-medium">
                        {taxDetailsLead.full_form_data.dependents_under_24_student_or_disabled === 'yes'
                          ? 'Yes'
                          : 'No'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">In College</p>
                      <p className="font-medium">
                        {taxDetailsLead.full_form_data.dependents_in_college === 'yes' ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Child Care Provider</p>
                      <p className="font-medium">
                        {taxDetailsLead.full_form_data.child_care_provider === 'yes' ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Property & Credits */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                    Property & Credits
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Has Mortgage</p>
                    <p className="font-medium">
                      {taxDetailsLead.full_form_data.has_mortgage === 'yes' ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Previously Denied EITC</p>
                    <p className="font-medium">
                      {taxDetailsLead.full_form_data.denied_eitc === 'yes' ? 'Yes' : 'No'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* IRS & Refund */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide">IRS & Refund</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Has IRS PIN</p>
                    <p className="font-medium">
                      {taxDetailsLead.full_form_data.has_irs_pin === 'yes'
                        ? `Yes (${taxDetailsLead.full_form_data.irs_pin || 'N/A'})`
                        : taxDetailsLead.full_form_data.has_irs_pin === 'yes_locate'
                        ? 'Yes (Need to Locate)'
                        : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Wants Refund Advance</p>
                    <p className="font-medium">
                      {taxDetailsLead.full_form_data.wants_refund_advance === 'yes' ? 'Yes' : 'No'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Identification */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                    Identification
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Driver's License</p>
                    <p className="font-medium">{taxDetailsLead.full_form_data.drivers_license || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">License Expiration</p>
                    <p className="font-medium">
                      {taxDetailsLead.full_form_data.license_expiration || 'N/A'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Source / Attribution */}
              {taxDetailsLead.referrerUsername && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-purple-700">
                      🔗 Lead Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Referrer Code</p>
                      <p className="font-medium">{taxDetailsLead.referrerUsername}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Source Type</p>
                      <p className="font-medium capitalize">{taxDetailsLead.referrerType?.replace(/_/g, ' ') || 'Direct'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Marketing Link</p>
                      <a
                        href={`https://taxgeniuspro.tax/go/${taxDetailsLead.referrerUsername}-intake`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-purple-600 hover:underline"
                      >
                        taxgeniuspro.tax/go/{taxDetailsLead.referrerUsername}-intake
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setTaxDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unqualified Dialog */}
      <Dialog open={unqualifiedDialogOpen} onOpenChange={setUnqualifiedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Lead as Unqualified</DialogTitle>
            <DialogDescription>
              Indicate why{' '}
              {unqualifiedLead && `${unqualifiedLead.first_name} ${unqualifiedLead.last_name}`} cannot be helped.
              This will remove them from the active leads list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <Select value={unqualifiedReason} onValueChange={setUnqualifiedReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {UNQUALIFIED_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                Notes {unqualifiedReason === 'other' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                placeholder="Additional details about why this lead is unqualified..."
                value={unqualifiedNotes}
                onChange={(e) => setUnqualifiedNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnqualifiedDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitUnqualify}
              disabled={!unqualifiedReason || (unqualifiedReason === 'other' && !unqualifiedNotes.trim()) || submitting}
              className="bg-gray-600 hover:bg-gray-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark Unqualified
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Conversion Dialog - legacy component, may need CRMContact version */}
      <LeadConversionDialog
        open={conversionDialogOpen}
        onOpenChange={setConversionDialogOpen}
        lead={conversionLead}
        onConversionComplete={() => {
          fetchContacts();
          setConversionLead(null);
        }}
      />
    </div>
  );
}
