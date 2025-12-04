'use client';

/**
 * Recent Leads Table
 *
 * Displays recent leads with attribution method, confidence, and commission rates
 * Real-time updates for affiliates, referrers, and tax preparers
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 5
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, RefreshCw, Cookie, Mail, Phone, Globe, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  attributionMethod: 'cookie' | 'email_match' | 'phone_match' | 'direct';
  attributionConfidence: number;
  commissionRate: number;
  createdAt: string;
}

interface RecentLeadsTableProps {
  className?: string;
  limit?: number;
}

const ATTRIBUTION_ICONS = {
  cookie: Cookie,
  email_match: Mail,
  phone_match: Phone,
  direct: Globe,
};

const ATTRIBUTION_LABELS = {
  cookie: 'Clicked Link',
  email_match: 'Email Match',
  phone_match: 'Phone Match',
  direct: 'Direct Visit',
};

const ATTRIBUTION_COLORS = {
  cookie: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  email_match: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  phone_match: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  direct: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONTACTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  QUALIFIED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  CONVERTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DISQUALIFIED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function RecentLeadsTable({ className, limit = 10 }: RecentLeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`/api/leads/my-leads?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }

      const data = await response.json();
      setLeads(data.leads || []);
    } catch (err) {
      logger.error('Failed to fetch recent leads', { error: err });
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchLeads(true);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
          <CardDescription>Loading your latest leads...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
          <CardDescription>Unable to load leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchLeads()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Referrals</CardTitle>
              <CardDescription>Your latest referrals will appear here</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No leads yet</p>
            <p className="text-xs mt-2">Share your referral links to start tracking leads</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Referrals</CardTitle>
            <CardDescription>All {leads.length} of your referrals</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>How Found You</TableHead>
                <TableHead>You'll Earn</TableHead>
                <TableHead>Referred</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const Icon = ATTRIBUTION_ICONS[lead.attributionMethod];
                const attributionColor = ATTRIBUTION_COLORS[lead.attributionMethod];
                const statusColor = STATUS_COLORS[lead.status] || STATUS_COLORS.NEW;

                return (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', statusColor)}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn('p-1.5 rounded', attributionColor)}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <span className="text-xs">
                          {ATTRIBUTION_LABELS[lead.attributionMethod] || 'Direct Visit'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${lead.commissionRate.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {leads.length >= limit && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" asChild>
              <a href="/dashboard/leads">View All Leads</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
