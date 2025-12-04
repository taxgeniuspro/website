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
  Loader2,
  UserCheck,
  PhoneCall,
  FileText,
  TrendingUp,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

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
  created_at: string;
  updated_at: string;
  full_form_data?: any;
}

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
}

interface LeadDashboardProps {
  preparerId?: string;
  isAdmin?: boolean;
}

const LEAD_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-500', icon: AlertCircle },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500', icon: PhoneCall },
  { value: 'qualified', label: 'Qualified', color: 'bg-green-500', icon: CheckCircle },
  { value: 'converted', label: 'Converted', color: 'bg-purple-500', icon: UserCheck },
];

export function LeadDashboard({ preparerId, isAdmin = false }: LeadDashboardProps) {
  const [leads, setLeads] = useState<TaxIntakeLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
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

  // Fetch leads
  useEffect(() => {
    fetchLeads();
  }, [preparerId, statusFilter, searchTerm]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (preparerId && !isAdmin) {
        params.append('preparerId', preparerId);
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/tax-preparer/leads?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }

      const data = await response.json();
      setLeads(data.leads || []);
      setStats(data.stats || stats);
    } catch (err: any) {
      setError(err.message);
      logger.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLeadStatus = (lead: TaxIntakeLead): string => {
    if (lead.convertedToClient) return 'converted';
    if (lead.contactNotes && lead.lastContactedAt) return 'qualified';
    if (lead.lastContactedAt) return 'contacted';
    return 'new';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = LEAD_STATUSES.find((s) => s.value === status);
    if (!statusConfig) return null;

    const Icon = statusConfig.icon;
    return (
      <Badge className={cn('gap-1', statusConfig.color, 'text-white')}>
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

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

      // Refresh leads
      await fetchLeads();
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
      await fetchLeads();
    } catch (err: any) {
      logger.error('Error converting lead:', err);
      alert('Failed to convert lead. Please try again.');
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      searchTerm === '' ||
      lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm);

    const leadStatus = getLeadStatus(lead);
    const matchesStatus = statusFilter === 'all' || leadStatus === statusFilter;

    return matchesSearch && matchesStatus;
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
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>New</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.new}</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Contacted</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.contacted}</CardTitle>
          </CardHeader>
          <CardContent>
            <PhoneCall className="h-4 w-4 text-yellow-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Qualified</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.qualified}</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>My Leads</CardTitle>
              <CardDescription>Contact and manage your assigned leads</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leads found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLeads.map((lead) => {
                const status = getLeadStatus(lead);
                return (
                  <Card key={lead.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        {/* Lead Info */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {lead.first_name} {lead.middle_name ? lead.middle_name + ' ' : ''}
                                {lead.last_name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusBadge(status)}
                                {lead.referrerUsername && (
                                  <Badge variant="outline" className="text-xs">
                                    Ref: {lead.referrerUsername}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(lead.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>

                          <div className="grid gap-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <a href={`mailto:${lead.email}`} className="hover:underline">
                                {lead.email}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <a href={`tel:${lead.country_code}${lead.phone}`} className="hover:underline">
                                {lead.country_code} {lead.phone}
                              </a>
                            </div>
                            {lead.address_line_1 && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>
                                  {lead.city}, {lead.state} {lead.zip_code}
                                </span>
                              </div>
                            )}
                          </div>

                          {lead.lastContactedAt && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              Last contacted: {format(new Date(lead.lastContactedAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          )}

                          {lead.contactNotes && (
                            <div className="bg-muted p-3 rounded-md text-sm">
                              <p className="font-medium mb-1">Latest Note:</p>
                              <p className="text-muted-foreground">{lead.contactNotes}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 md:w-48">
                          {lead.full_form_data && (
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full bg-primary text-primary-foreground"
                              onClick={() => {
                                setTaxDetailsLead(lead);
                                setTaxDetailsDialogOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Tax Details
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleAddContact(lead)}
                            disabled={lead.convertedToClient}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Add Note
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            asChild
                            disabled={lead.convertedToClient}
                          >
                            <a href={`tel:${lead.country_code}${lead.phone}`}>
                              <PhoneCall className="h-4 w-4 mr-2" />
                              Call Lead
                            </a>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            asChild
                            disabled={lead.convertedToClient}
                          >
                            <a href={`mailto:${lead.email}`}>
                              <Mail className="h-4 w-4 mr-2" />
                              Email Lead
                            </a>
                          </Button>

                          {!lead.convertedToClient && status === 'qualified' && (
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full bg-green-600 hover:bg-green-700"
                              onClick={() => handleConvertToClient(lead.id)}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Convert to Client
                            </Button>
                          )}

                          {lead.convertedToClient && (
                            <Badge className="w-full justify-center bg-purple-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Converted
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
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setTaxDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
