'use client';

/**
 * Client Tax Forms Page
 *
 * Shows only tax forms that have been assigned by the client's tax preparer
 * Displays assignment status, notes, and allows form filling
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  Edit,
  Eye,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AssignedForm {
  id: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED';
  progress: number;
  notes?: string;
  formData?: Record<string, unknown>;
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
  lastEditedAt?: string;
  taxForm: {
    id: string;
    formNumber: string;
    title: string;
    description?: string;
    category: string;
    taxYear: number;
    fileUrl: string;
    fileName: string;
  };
  assignedBy: {
    name: string;
  };
}

const statusConfig = {
  ASSIGNED: {
    label: 'Not Started',
    icon: AlertCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  REVIEWED: {
    label: 'Reviewed',
    icon: CheckCircle2,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
};

export default function ClientFormsPage() {
  const [assignments, setAssignments] = useState<AssignedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignedForms();
  }, []);

  const fetchAssignedForms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tax-forms/assigned');

      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load your assigned tax forms',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error fetching assigned tax forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your assigned tax forms',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (formId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/tax-forms/${formId}/download`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Success',
          description: `${fileName} downloaded successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to download form',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error downloading form:', error);
      toast({
        title: 'Error',
        description: 'Failed to download form',
        variant: 'destructive',
      });
    }
  };

  const handleStartFilling = (assignmentId: string) => {
    router.push(`/dashboard/client/tax-forms/${assignmentId}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your assigned forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Tax Forms</h1>
        <p className="text-muted-foreground mt-2">Tax forms assigned to you by your tax preparer</p>
      </div>

      {/* Info Alert */}
      {assignments.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tax forms have been assigned to you yet. Your tax preparer will assign the forms you
            need to complete. If you believe you should have forms assigned, please contact your tax
            preparer.
          </AlertDescription>
        </Alert>
      )}

      {/* Assigned Forms List */}
      {assignments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {assignments.map((assignment) => {
            const config = statusConfig[assignment.status];
            const StatusIcon = config.icon;

            return (
              <Card
                key={assignment.id}
                className={cn('hover:shadow-lg transition-all', config.borderColor, 'border-2')}
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="truncate">{assignment.taxForm.formNumber}</span>
                      </CardTitle>
                      <CardDescription className="mt-1">{assignment.taxForm.title}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge variant="outline">{assignment.taxForm.taxYear}</Badge>
                      <div
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                          config.bgColor,
                          config.color
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {config.label}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Description */}
                  {assignment.taxForm.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {assignment.taxForm.description}
                    </p>
                  )}

                  {/* Preparer Notes */}
                  {assignment.notes && (
                    <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-sm">
                        <strong className="text-blue-900 dark:text-blue-100">
                          Note from {assignment.assignedBy.name}:
                        </strong>
                        <p className="mt-1 text-blue-700 dark:text-blue-300">{assignment.notes}</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Progress Bar */}
                  {assignment.progress > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Completion Progress</span>
                        <span className="font-medium">{assignment.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full transition-all', config.bgColor)}
                          style={{ width: `${assignment.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Assigned {formatDate(assignment.assignedAt)}</span>
                    </div>
                    {assignment.lastEditedAt && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Edited {formatDate(assignment.lastEditedAt)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleDownload(assignment.taxForm.id, assignment.taxForm.fileName)
                    }
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Download PDF
                  </Button>
                  {assignment.status === 'ASSIGNED' && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleStartFilling(assignment.id)}
                    >
                      <Edit className="h-4 w-4 mr-1.5" />
                      Start Filling
                    </Button>
                  )}
                  {(assignment.status === 'IN_PROGRESS' || assignment.status === 'COMPLETED') && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleStartFilling(assignment.id)}
                    >
                      <Edit className="h-4 w-4 mr-1.5" />
                      Continue Editing
                    </Button>
                  )}
                  {assignment.status === 'REVIEWED' && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleStartFilling(assignment.id)}
                    >
                      <Eye className="h-4 w-4 mr-1.5" />
                      View Form
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats Summary */}
      {assignments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">{assignments.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Forms</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {assignments.filter((a) => a.status === 'IN_PROGRESS').length}
              </div>
              <p className="text-sm text-muted-foreground mt-1">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-green-600">
                {assignments.filter((a) => a.status === 'COMPLETED').length}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {assignments.filter((a) => a.status === 'REVIEWED').length}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Reviewed</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
