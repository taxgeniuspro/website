import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WorkflowsList } from '@/components/admin/workflows-list';
import { CreateWorkflowDialog } from '@/components/admin/create-workflow-dialog';
import { Plus, Zap, GitBranch, Clock, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Ticket Workflows | Tax Genius Pro',
  description: 'Manage automated workflows for support tickets',
};

async function isAdmin() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role;
  return role === 'admin' || role === 'super_admin';
}

export default async function WorkflowsPage() {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect('/forbidden');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Ticket Workflows</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Automate ticket management with custom workflows
            </p>
          </div>
          <CreateWorkflowDialog
            trigger={
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Workflow
              </Button>
            }
          />
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">All configured workflows</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
              <Zap className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">Currently enabled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">Automated actions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">Successful executions</p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Triggers Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Available Triggers</CardTitle>
            <CardDescription>Workflows can be triggered by these events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-sm mb-1">Ticket Created</h4>
                <p className="text-xs text-muted-foreground">When a new ticket is submitted</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-sm mb-1">Ticket Updated</h4>
                <p className="text-xs text-muted-foreground">When ticket details change</p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-sm mb-1">Ticket Idle</h4>
                <p className="text-xs text-muted-foreground">When no activity for X hours</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <h4 className="font-semibold text-sm mb-1">Client Response</h4>
                <p className="text-xs text-muted-foreground">When client adds a message</p>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <h4 className="font-semibold text-sm mb-1">Preparer Response</h4>
                <p className="text-xs text-muted-foreground">When preparer replies</p>
              </div>
              <div className="p-4 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-200 dark:border-pink-800">
                <h4 className="font-semibold text-sm mb-1">Ticket Assigned</h4>
                <p className="text-xs text-muted-foreground">When preparer is assigned</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <h4 className="font-semibold text-sm mb-1">Ticket Unassigned</h4>
                <p className="text-xs text-muted-foreground">When preparer is removed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Actions Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Available Actions</CardTitle>
            <CardDescription>Workflows can perform these automated actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold text-sm mb-1">Assign Preparer</h4>
                <p className="text-xs text-muted-foreground">Auto-assign to specific preparer</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold text-sm mb-1">Send Notification</h4>
                <p className="text-xs text-muted-foreground">Email, Slack, or SMS alerts</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold text-sm mb-1">Add Tag</h4>
                <p className="text-xs text-muted-foreground">Auto-tag tickets by criteria</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold text-sm mb-1">Change Status</h4>
                <p className="text-xs text-muted-foreground">Update ticket status automatically</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold text-sm mb-1">Change Priority</h4>
                <p className="text-xs text-muted-foreground">Adjust priority based on rules</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold text-sm mb-1">Send Saved Reply</h4>
                <p className="text-xs text-muted-foreground">Auto-respond with templates</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold text-sm mb-1">Auto Close</h4>
                <p className="text-xs text-muted-foreground">Close idle or resolved tickets</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-semibold text-sm mb-1">Create Task</h4>
                <p className="text-xs text-muted-foreground">Generate follow-up tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflows List */}
        <Card>
          <CardHeader>
            <CardTitle>All Workflows</CardTitle>
            <CardDescription>Manage your automated ticket workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <WorkflowsList />
          </CardContent>
        </Card>

        {/* Example Workflows */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              Example Workflow Ideas
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              Get started with these common automation patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border">
                <h4 className="font-semibold mb-2">Auto-Welcome New Clients</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Trigger:</strong> Ticket Created (first ticket from client)
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Actions:</strong> Send "Welcome" saved reply + Add "new-client" tag
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border">
                <h4 className="font-semibold mb-2">Escalate Urgent Tickets</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Trigger:</strong> Ticket Created (priority = URGENT)
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Actions:</strong> Send SMS notification to manager + Add "escalated" tag
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border">
                <h4 className="font-semibold mb-2">Auto-Close Resolved Tickets</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Trigger:</strong> Ticket Idle (status = RESOLVED, 48+ hours)
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Actions:</strong> Change status to CLOSED + Send notification to client
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border">
                <h4 className="font-semibold mb-2">Follow-up Reminder</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Trigger:</strong> Preparer Response
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Actions:</strong> Create task "Check if client responded after 24h"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
