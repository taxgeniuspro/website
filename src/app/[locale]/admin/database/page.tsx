import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Database Management - Admin | Tax Genius Pro',
  description: 'Monitor and manage database operations',
};

async function isSuperAdmin() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role as string;
  return role === 'super_admin';
}

export default async function AdminDatabasePage() {
  const userIsSuperAdmin = await isSuperAdmin();

  if (!userIsSuperAdmin) {
    redirect('/forbidden');
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Database Management</h1>
        <p className="text-muted-foreground mt-1">
          Monitor database health, performance, and manage backups
        </p>
      </div>

      {/* Coming Soon Message */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Database Management Tools
          </CardTitle>
          <CardDescription>Real-time database monitoring and management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-sm mb-2">Coming Soon</p>
              <p className="text-sm text-muted-foreground">
                Database management tools are currently in development. This page will provide:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                <li>Real-time database health monitoring</li>
                <li>Storage usage and performance metrics</li>
                <li>Automated backup management</li>
                <li>Table statistics and query analytics</li>
                <li>Database optimization tools</li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              For immediate database access, please use direct PostgreSQL tools or contact system
              administrators.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
