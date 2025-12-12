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
  const canSeeAll = role === 'admin' || role === 'super_admin';

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

      {/* Stats Cards - Responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">New</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {contacts.filter((c) => c.stage === 'NEW').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {
                contacts.filter((c) => ['CONTACTED', 'QUALIFIED', 'DOCUMENTS'].includes(c.stage))
                  .length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Closed</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {contacts.filter((c) => c.stage === 'CLOSED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters - Mobile responsive */}
      <Card>
        <CardContent className="p-3 md:p-6">
          <div className="flex flex-col gap-3">
            {/* Search input - full width */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            {/* Filter chips - horizontally scrollable on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-auto min-w-[100px] h-9 text-xs md:text-sm">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                  <SelectItem value="QUALIFIED">Qualified</SelectItem>
                  <SelectItem value="DOCUMENTS">Documents</SelectItem>
                  <SelectItem value="FILED">Filed</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-auto min-w-[100px] h-9 text-xs md:text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="LEAD">Lead</SelectItem>
                  <SelectItem value="REFERRER">Referrer</SelectItem>
                </SelectContent>
              </Select>
              {/* Clear filters button when filters are active */}
              {(stageFilter !== 'all' || typeFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs whitespace-nowrap"
                  onClick={() => { setStageFilter('all'); setTypeFilter('all'); }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">{canSeeAll ? 'All Contacts' : 'My Assigned Contacts'}</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No contacts found</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {contacts.map((contact) => {
                  const FormIcon = getFormTypeIcon(contact.source);
                  return (
                    <div key={contact.id} className="border rounded-lg p-3 bg-card">
                      {/* Header: Avatar, Name, Stage Badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {contact.firstName[0]}{contact.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {contact.firstName} {contact.lastName}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Badge variant="outline" className={cn('text-xs px-1.5 py-0', getStageBadgeClass(contact.stage))}>
                                {contact.stage}
                              </Badge>
                              <span className="text-muted-foreground">·</span>
                              <span>{contact.contactType}</span>
                            </div>
                          </div>
                        </div>
                        {/* More Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canView && (
                              <DropdownMenuItem onClick={() => (window.location.href = `/crm/contacts/${contact.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            )}
                            {canEdit && (
                              <DropdownMenuItem onClick={() => (window.location.href = `/crm/contacts/${contact.id}?edit=true`)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {contact.clientFolderId && (
                              <DropdownMenuItem onClick={() => (window.location.href = `/dashboard/tax-preparer/documents?folderId=${contact.clientFolderId}`)}>
                                <FolderOpen className="h-4 w-4 mr-2" />
                                View Files
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(contact)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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

                      {/* Stage Selector (if can edit) */}
                      {canEdit && (
                        <div className="mb-3">
                          <Select
                            value={contact.stage}
                            onValueChange={(value) => handleStatusChange(contact.id, value)}
                            disabled={updatingStatus === contact.id}
                          >
                            <SelectTrigger className={cn('w-full h-9 text-xs', getStageBadgeClass(contact.stage))}>
                              {updatingStatus === contact.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <SelectValue placeholder="Change stage" />
                              )}
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
                          <a href={`tel:${contact.phone}`}>
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                          <a href={`sms:${contact.phone}`}>
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Text
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-9" asChild>
                          <a href={`mailto:${contact.email}`}>
                            <Mail className="w-4 h-4 mr-1" />
                            Email
                          </a>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Form Type</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Last Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            {contact.firstName} {contact.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                            {contact.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contact.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                              {contact.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Select
                              value={contact.stage}
                              onValueChange={(value) => handleStatusChange(contact.id, value)}
                              disabled={updatingStatus === contact.id}
                            >
                              <SelectTrigger
                                className={cn(
                                  'w-[140px] h-7 text-xs',
                                  contact.stage === 'NEW' && 'border-blue-500 text-blue-700',
                                  contact.stage === 'CONTACTED' && 'border-purple-500 text-purple-700',
                                  contact.stage === 'QUALIFIED' && 'border-indigo-500 text-indigo-700',
                                  contact.stage === 'DOCUMENTS' && 'border-yellow-500 text-yellow-700',
                                  contact.stage === 'FILED' && 'border-orange-500 text-orange-700',
                                  contact.stage === 'CLOSED' && 'border-green-500 text-green-700',
                                  contact.stage === 'LOST' && 'border-red-500 text-red-700'
                                )}
                              >
                                {updatingStatus === contact.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
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
                          ) : (
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
                          )}
                        </TableCell>
                        {/* Form Type Column */}
                        <TableCell>
                          {(() => {
                            const FormIcon = getFormTypeIcon(contact.source);
                            return (
                              <Badge
                                variant="outline"
                                className={cn('flex items-center gap-1 w-fit', getFormTypeBadgeClass(contact.source))}
                              >
                                <FormIcon className="h-3 w-3" />
                                {getFormTypeLabel(contact.source)}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        {/* Documents Column */}
                        <TableCell>
                          {contact.clientFolderId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => (window.location.href = `/dashboard/tax-preparer/documents?folderId=${contact.clientFolderId}`)}
                            >
                              <FolderOpen className="h-4 w-4 mr-1 text-primary" />
                              <span className="text-xs">Files</span>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No folder</span>
                          )}
                        </TableCell>
                        {/* Last Contact Column */}
                        <TableCell className="text-sm text-muted-foreground">
                          {contact.lastContactedAt
                            ? new Date(contact.lastContactedAt).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                        {/* Actions Column */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canView && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => (window.location.href = `/crm/contacts/${contact.id}`)}
                              >
                                View
                              </Button>
                            )}
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => (window.location.href = `/crm/contacts/${contact.id}?edit=true`)}
                              >
                                Edit
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(contact)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
