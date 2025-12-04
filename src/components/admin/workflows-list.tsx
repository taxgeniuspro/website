'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Edit, Trash2, Zap, GitBranch, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WorkflowTrigger } from '@prisma/client';
import { logger } from '@/lib/logger';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger: WorkflowTrigger;
  isActive: boolean;
  priority: number;
  conditions: any;
  actions: any;
  createdAt: string;
  executionCount?: number;
}

export function WorkflowsList() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/support/workflows');
      const data = await response.json();

      if (data.success) {
        setWorkflows(data.data.workflows || []);
      }
    } catch (error) {
      logger.error('Error fetching workflows:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workflows',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (id: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/support/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentState }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Workflow ${!currentState ? 'enabled' : 'disabled'} successfully`,
        });
        fetchWorkflows();
      } else {
        throw new Error(data.error || 'Failed to update workflow');
      }
    } catch (error) {
      logger.error('Error toggling workflow:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update workflow',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const response = await fetch(`/api/support/workflows/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Workflow deleted successfully',
        });
        fetchWorkflows();
      } else {
        throw new Error(data.error || 'Failed to delete workflow');
      }
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete workflow',
        variant: 'destructive',
      });
    }
  };

  const getTriggerLabel = (trigger: WorkflowTrigger): string => {
    const labels: Record<WorkflowTrigger, string> = {
      TICKET_CREATED: 'Ticket Created',
      TICKET_UPDATED: 'Ticket Updated',
      TICKET_IDLE: 'Ticket Idle',
      CLIENT_RESPONSE: 'Client Response',
      PREPARER_RESPONSE: 'Preparer Response',
      TICKET_ASSIGNED: 'Ticket Assigned',
      TICKET_UNASSIGNED: 'Ticket Unassigned',
    };
    return labels[trigger] || trigger;
  };

  const getTriggerColor = (trigger: WorkflowTrigger): string => {
    const colors: Record<WorkflowTrigger, string> = {
      TICKET_CREATED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      TICKET_UPDATED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      TICKET_IDLE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      CLIENT_RESPONSE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      PREPARER_RESPONSE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      TICKET_ASSIGNED: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      TICKET_UNASSIGNED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[trigger] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No workflows yet. Create your first workflow!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {workflows.map((workflow) => {
        const actionsArray = Array.isArray(workflow.actions) ? workflow.actions : [];
        const conditionsArray = Array.isArray(workflow.conditions)
          ? workflow.conditions
          : workflow.conditions?.conditions || [];

        return (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{workflow.name}</h3>
                        {workflow.isActive ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <Zap className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          Priority: {workflow.priority}
                        </Badge>
                      </div>
                      {workflow.description && (
                        <p className="text-sm text-muted-foreground">{workflow.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Trigger */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Trigger:</span>
                    <Badge className={getTriggerColor(workflow.trigger)}>
                      {getTriggerLabel(workflow.trigger)}
                    </Badge>
                  </div>

                  {/* Conditions */}
                  {conditionsArray.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Conditions:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {conditionsArray.map((condition: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {condition.field} {condition.operator} {condition.value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div>
                    <span className="text-sm font-medium">Actions ({actionsArray.length}):</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {actionsArray.map((action: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {action.type?.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created: {new Date(workflow.createdAt).toLocaleDateString()}</span>
                    {workflow.executionCount !== undefined && (
                      <span>Executed: {workflow.executionCount} times</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={workflow.isActive}
                      onCheckedChange={() => toggleWorkflow(workflow.id, workflow.isActive)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {workflow.isActive ? 'On' : 'Off'}
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(workflow.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
