'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WorkflowTrigger } from '@prisma/client';
import { logger } from '@/lib/logger';

interface CreateWorkflowDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function CreateWorkflowDialog({ trigger, onSuccess }: CreateWorkflowDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: 'TICKET_CREATED' as WorkflowTrigger,
    priority: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a workflow name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/support/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          isActive: false, // Start as inactive
          conditions: [],
          actions: [],
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create workflow');
      }

      toast({
        title: 'Success',
        description: 'Workflow created successfully. Add conditions and actions to complete it.',
      });

      setOpen(false);
      resetForm();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      logger.error('Error creating workflow:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create workflow',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger: 'TICKET_CREATED',
      priority: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button>Create Workflow</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Workflow</DialogTitle>
            <DialogDescription>
              Set up an automated workflow for ticket management. You can add conditions and actions
              after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="workflow-name">
                Workflow Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="workflow-name"
                placeholder="e.g., Auto-Welcome New Clients"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                disabled={loading}
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="workflow-description">Description (optional)</Label>
              <Textarea
                id="workflow-description"
                placeholder="Describe what this workflow does..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                disabled={loading}
                className="resize-none"
              />
            </div>

            {/* Trigger */}
            <div className="grid gap-2">
              <Label htmlFor="workflow-trigger">
                Trigger Event <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.trigger}
                onValueChange={(value: WorkflowTrigger) =>
                  setFormData((prev) => ({ ...prev, trigger: value }))
                }
                disabled={loading}
              >
                <SelectTrigger id="workflow-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TICKET_CREATED">Ticket Created</SelectItem>
                  <SelectItem value="TICKET_UPDATED">Ticket Updated</SelectItem>
                  <SelectItem value="TICKET_IDLE">Ticket Idle</SelectItem>
                  <SelectItem value="CLIENT_RESPONSE">Client Response</SelectItem>
                  <SelectItem value="PREPARER_RESPONSE">Preparer Response</SelectItem>
                  <SelectItem value="TICKET_ASSIGNED">Ticket Assigned</SelectItem>
                  <SelectItem value="TICKET_UNASSIGNED">Ticket Unassigned</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">When should this workflow execute?</p>
            </div>

            {/* Priority */}
            <div className="grid gap-2">
              <Label htmlFor="workflow-priority">Priority</Label>
              <Input
                id="workflow-priority"
                type="number"
                min="0"
                max="100"
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, priority: parseInt(e.target.value) || 0 }))
                }
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Higher priority workflows execute first (0-100)
              </p>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Next Steps:</strong> After creating the workflow, you can:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 ml-4 list-disc">
                <li>Add conditions to control when the workflow runs</li>
                <li>Configure actions to perform automatically</li>
                <li>Enable the workflow to start automation</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Workflow'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
