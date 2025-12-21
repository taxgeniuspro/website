'use client';

/**
 * Unified Analytics Dashboard Component
 *
 * Combines all analytics components into a cohesive dashboard:
 * - Lead Funnel Chart
 * - Real-Time Activity Feed
 * - Source Performance Chart
 *
 * Role-based data scoping:
 * - Admin: Platform-wide data
 * - Tax Preparer: Their leads/conversions
 * - Client: Their referrals
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadFunnelChart } from './LeadFunnelChart';
import { RealTimeActivityFeed } from './RealTimeActivityFeed';
import { SourcePerformanceChart } from './SourcePerformanceChart';
import {
  BarChart3,
  Activity,
  Target,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface UnifiedAnalyticsDashboardProps {
  role: 'admin' | 'tax_preparer' | 'client';
  preparerId?: string;
  showDatePicker?: boolean;
  defaultView?: 'overview' | 'funnel' | 'activity' | 'sources';
}

export function UnifiedAnalyticsDashboard({
  role,
  preparerId,
  showDatePicker = true,
  defaultView = 'overview',
}: UnifiedAnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const roleLabels = {
    admin: 'Platform Analytics',
    tax_preparer: 'Your Performance',
    client: 'Your Referrals',
  };

  const roleDescriptions = {
    admin: 'Track platform-wide lead conversions and activity',
    tax_preparer: 'Monitor your leads, conversions, and marketing performance',
    client: 'See how your referrals are performing',
  };

  return (
    <div className="space-y-6">
      {/* Header with date picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            {roleLabels[role]}
          </h2>
          <p className="text-muted-foreground mt-1">
            {roleDescriptions[role]}
          </p>
        </div>

        {showDatePicker && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue={defaultView} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="funnel" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Funnel</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Sources</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - Shows all components in a grid */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-6">
              <LeadFunnelChart dateRange={dateRange} preparerId={preparerId} />
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <RealTimeActivityFeed preparerId={preparerId} maxItems={10} />
              <SourcePerformanceChart dateRange={dateRange} preparerId={preparerId} />
            </div>
          </div>
        </TabsContent>

        {/* Funnel Tab - Full width funnel chart */}
        <TabsContent value="funnel">
          <LeadFunnelChart dateRange={dateRange} preparerId={preparerId} />
        </TabsContent>

        {/* Activity Tab - Full width activity feed */}
        <TabsContent value="activity">
          <RealTimeActivityFeed preparerId={preparerId} maxItems={50} />
        </TabsContent>

        {/* Sources Tab - Full width source performance */}
        <TabsContent value="sources">
          <SourcePerformanceChart dateRange={dateRange} preparerId={preparerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
