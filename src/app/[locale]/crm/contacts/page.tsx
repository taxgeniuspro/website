'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getUserPermissions, UserRole } from '@/lib/permissions';
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
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  User,
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  Upload,
  FileText,
  AlertCircle,
  Loader2,
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
  assignedPreparerId?: string;
  createdAt: string;
  lastContactedAt?: string;
  _count?: {
    interactions: number;
    tasks: number;
  };
}

export default function CRMContactsPage() {
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();

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

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const roleDisplay = role === 'tax_preparer' ? 'Tax Preparer' : 'Admin';
  const canSeeAll = role === 'admin' || role === 'super_admin';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Contacts</h1>
          <p className="text-muted-foreground">
            {canSeeAll ? 'Manage all contacts in your system' : 'Manage your assigned contacts'}
          </p>
        </div>
        {canCreate && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter((c) => c.stage === 'NEW').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                contacts.filter((c) => ['CONTACTED', 'QUALIFIED', 'DOCUMENTS'].includes(c.stage))
                  .length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter((c) => c.stage === 'CLOSED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by stage" />
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
                <SelectItem value="LEAD">Lead</SelectItem>
                <SelectItem value="REFERRER">Referrer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>{canSeeAll ? 'All Contacts' : 'My Assigned Contacts'}</CardTitle>
          <CardDescription>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Lead Score</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Interactions</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No contacts found
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
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
                      <Badge variant="outline">{contact.contactType}</Badge>
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
                            <SelectItem value="NEW">🆕 New</SelectItem>
                            <SelectItem value="CONTACTED">💬 Contacted</SelectItem>
                            <SelectItem value="QUALIFIED">✅ Qualified</SelectItem>
                            <SelectItem value="DOCUMENTS">📄 Documents</SelectItem>
                            <SelectItem value="FILED">📋 Filed</SelectItem>
                            <SelectItem value="CLOSED">🎉 Closed</SelectItem>
                            <SelectItem value="LOST">❌ Lost</SelectItem>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              contact.leadScore >= 70 && 'bg-green-500',
                              contact.leadScore >= 40 && contact.leadScore < 70 && 'bg-yellow-500',
                              contact.leadScore < 40 && 'bg-red-500'
                            )}
                            style={{ width: `${contact.leadScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{contact.leadScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{contact._count?.tasks || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{contact._count?.interactions || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contact.lastContactedAt
                        ? new Date(contact.lastContactedAt).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      {canView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => (window.location.href = `/crm/contacts/${contact.id}`)}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
