'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  UserCheck,
  Phone,
  Calendar,
  Users,
  Briefcase,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { TableSkeleton, StatCardSkeleton } from '@/components/SkeletonPatterns';

interface PreparerApplication {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  languages: string;
  smsConsent: boolean;
  experienceLevel?: string;
  taxSoftware: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  stage: 'NEW' | 'CONTACTED' | 'INTERVIEWED' | 'DECISION';
  interviewScheduled?: string;
  interviewNotes?: string;
  convertedToRole?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ActionDialog {
  open: boolean;
  application: PreparerApplication | null;
  action: 'approve' | 'reject' | 'stage' | null;
}

const STAGES = ['NEW', 'CONTACTED', 'INTERVIEWED', 'DECISION'] as const;

const stageLabels: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  INTERVIEWED: 'Interviewed',
  DECISION: 'Decision',
};

const stageColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 border-blue-200',
  CONTACTED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  INTERVIEWED: 'bg-purple-100 text-purple-800 border-purple-200',
  DECISION: 'bg-green-100 text-green-800 border-green-200',
};

export default function PreparerApplicationsPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoaded = status !== 'loading';
  const [applications, setApplications] = useState<PreparerApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<PreparerApplication[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<ActionDialog>({
    open: false,
    application: null,
    action: null,
  });
  const [notes, setNotes] = useState('');
  const [targetRole, setTargetRole] = useState<string>('tax_preparer');
  const [newStage, setNewStage] = useState<string>('');
  const [interviewDate, setInterviewDate] = useState<string>('');
  const [interviewNotes, setInterviewNotes] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');
  const { toast } = useToast();

  // Check permissions
  const isAdmin = user?.role === 'admin' || user?.role === 'admin';

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
  }, [search, statusFilter, stageFilter, applications]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/preparer-applications');
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
      logger.error('Error fetching preparer applications:', error);
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

    // Filter by stage
    if (stageFilter !== 'all') {
      filtered = filtered.filter((app) => app.stage === stageFilter);
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

  const handleApproval = async () => {
    if (!actionDialog.application) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `/api/admin/preparer-applications/${actionDialog.application.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
            notes: notes || undefined,
            targetRole: targetRole,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message || 'Application approved successfully',
        });

        fetchApplications();
        closeDialog();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to approve application',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error approving application:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve application',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejection = async () => {
    if (!actionDialog.application) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `/api/admin/preparer-applications/${actionDialog.application.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reject',
            notes: notes || undefined,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Application rejected',
        });

        fetchApplications();
        closeDialog();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to reject application',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error rejecting application:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject application',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStageUpdate = async () => {
    if (!actionDialog.application) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `/api/admin/preparer-applications/${actionDialog.application.id}/stage`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: newStage || undefined,
            interviewScheduled: interviewDate || undefined,
            interviewNotes: interviewNotes || undefined,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Application updated successfully',
        });

        fetchApplications();
        closeDialog();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update application',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error updating application stage:', error);
      toast({
        title: 'Error',
        description: 'Failed to update application',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openActionDialog = (
    application: PreparerApplication,
    action: 'approve' | 'reject' | 'stage'
  ) => {
    setActionDialog({ open: true, application, action });
    setNotes(application.notes || '');
    setTargetRole('tax_preparer');
    setNewStage(application.stage || 'NEW');
    setInterviewDate(application.interviewScheduled || '');
    setInterviewNotes(application.interviewNotes || '');
  };

  const closeDialog = () => {
    setActionDialog({ open: false, application: null, action: null });
    setNotes('');
    setTargetRole('tax_preparer');
    setNewStage('');
    setInterviewDate('');
    setInterviewNotes('');
  };

  const moveToNextStage = async (application: PreparerApplication) => {
    const currentIndex = STAGES.indexOf(application.stage as typeof STAGES[number]);
    if (currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1];

      try {
        const response = await fetch(
          `/api/admin/preparer-applications/${application.id}/stage`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage: nextStage }),
          }
        );

        if (response.ok) {
          toast({
            title: 'Success',
            description: `Moved to ${stageLabels[nextStage]}`,
          });
          fetchApplications();
        }
      } catch (error) {
        logger.error('Error moving to next stage:', error);
      }
    }
  };

  const experienceLevelLabels: Record<string, string> = {
    NEW: 'New to Tax Prep',
    INTERMEDIATE: '1-3 Years',
    SEASONED: '3+ Years',
  };

  const roleLabels: Record<string, { label: string; description: string }> = {
    tax_preparer: {
      label: 'Tax Preparer',
      description: 'Full access to prepare tax returns. Gets tracking code + QR codes.',
    },
    affiliate: {
      label: 'Affiliate',
      description: 'Referral commissions only. Gets referral links + QR codes.',
    },
    client: {
      label: 'Client',
      description: 'Standard client access. Can refer friends.',
    },
  };

  const statusStats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'PENDING').length,
    approved: applications.filter((a) => a.status === 'APPROVED').length,
    rejected: applications.filter((a) => a.status === 'REJECTED').length,
  };

  const stageStats = {
    NEW: applications.filter((a) => a.stage === 'NEW' && a.status === 'PENDING').length,
    CONTACTED: applications.filter((a) => a.stage === 'CONTACTED' && a.status === 'PENDING').length,
    INTERVIEWED: applications.filter((a) => a.stage === 'INTERVIEWED' && a.status === 'PENDING')
      .length,
    DECISION: applications.filter((a) => a.stage === 'DECISION' && a.status === 'PENDING').length,
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

  const renderPipelineView = () => {
    const pendingApps = applications.filter((a) => a.status === 'PENDING');

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const stageApps = pendingApps.filter((a) => a.stage === stage);
          return (
            <div key={stage} className="space-y-3">
              <div
                className={`rounded-lg p-3 border ${stageColors[stage]} flex items-center justify-between`}
              >
                <span className="font-medium">{stageLabels[stage]}</span>
                <Badge variant="secondary">{stageApps.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {stageApps.map((app) => (
                  <Card key={app.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <div className="font-medium text-sm">
                        {app.firstName} {app.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{app.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </div>
                      {app.interviewScheduled && (
                        <div className="flex items-center gap-1 text-xs text-purple-600">
                          <Calendar className="h-3 w-3" />
                          {new Date(app.interviewScheduled).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex gap-1 pt-1">
                        {stage !== 'DECISION' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => moveToNextStage(app)}
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Next
                          </Button>
                        )}
                        {stage === 'DECISION' && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs"
                            onClick={() => openActionDialog(app, 'approve')}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => openActionDialog(app, 'stage')}
                        >
                          <Clock className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {stageApps.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                    No applications
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Preparer Leads</h1>
          <p className="text-muted-foreground mt-2">
            Review applications and convert to Client, Affiliate, or Tax Preparer
          </p>
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'pipeline')}>
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          </TabsList>
        </Tabs>
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

      {/* Pipeline Stats */}
      {viewMode === 'table' && (
        <div className="flex gap-2 flex-wrap">
          {STAGES.map((stage) => (
            <Badge
              key={stage}
              variant="outline"
              className={`${stageColors[stage]} cursor-pointer`}
              onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}
            >
              {stageLabels[stage]}: {stageStats[stage]}
            </Badge>
          ))}
        </div>
      )}

      {/* Search and Filter */}
      {viewMode === 'table' && (
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
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stageLabels[stage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* View Content */}
      {viewMode === 'pipeline' ? (
        renderPipelineView()
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Stage</TableHead>
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
                        {application.firstName}{' '}
                        {application.middleName ? `${application.middleName} ` : ''}
                        {application.lastName}
                      </TableCell>
                      <TableCell>{application.email}</TableCell>
                      <TableCell>{application.phone}</TableCell>
                      <TableCell>
                        {application.experienceLevel ? (
                          <Badge variant="outline">
                            {experienceLevelLabels[application.experienceLevel] ||
                              application.experienceLevel}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${stageColors[application.stage || 'NEW']} cursor-pointer`}
                          onClick={() => openActionDialog(application, 'stage')}
                        >
                          {stageLabels[application.stage || 'NEW']}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(application.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {application.status === 'PENDING' && (
                          <Badge variant="default" className="bg-yellow-500">
                            Pending
                          </Badge>
                        )}
                        {application.status === 'APPROVED' && (
                          <Badge variant="default">
                            {application.convertedToRole
                              ? roleLabels[application.convertedToRole]?.label || 'Approved'
                              : 'Approved'}
                          </Badge>
                        )}
                        {application.status === 'REJECTED' && (
                          <Badge variant="destructive">Rejected</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {application.status === 'PENDING' && (
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
                        {application.status !== 'PENDING' && (
                          <Badge variant="outline" className="cursor-default">
                            {application.status === 'APPROVED' ? 'Processed' : 'Closed'}
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
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approve' && 'Approve Application'}
              {actionDialog.action === 'reject' && 'Reject Application'}
              {actionDialog.action === 'stage' && 'Update Application'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'approve' &&
                'Select a role for this applicant and create their account.'}
              {actionDialog.action === 'reject' && 'This will reject the application.'}
              {actionDialog.action === 'stage' &&
                'Update the pipeline stage and interview details.'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.application && (
            <div className="space-y-4">
              {/* Applicant Info */}
              <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
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
                {actionDialog.application.experienceLevel && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Experience:</span>
                    <span className="text-sm">
                      {experienceLevelLabels[actionDialog.application.experienceLevel]}
                    </span>
                  </div>
                )}
              </div>

              {/* Role Selection (for approve action) */}
              {actionDialog.action === 'approve' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Role for New Account:</Label>
                  <RadioGroup value={targetRole} onValueChange={setTargetRole} className="space-y-2">
                    {Object.entries(roleLabels).map(([role, info]) => (
                      <div
                        key={role}
                        className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          targetRole === role ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setTargetRole(role)}
                      >
                        <RadioGroupItem value={role} id={role} className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor={role} className="font-medium cursor-pointer">
                            {role === 'tax_preparer' && <Briefcase className="h-4 w-4 inline mr-2" />}
                            {role === 'affiliate' && <Users className="h-4 w-4 inline mr-2" />}
                            {role === 'client' && <UserCheck className="h-4 w-4 inline mr-2" />}
                            {info.label}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Stage Update (for stage action) */}
              {actionDialog.action === 'stage' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pipeline Stage</Label>
                    <Select value={newStage} onValueChange={setNewStage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stageLabels[stage]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Interview Date/Time</Label>
                    <Input
                      type="datetime-local"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Interview Notes</Label>
                    <Textarea
                      value={interviewNotes}
                      onChange={(e) => setInterviewNotes(e.target.value)}
                      placeholder="Notes from the interview..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Notes (for approve/reject) */}
              {(actionDialog.action === 'approve' || actionDialog.action === 'reject') && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
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
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={actionLoading}>
              Cancel
            </Button>
            {actionDialog.action === 'approve' && (
              <Button onClick={handleApproval} disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve as {roleLabels[targetRole]?.label}
              </Button>
            )}
            {actionDialog.action === 'reject' && (
              <Button variant="destructive" onClick={handleRejection} disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reject Application
              </Button>
            )}
            {actionDialog.action === 'stage' && (
              <Button onClick={handleStageUpdate} disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Application
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
