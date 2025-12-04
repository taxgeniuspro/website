'use client';

/**
 * Edit History Dialog
 *
 * Displays the complete edit history for a tax form assignment
 * Shows who made changes, when, and what fields were modified
 * Useful for collaboration and audit tracking
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { History, User, Clock, Edit, Loader2, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

interface EditEntry {
  id: string;
  editedBy: {
    name: string;
    role: string;
  };
  fieldChanges: Record<string, { old: unknown; new: unknown }>;
  editNote?: string;
  editedAt: string;
}

interface EditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  formNumber: string;
}

export function EditHistoryDialog({
  open,
  onOpenChange,
  assignmentId,
  formNumber,
}: EditHistoryDialogProps) {
  const [history, setHistory] = useState<EditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, assignmentId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tax-forms/assigned/${assignmentId}/history`);

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
      } else {
        throw new Error('Failed to fetch edit history');
      }
    } catch (err) {
      logger.error('Error fetching edit history', { error: err });
      setError('Failed to load edit history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string') return value || '(empty)';
    return String(value);
  };

  const getRoleBadge = (role: string) => {
    switch (role.toUpperCase()) {
      case 'CLIENT':
      case 'LEAD':
        return <Badge variant="secondary">Client</Badge>;
      case 'TAX_PREPARER':
        return <Badge variant="default">Tax Preparer</Badge>;
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return <Badge variant="destructive">Admin</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Edit History - {formNumber}
          </DialogTitle>
          <DialogDescription>Complete history of all changes made to this form</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading edit history...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchHistory} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No edit history yet. Changes will appear here once the form is edited.
            </p>
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-6">
              {history.map((entry, index) => (
                <div key={entry.id}>
                  {index > 0 && <Separator className="my-6" />}

                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Edit className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{entry.editedBy.name}</span>
                            {getRoleBadge(entry.editedBy.role)}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(entry.editedAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Edit Note */}
                    {entry.editNote && (
                      <div className="ml-11 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm italic text-muted-foreground">{entry.editNote}</p>
                      </div>
                    )}

                    {/* Field Changes */}
                    <div className="ml-11 space-y-2">
                      {Object.entries(entry.fieldChanges).map(([fieldName, change]) => (
                        <div
                          key={fieldName}
                          className="p-3 bg-muted/30 rounded-lg border border-border"
                        >
                          <p className="text-sm font-medium mb-2">{formatFieldName(fieldName)}</p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground mb-1">Previous Value:</p>
                              <p
                                className={cn(
                                  'font-mono p-2 rounded bg-background border',
                                  !change.old && 'text-muted-foreground italic'
                                )}
                              >
                                {formatValue(change.old)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">New Value:</p>
                              <p
                                className={cn(
                                  'font-mono p-2 rounded bg-background border',
                                  !change.new && 'text-muted-foreground italic'
                                )}
                              >
                                {formatValue(change.new)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Change Count */}
                    <div className="ml-11">
                      <Badge variant="outline">
                        {Object.keys(entry.fieldChanges).length} field
                        {Object.keys(entry.fieldChanges).length !== 1 ? 's' : ''} changed
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Format field names for display
 */
function formatFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
