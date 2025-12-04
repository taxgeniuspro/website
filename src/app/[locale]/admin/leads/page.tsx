'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadDashboard } from '@/components/crm/LeadDashboard';
import {
  Users,
  UserPlus,
  Phone as PhoneIcon,
  CheckCircle,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
}

/**
 * Admin Leads Management Page
 * /admin/leads
 *
 * Allows admins to view and manage all leads across all tax preparers
 * Provides overview stats and detailed lead management
 */
export default function AdminLeadsPage() {
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeadStats() {
      try {
        // Fetch all leads to get stats
        const response = await fetch('/api/tax-preparer/leads');
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats || stats);
        } else {
          logger.error('Failed to fetch lead stats');
        }
      } catch (error) {
        logger.error('Error fetching lead stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLeadStats();
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <UserPlus className="w-8 h-8" />
          Lead Management
        </h1>
        <p className="text-muted-foreground">
          View and manage all leads across all tax preparers
        </p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/clients-status">View Clients</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/users">Manage Users</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.total}</div>
            <p className="text-xs text-muted-foreground">All prospects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New</CardTitle>
            <AlertCircle className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{loading ? '...' : stats.new}</div>
            <p className="text-xs text-muted-foreground">Not contacted yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            <PhoneIcon className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? '...' : stats.contacted}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : stats.qualified}
            </div>
            <p className="text-xs text-muted-foreground">Ready to convert</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {loading ? '...' : stats.converted}
            </div>
            <p className="text-xs text-muted-foreground">Now clients</p>
          </CardContent>
        </Card>
      </div>

      {/* Lead Dashboard with Admin View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Leads</CardTitle>
              <CardDescription>View and manage leads across all tax preparers</CardDescription>
            </div>
            <Badge variant="outline" className="ml-auto">
              Admin View
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <LeadDashboard isAdmin={true} />
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lead Management Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              New Leads
            </h4>
            <p className="text-sm text-muted-foreground">
              Leads that have submitted the intake form but haven't been contacted yet. Assign these
              to tax preparers or contact them directly.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <PhoneIcon className="h-4 w-4 text-yellow-600" />
              Contacted Leads
            </h4>
            <p className="text-sm text-muted-foreground">
              Leads that have been contacted at least once. Follow up to qualify them for services.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Qualified Leads
            </h4>
            <p className="text-sm text-muted-foreground">
              Leads that have been contacted and have detailed notes. These are ready to be
              converted to clients.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Converted Leads
            </h4>
            <p className="text-sm text-muted-foreground">
              Leads that have been successfully converted to clients. These will appear in the
              Clients Status page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
