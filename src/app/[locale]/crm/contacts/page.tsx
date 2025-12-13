'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Search,
  Plus,
  Mail,
  Phone,
  User,
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  FileText,
  AlertCircle,
  Loader2,
  FolderOpen,
  Pencil,
  Trash2,
  ClipboardList,
  MessageSquare,
  UserRound,
  MoreVertical,
  MessageCircle,
  Eye,
  ChevronDown,
} from 'lucide-react';

/**
 * CRM Contacts Page
 *
 * Accessible by:
 * - Super Admins (see all contacts)
 * - Admins (see all contacts)
 * - Tax Preparers (see only assigned contacts)
 *
 * Features:
 * - Contact list with search and filtering
 * - Pipeline stage management
 * - Contact creation and editing
 * - Row-level security enforcement
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
  source?: string;
  assignedPreparerId?: string;
  createdAt: string;
  lastContactedAt?: string;
  clientFolderId?: string;
  folderPath?: string;
  folderName?: string;
  _count?: {
    interactions: number;
    tasks: number;
  };
}

export default function CRMContactsPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoaded = status !== 'loading';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile(); // Must be called before any conditional returns

  // Check permissions
  const role = user?.role as UserRole | undefined;
  const permissions = role
    ? getUserPermissions(role, user?.permissions as any)
    : null;

  // 🎛️ Extract micro-permissions for contacts features
  const canView = permissions?.contacts_view ?? permissions?.addressBook ?? false;
  const canCreate = permissions?.contacts_create ?? false;
  const canEdit = permissions?.contacts_edit ?? false;
  const canDelete = permissions?.contacts_delete ?? false;
  const canExport = permissions?.contacts_export ?? false;

  // Redirect if no access
  useEffect(() => {
    if (isLoaded && (!user || !permissions?.addressBook)) {
      redirect('/forbidden');
    }
  }, [isLoaded, user, permissions]);

  // Fetch contacts
  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchContacts = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (stageFilter && stageFilter !== 'all') params.append('stage', stageFilter);
        if (typeFilter && typeFilter !== 'all') params.append('contactType', typeFilter);

        const response = await fetch(`/api/crm/contacts?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch contacts');
        }

        const data = await response.json();
        setContacts(data.data.contacts || []);
      } catch (err: any) {
        setError(err.message);
        logger.error('Error fetching contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [isLoaded, user, searchTerm, stageFilter, typeFilter]);

  const handleStatusChange = async (contactId: string, newStage: string) => {
    try {
      setUpdatingStatus(contactId);

      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update the contact in the local state
        setContacts((prev) =>
          prev.map((c) => (c.id === contactId ? { ...c, stage: newStage } : c))
        );

        toast({
          title: 'Success',
          description: 'Contact status updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update contact status',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      logger.error('Error updating contact status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update contact status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/crm/contacts/${contactToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== contactToDelete.id));
        toast({
          title: 'Success',
          description: 'Contact deleted successfully',
        });
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete contact',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      logger.error('Error deleting contact:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  // Helper function to get form type label from source
  const getFormTypeLabel = (source?: string): string => {
    if (!source) return 'Unknown';
    const sourceMap: Record<string, string> = {
      'tax_intake_form': 'Tax Intake',
      'tax_intake': 'Tax Intake',
      'contact_form': 'Contact Form',
      'referral': 'Referral',
      'manual': 'Manual',
      'import': 'Import',
    };
    return sourceMap[source.toLowerCase()] || source;
  };

  // Helper function to get badge variant for form type
  const getFormTypeBadgeClass = (source?: string): string => {
    if (!source) return '';
    const sourceClasses: Record<string, string> = {
      'tax_intake_form': 'bg-green-100 text-green-800 border-green-300',
      'tax_intake': 'bg-green-100 text-green-800 border-green-300',
      'contact_form': 'bg-blue-100 text-blue-800 border-blue-300',
      'referral': 'bg-purple-100 text-purple-800 border-purple-300',
      'manual': 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return sourceClasses[source.toLowerCase()] || '';
  };

  // Helper function to get icon for form type
  const getFormTypeIcon = (source?: string) => {
    if (!source) return FileText;
    const sourceIcons: Record<string, any> = {
      'tax_intake_form': ClipboardList,
      'tax_intake': ClipboardList,
      'contact_form': MessageSquare,
      'referral': UserRound,
      'manual': Pencil,
    };
    return sourceIcons[source.toLowerCase()] || FileText;
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const roleDisplay = role === 'tax_preparer' ? 'Tax Preparer' : 'Admin';
  const canSeeAll = role === 'admin' ;

  // Helper to get stage badge styling
  const getStageBadgeClass = (stage: string) => {
    const classes: Record<string, string> = {
      'NEW': 'bg-blue-100 text-blue-800 border-blue-300',
      'CONTACTED': 'bg-purple-100 text-purple-800 border-purple-300',
      'QUALIFIED': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'DOCUMENTS': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'FILED': 'bg-orange-100 text-orange-800 border-orange-300',
      'CLOSED': 'bg-green-100 text-green-800 border-green-300',
      'LOST': 'bg-red-100 text-red-800 border-red-300',
    };
    return classes[stage] || '';
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header - Mobile responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">CRM Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {canSeeAll ? 'Manage all contacts' : 'Your assigned contacts'}
          </p>
        </div>
        {canCreate && (
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        )}
      </div>

      {/* Stats Cards - Responsive grid with enhanced desktop view */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-4 lg:pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Total Contacts</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold">{contacts.length}</div>
            <p className="text-xs text-muted-foreground mt-1 hidden lg:block">All time contacts</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-4 lg:pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">New Leads</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <UserPlus className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-blue-600">
              {contacts.filter((c) => c.stage === 'NEW').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden lg:block">Awaiting contact</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-4 lg:pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">In Progress</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-full">
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-purple-600">
              {contacts.filter((c) => ['CONTACTED', 'QUALIFIED', 'DOCUMENTS'].includes(c.stage)).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden lg:block">Active pipeline</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-4 lg:pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Closed Won</CardTitle>
            <div className="p-2 bg-green-500/10 rounded-full">
              <UserCheck className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-green-600">
              {contacts.filter((c) => c.stage === 'CLOSED').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden lg:block">Converted clients</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow hidden lg:block">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-4 lg:pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Lost</CardTitle>
            <div className="p-2 bg-red-500/10 rounded-full">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-red-600">
              {contacts.filter((c) => c.stage === 'LOST').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Did not convert</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters - Fully responsive */}
      <Card>
        <CardContent className="p-3 lg:p-4">
          {/* Desktop: Single row layout | Mobile/Tablet: Stacked */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            {/* Search input */}
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 lg:h-11"
              />
            </div>

            {/* Filters - Scrollable on mobile, inline on desktop */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 scrollbar-hide">
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-auto min-w-[120px] lg:min-w-[140px] h-9 lg:h-10 text-xs lg:text-sm bg-background">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="NEW">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      New
                    </span>
                  </SelectItem>
                  <SelectItem value="CONTACTED">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Contacted
                    </span>
                  </SelectItem>
                  <SelectItem value="QUALIFIED">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Qualified
                    </span>
                  </SelectItem>
                  <SelectItem value="DOCUMENTS">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      Documents
                    </span>
                  </SelectItem>
                  <SelectItem value="FILED">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      Filed
                    </span>
                  </SelectItem>
                  <SelectItem value="CLOSED">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Closed
                    </span>
                  </SelectItem>
                  <SelectItem value="LOST">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Lost
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-auto min-w-[110px] lg:min-w-[130px] h-9 lg:h-10 text-xs lg:text-sm bg-background">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="LEAD">Lead</SelectItem>
                  <SelectItem value="REFERRER">Referrer</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear filters */}
              {(stageFilter !== 'all' || typeFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 lg:h-10 text-xs lg:text-sm whitespace-nowrap"
                  onClick={() => { setStageFilter('all'); setTypeFilter('all'); }}
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Results count - Desktop only */}
            <div className="hidden lg:flex items-center text-sm text-muted-foreground ml-auto">
              Showing <span className="font-medium text-foreground mx-1">{contacts.length}</span> contacts
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card>
        <CardHeader className="p-4 lg:p-6 pb-2 lg:pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base lg:text-lg">{canSeeAll ? 'All Contacts' : 'My Assigned Contacts'}</CardTitle>
              <CardDescription className="text-xs lg:text-sm mt-1">
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 lg:p-6 pt-0">
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          {contacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No contacts found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* ===== MOBILE VIEW (< 640px) - Stack Cards ===== */}
              <div className="sm:hidden space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="border rounded-lg p-3 bg-card hover:border-primary/30 transition-colors">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {contact.firstName[0]}{contact.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{contact.firstName} {contact.lastName}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Badge variant="outline" className={cn('text-xs px-1.5 py-0', getStageBadgeClass(contact.stage))}>
                              {contact.stage}
                            </Badge>
                            <span>·</span>
                            <span>{contact.contactType}</span>
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
                          {canView && (
                            <DropdownMenuItem onClick={() => (window.location.href = `/crm/contacts/${contact.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                          )}
                          {canEdit && (
                            <DropdownMenuItem onClick={() => (window.location.href = `/crm/contacts/${contact.id}?edit=true`)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                          )}
                          {contact.clientFolderId && (
                            <DropdownMenuItem onClick={() => (window.location.href = `/dashboard/tax-preparer/documents?folderId=${contact.clientFolderId}`)}>
                              <FolderOpen className="h-4 w-4 mr-2" /> Files
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem onClick={() => handleDeleteClick(contact)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {/* Contact Info */}
                    <div className="space-y-1 text-xs text-muted-foreground mb-3">
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-primary truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </a>
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-primary">
                          <Phone className="h-3 w-3 shrink-0" />
                          {contact.phone}
                        </a>
                      )}
                    </div>
                    {/* Stage Selector */}
                    {canEdit && (
                      <div className="mb-3">
                        <Select value={contact.stage} onValueChange={(value) => handleStatusChange(contact.id, value)} disabled={updatingStatus === contact.id}>
                          <SelectTrigger className={cn('w-full h-9 text-xs', getStageBadgeClass(contact.stage))}>
                            {updatingStatus === contact.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <SelectValue />}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NEW">New</SelectItem>
                            <SelectItem value="CONTACTED">Contacted</SelectItem>
                            <SelectItem value="QUALIFIED">Qualified</SelectItem>
                            <SelectItem value="DOCUMENTS">Documents</SelectItem>
                            <SelectItem value="FILED">Filed</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                            <SelectItem value="LOST">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                        <a href={`tel:${contact.phone}`}><Phone className="w-4 h-4 mr-1" />Call</a>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                        <a href={`sms:${contact.phone}`}><MessageCircle className="w-4 h-4 mr-1" />Text</a>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                        <a href={`mailto:${contact.email}`}><Mail className="w-4 h-4 mr-1" />Email</a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ===== TABLET VIEW (640px - 1024px) - Grid Cards ===== */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:hidden gap-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="border rounded-xl p-4 bg-card hover:shadow-md hover:border-primary/30 transition-all">
                    {/* Header with Avatar */}
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{contact.firstName} {contact.lastName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn('text-xs', getStageBadgeClass(contact.stage))}>
                            {contact.stage}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{contact.contactType}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canView && <DropdownMenuItem onClick={() => (window.location.href = `/crm/contacts/${contact.id}`)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>}
                          {canEdit && <DropdownMenuItem onClick={() => (window.location.href = `/crm/contacts/${contact.id}?edit=true`)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
                          {contact.clientFolderId && <DropdownMenuItem onClick={() => (window.location.href = `/dashboard/tax-preparer/documents?folderId=${contact.clientFolderId}`)}><FolderOpen className="h-4 w-4 mr-2" />View Files</DropdownMenuItem>}
                          {canDelete && <DropdownMenuItem onClick={() => handleDeleteClick(contact)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {/* Contact Details */}
                    <div className="space-y-2 mb-4">
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </a>
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                          <Phone className="h-4 w-4 shrink-0" />
                          {contact.phone}
                        </a>
                      )}
                      {contact.lastContactedAt && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          Last contact: {new Date(contact.lastContactedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {/* Stage Dropdown */}
                    {canEdit && (
                      <Select value={contact.stage} onValueChange={(value) => handleStatusChange(contact.id, value)} disabled={updatingStatus === contact.id}>
                        <SelectTrigger className={cn('w-full h-10 mb-3', getStageBadgeClass(contact.stage))}>
                          {updatingStatus === contact.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">New</SelectItem>
                          <SelectItem value="CONTACTED">Contacted</SelectItem>
                          <SelectItem value="QUALIFIED">Qualified</SelectItem>
                          <SelectItem value="DOCUMENTS">Documents</SelectItem>
                          <SelectItem value="FILED">Filed</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                          <SelectItem value="LOST">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" size="sm" className="h-10" asChild>
                        <a href={`tel:${contact.phone}`}><Phone className="w-4 h-4 mr-1" />Call</a>
                      </Button>
                      <Button variant="outline" size="sm" className="h-10" asChild>
                        <a href={`sms:${contact.phone}`}><MessageCircle className="w-4 h-4 mr-1" />Text</a>
                      </Button>
                      <Button variant="outline" size="sm" className="h-10" asChild>
                        <a href={`mailto:${contact.email}`}><Mail className="w-4 h-4 mr-1" />Email</a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ===== DESKTOP VIEW (>= 1024px) - Enhanced Table ===== */}
              <div className="hidden lg:block rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold">Contact</TableHead>
                      <TableHead className="font-semibold">Contact Info</TableHead>
                      <TableHead className="font-semibold">Stage</TableHead>
                      <TableHead className="font-semibold">Source</TableHead>
                      <TableHead className="font-semibold">Documents</TableHead>
                      <TableHead className="font-semibold">Last Contact</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact, index) => (
                      <TableRow
                        key={contact.id}
                        className={cn(
                          "hover:bg-muted/30 transition-colors",
                          index % 2 === 0 && "bg-muted/5"
                        )}
                      >
                        {/* Contact Name with Avatar */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                {contact.firstName[0]}{contact.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                              <p className="text-xs text-muted-foreground">{contact.contactType}</p>
                            </div>
                          </div>
                        </TableCell>
                        {/* Contact Info */}
                        <TableCell>
                          <div className="space-y-1">
                            <a href={`mailto:${contact.email}`} className="flex items-center text-sm text-foreground hover:text-primary hover:underline cursor-pointer transition-colors">
                              <Mail className="h-3.5 w-3.5 mr-2 shrink-0" />
                              <span className="max-w-[200px] truncate">{contact.email}</span>
                            </a>
                            {contact.phone && (
                              <a href={`tel:${contact.phone}`} className="flex items-center text-sm text-foreground hover:text-primary hover:underline cursor-pointer transition-colors">
                                <Phone className="h-3.5 w-3.5 mr-2 shrink-0" />
                                {contact.phone}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        {/* Stage */}
                        <TableCell>
                          {canEdit ? (
                            <Select
                              value={contact.stage}
                              onValueChange={(value) => handleStatusChange(contact.id, value)}
                              disabled={updatingStatus === contact.id}
                            >
                              <SelectTrigger
                                className={cn(
                                  'w-[130px] h-8 text-xs font-medium',
                                  getStageBadgeClass(contact.stage)
                                )}
                              >
                                {updatingStatus === contact.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NEW">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" />New
                                  </span>
                                </SelectItem>
                                <SelectItem value="CONTACTED">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500" />Contacted
                                  </span>
                                </SelectItem>
                                <SelectItem value="QUALIFIED">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500" />Qualified
                                  </span>
                                </SelectItem>
                                <SelectItem value="DOCUMENTS">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500" />Documents
                                  </span>
                                </SelectItem>
                                <SelectItem value="FILED">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500" />Filed
                                  </span>
                                </SelectItem>
                                <SelectItem value="CLOSED">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500" />Closed
                                  </span>
                                </SelectItem>
                                <SelectItem value="LOST">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />Lost
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className={cn('text-xs font-medium', getStageBadgeClass(contact.stage))}>
                              {contact.stage}
                            </Badge>
                          )}
                        </TableCell>
                        {/* Source/Form Type */}
                        <TableCell>
                          {(() => {
                            const FormIcon = getFormTypeIcon(contact.source);
                            return (
                              <Badge
                                variant="outline"
                                className={cn('flex items-center gap-1.5 w-fit text-xs', getFormTypeBadgeClass(contact.source))}
                              >
                                <FormIcon className="h-3 w-3" />
                                {getFormTypeLabel(contact.source)}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        {/* Documents */}
                        <TableCell>
                          {contact.clientFolderId ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={() => (window.location.href = `/dashboard/tax-preparer/documents?folderId=${contact.clientFolderId}`)}
                            >
                              <FolderOpen className="h-3.5 w-3.5 mr-1.5 text-primary" />
                              View Files
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {/* Last Contact */}
                        <TableCell>
                          <div className="text-sm">
                            {contact.lastContactedAt ? (
                              <>
                                <p className="text-foreground">{new Date(contact.lastContactedAt).toLocaleDateString()}</p>
                                <p className="text-xs text-muted-foreground">{new Date(contact.lastContactedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Never</span>
                            )}
                          </div>
                        </TableCell>
                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Quick Contact Buttons */}
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={`tel:${contact.phone}`} title="Call">
                                <Phone className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </a>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={`mailto:${contact.email}`} title="Email">
                                <Mail className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </a>
                            </Button>
                            {/* More Actions Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {canView && (
                                  <DropdownMenuItem onClick={() => (window.location.href = `/crm/contacts/${contact.id}`)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                )}
                                {canEdit && (
                                  <DropdownMenuItem onClick={() => (window.location.href = `/crm/contacts/${contact.id}?edit=true`)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit Contact
                                  </DropdownMenuItem>
                                )}
                                {contact.clientFolderId && (
                                  <DropdownMenuItem onClick={() => (window.location.href = `/dashboard/tax-preparer/documents?folderId=${contact.clientFolderId}`)}>
                                    <FolderOpen className="h-4 w-4 mr-2" />
                                    View Documents
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild>
                                  <a href={`sms:${contact.phone}`}>
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Send Text
                                  </a>
                                </DropdownMenuItem>
                                {canDelete && (
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(contact)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Contact
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>
                {contactToDelete?.firstName} {contactToDelete?.lastName}
              </strong>
              ? This action cannot be undone and will permanently remove this contact and all
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
