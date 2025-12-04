'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { TableSkeleton, StatCardSkeleton } from '@/components/SkeletonPatterns';

interface AffiliateApplication {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  marketingExperience?: string;
  audience?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'LOST';
  message?: string;
  createdAt: string;
  updatedAt: string;
}

interface ActionDialog {
  open: boolean;
  application: AffiliateApplication | null;
  action: 'approve' | 'reject' | null;
}

export default function AffiliateApplicationsPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoaded = status !== 'loading';
  const [applications, setApplications] = useState<AffiliateApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<AffiliateApplication[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<ActionDialog>({
    open: false,
    application: null,
    action: null,
  });
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  // Check permissions
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Redirect if no access
  useEffect(() => {
    if (isLoaded && (!user || !isAdmin)) {
      redirect('/forbidden');
    }
  }, [isLoaded, user, isAdmin]);

  // Show loading skeleton while checking auth
  if (!isLoaded || !isAdmin) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-md bg-muted animate-pulse" />
          <div className="h-5 w-96 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <TableSkeleton rows={10} columns={7} />
      </div>
    );
  }

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [search, statusFilter, applications]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/affiliate-applications');
      const data = await response.json();

      if (response.ok) {
        setApplications(data.applications);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load applications',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error fetching affiliate applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.firstName.toLowerCase().includes(searchLower) ||
          app.lastName.toLowerCase().includes(searchLower) ||
          app.email.toLowerCase().includes(searchLower) ||
          app.phone.includes(search)
      );
    }

    setFilteredApplications(filtered);
  };

  const handleAction = async () => {
    if (!actionDialog.application || !actionDialog.action) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `/api/admin/affiliate-applications/${actionDialog.application.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: actionDialog.action,
            notes: notes || undefined,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Application ${actionDialog.action === 'approve' ? 'approved' : 'rejected'} successfully`,
        });

        // Refresh applications
        fetchApplications();

        // Close dialog
        setActionDialog({ open: false, application: null, action: null });
        setNotes('');
      } else {
        toast({
          title: 'Error',
          description: data.error || `Failed to ${actionDialog.action} application`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error processing application action:', error);
      toast({
        title: 'Error',
        description: `Failed to ${actionDialog.action} application`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openActionDialog = (application: AffiliateApplication, action: 'approve' | 'reject') => {
    setActionDialog({ open: true, application, action });
    setNotes(application.message || '');
  };

  const statusStats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'NEW').length,
    approved: applications.filter((a) => a.status === 'CONTACTED' || a.status === 'QUALIFIED').length,
    rejected: applications.filter((a) => a.status === 'LOST').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Affiliate Applications</h1>
        <p className="text-muted-foreground mt-2">Review and manage affiliate partner applications</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Loader2 className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusStats.pending}</div>
            <p className="text-xs text-muted-foreground">Needs action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusStats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusStats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="CONTACTED">Approved</SelectItem>
            <SelectItem value="LOST">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No applications found
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {application.firstName} {application.lastName}
                    </TableCell>
                    <TableCell>{application.email}</TableCell>
                    <TableCell>{application.phone}</TableCell>
                    <TableCell>
                      {application.marketingExperience ? (
                        <span className="text-sm">{application.marketingExperience.slice(0, 30)}...</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not specified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {application.audience ? (
                        <span className="text-sm">{application.audience.slice(0, 30)}...</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not specified</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(application.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {application.status === 'NEW' && (
                        <Badge variant="default" className="bg-yellow-500">
                          New
                        </Badge>
                      )}
                      {(application.status === 'CONTACTED' || application.status === 'QUALIFIED') && (
                        <Badge variant="default">Approved</Badge>
                      )}
                      {application.status === 'LOST' && <Badge variant="destructive">Rejected</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {application.status === 'NEW' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openActionDialog(application, 'approve')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openActionDialog(application, 'reject')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {application.status !== 'NEW' && (
                        <Badge variant="outline" className="cursor-default">
                          {application.status === 'CONTACTED' || application.status === 'QUALIFIED'
                            ? 'Processed'
                            : 'Closed'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ open: false, application: null, action: null });
            setNotes('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approve' ? 'Approve' : 'Reject'} Application
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'approve'
                ? 'This will create an affiliate account and grant them access to the affiliate platform.'
                : 'This will reject the application and notify the applicant.'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.application && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Applicant:</span>
                  <span className="text-sm">
                    {actionDialog.application.firstName} {actionDialog.application.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{actionDialog.application.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Phone:</span>
                  <span className="text-sm">{actionDialog.application.phone}</span>
                </div>
                {actionDialog.application.marketingExperience && (
                  <div>
                    <span className="text-sm font-medium">Marketing Experience:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {actionDialog.application.marketingExperience}
                    </p>
                  </div>
                )}
                {actionDialog.application.audience && (
                  <div>
                    <span className="text-sm font-medium">Target Audience:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {actionDialog.application.audience}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Notes (optional)
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    actionDialog.action === 'approve'
                      ? 'Add any notes about this approval...'
                      : 'Add reason for rejection...'
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, application: null, action: null });
                setNotes('');
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionDialog.action === 'approve' ? 'Approve & Create Account' : 'Reject Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
