'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

interface EditHistory {
  id: string;
  editedBy: {
    id: string;
    name: string;
    role: string;
  };
  fieldChanges: Record<string, { old: any; new: any }>;
  editNote?: string;
  editedAt: string;
}

interface FormHistoryModalProps {
  open: boolean;
  onClose: () => void;
  token: string;
  canRevert?: boolean;
}

export function FormHistoryModal({ open, onClose, token, canRevert = false }: FormHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<EditHistory[]>([]);
  const [reverting, setReverting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, token]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/shared-forms/${token}/history`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data.history || []);
    } catch (error: any) {
      setError(error.message);
      toast.error('Failed to load history', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (editId: string) => {
    if (!confirm('Are you sure you want to revert to this version? This will overwrite current data.')) {
      return;
    }

    try {
      setReverting(editId);

      const response = await fetch(`/api/shared-forms/${token}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revert form');
      }

      toast.success('Form reverted successfully', {
        description: 'The form has been restored to the selected version',
      });

      // Refresh history
      fetchHistory();
    } catch (error: any) {
      toast.error('Failed to revert form', {
        description: error.message,
      });
    } finally {
      setReverting(null);
    }
  };

  const formatFieldChange = (fieldName: string, change: { old: any; new: any }) => {
    return (
      <div key={fieldName} className="text-sm border-l-2 border-muted pl-3 py-1">
        <div className="font-medium text-muted-foreground">{fieldName}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-destructive line-through">
            {change.old === '' || change.old === null || change.old === undefined 
              ? '(empty)' 
              : String(change.old)}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="text-green-600 font-medium">
            {change.new === '' || change.new === null || change.new === undefined 
              ? '(empty)' 
              : String(change.new)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Form Version History
          </DialogTitle>
          <DialogDescription>
            View all changes made to this form and revert to previous versions
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No edit history yet</p>
            <p className="text-sm">Changes will appear here once edits are made</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {history.map((edit, index) => (
                <Card key={edit.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{edit.editedBy.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {edit.editedBy.role}
                            </Badge>
                          </div>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Latest
                            </Badge>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="text-sm text-muted-foreground">
                          {new Date(edit.editedAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>

                        {/* Edit note */}
                        {edit.editNote && (
                          <div className="text-sm italic text-muted-foreground">
                            "{edit.editNote}"
                          </div>
                        )}

                        {/* Field changes */}
                        {Object.keys(edit.fieldChanges).length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">
                              {Object.keys(edit.fieldChanges).length} field(s) changed:
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {Object.entries(edit.fieldChanges).map(([fieldName, change]) =>
                                formatFieldChange(fieldName, change)
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Revert button */}
                      {canRevert && index !== 0 && (
                        <LoadingButton
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevert(edit.id)}
                          loading={reverting === edit.id}
                          className="gap-2 shrink-0"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Revert
                        </LoadingButton>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
