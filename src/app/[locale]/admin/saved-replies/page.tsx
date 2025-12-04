import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SavedRepliesList } from '@/components/admin/saved-replies-list';
import { CreateSavedReplyDialog } from '@/components/admin/create-saved-reply-dialog';
import { Plus, FileText, TrendingUp, Clock } from 'lucide-react';

export const metadata = {
  title: 'Saved Replies | Tax Genius Pro',
  description: 'Manage saved reply templates for support tickets',
};

async function isAdmin() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role;
  return role === 'admin' || role === 'super_admin' || role === 'tax_preparer';
}

export default async function SavedRepliesPage() {
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Saved Replies</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Create and manage response templates for common questions
            </p>
          </div>
          <CreateSavedReplyDialog
            trigger={
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            }
          />
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <p className="text-xs text-muted-foreground">All saved replies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Used</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-1" />
              <p className="text-xs text-muted-foreground">Top template this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <p className="text-xs text-muted-foreground">Est. hours saved</p>
            </CardContent>
          </Card>
        </div>

        {/* Template Categories Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Template Best Practices</CardTitle>
            <CardDescription>Tips for creating effective saved replies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">📝 Use Variables</h4>
                <p className="text-sm text-muted-foreground">
                  Include {`{{client_name}}`}, {`{{ticket_number}}`} for personalization
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">🏷️ Organize by Category</h4>
                <p className="text-sm text-muted-foreground">
                  Group templates: onboarding, tax-deductions, document-requests
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">✅ Keep it Professional</h4>
                <p className="text-sm text-muted-foreground">
                  Maintain consistent tone and include clear next steps
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saved Replies List */}
        <Card>
          <CardHeader>
            <CardTitle>All Templates</CardTitle>
            <CardDescription>
              Manage your saved reply templates. Click to edit or delete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SavedRepliesList />
          </CardContent>
        </Card>

        {/* Default Templates Info */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              Default Tax Templates Included
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              The system comes with pre-configured templates for common tax scenarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Welcome - New Client (onboarding)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Request Missing Documents (document-requests)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Deduction Explanation (tax-deductions)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Filing Status Update (status-updates)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Tax Extension Information (extensions)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Refund Timeline Explanation (refunds)</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
