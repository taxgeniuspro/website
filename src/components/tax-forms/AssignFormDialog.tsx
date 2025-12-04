'use client';

/**
 * Assign Form Dialog
 *
 * Dialog for tax preparers to assign tax forms to their clients
 * Allows selection of client, optional notes, and form assignment
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface Client {
  id: string;
  name: string;
  email?: string;
  hasAssignment?: boolean;
}

interface AssignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  formNumber: string;
  formTitle: string;
  onSuccess?: () => void;
}

export function AssignFormDialog({
  open,
  onOpenChange,
  formId,
  formNumber,
  formTitle,
  onSuccess,
}: AssignFormDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingClients, setFetchingClients] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open, formId]);

  const fetchClients = async () => {
    try {
      setFetchingClients(true);
      const response = await fetch('/api/preparers/clients');

      if (response.ok) {
        const data = await response.json();

        // Get assignments for this form to mark which clients already have it
        const assignmentsResponse = await fetch(`/api/tax-forms/assignments?formId=${formId}`);
        let assignedClientIds: string[] = [];

        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          assignedClientIds = assignmentsData.assignments.map((a: any) => a.clientId);
        }

        const clientsWithAssignmentStatus = data.clients.map((client: any) => ({
          id: client.id,
          name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unnamed Client',
          email: client.email,
          hasAssignment: assignedClientIds.includes(client.id),
        }));

        setClients(clientsWithAssignmentStatus);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load your clients',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your clients',
        variant: 'destructive',
      });
    } finally {
      setFetchingClients(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedClientId) {
      toast({
        title: 'No client selected',
        description: 'Please select a client to assign this form to',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/tax-forms/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          taxFormId: formId,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${formNumber} assigned to client successfully`,
        });

        // Reset form
        setSelectedClientId('');
        setNotes('');

        // Close dialog and trigger success callback
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to assign form',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error assigning form:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign form',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Assign Form to Client
          </DialogTitle>
          <DialogDescription>
            Assign {formNumber} - {formTitle} to one of your clients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Select Client
            </Label>
            {fetchingClients ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>You don&apos;t have any clients yet</p>
              </div>
            ) : (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger id="client">
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id} disabled={client.hasAssignment}>
                      <div className="flex items-center justify-between w-full">
                        <span>{client.name}</span>
                        {client.hasAssignment && (
                          <Badge variant="outline" className="ml-2">
                            <Check className="h-3 w-3 mr-1" />
                            Assigned
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedClient?.email && (
              <p className="text-xs text-muted-foreground">{selectedClient.email}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Instructions / Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any specific instructions or notes for your client..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              These notes will be visible to your client when they view this form
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading || !selectedClientId}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Assigning...
              </>
            ) : (
              'Assign Form'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
