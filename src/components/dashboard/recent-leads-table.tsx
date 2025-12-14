'use client';

/**
 * Recent Leads Table (Client Referrals View)
 *
 * Displays referrals with status tracking:
 * - Was the referral accepted as a client? (YES/NO)
 * - Did they file a return? (YES/NO)
 * - Commission earned
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
import { Loader2, RefreshCw, TrendingUp, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';

interface Referral {
  id: string;
  name: string;
  email: string;
  isClient: boolean;
  returnFiled: boolean;
  isUnqualified: boolean;
  unqualifiedReason: string | null;
  status: 'pending' | 'client' | 'complete' | 'unqualified';
  commissionAmount: number | null;
  commissionStatus: string | null;
  createdAt: string;
}

interface RecentLeadsTableProps {
  className?: string;
  limit?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
  },
  client: {
    label: 'Client',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: CheckCircle,
  },
  complete: {
    label: 'Complete',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  unqualified: {
    label: 'Unqualified',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    icon: XCircle,
  },
};

export function RecentLeadsTable({ className, limit = 10 }: RecentLeadsTableProps) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/client/referrals');

      if (!response.ok) {
        throw new Error('Failed to fetch referrals');
      }

      const data = await response.json();
      // Apply limit on frontend if needed
      const allReferrals = data.referrals || [];
      setReferrals(limit ? allReferrals.slice(0, limit) : allReferrals);
    } catch (err: any) {
      logger.error('Failed to fetch referrals', { error: err });
      setError(err.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchReferrals(true);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>My Referrals</CardTitle>
          <CardDescription>Loading your referrals...</CardDescription>
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
          <CardTitle>My Referrals</CardTitle>
          <CardDescription>Unable to load referrals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchReferrals()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (referrals.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Referrals</CardTitle>
              <CardDescription>Your referrals will appear here</CardDescription>
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
            <p className="text-sm">No referrals yet</p>
            <p className="text-xs mt-2">Share your referral links to start earning commissions</p>
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
            <CardDescription>
              {referrals.length} referral{referrals.length !== 1 ? 's' : ''} - Track their progress
            </CardDescription>
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
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Client?</TableHead>
                <TableHead className="text-center">Return Filed?</TableHead>
                <TableHead className="text-center">Commission</TableHead>
                <TableHead>Referred</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map((referral) => {
                const statusConfig = STATUS_CONFIG[referral.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;

                return (
                  <TableRow key={referral.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{referral.name}</p>
                        <p className="text-xs text-muted-foreground">{referral.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {referral.isUnqualified ? (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                          <XCircle className="h-3 w-3 mr-1" />
                          No
                        </Badge>
                      ) : referral.isClient ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {referral.isUnqualified ? (
                        <span className="text-xs text-gray-400">--</span>
                      ) : referral.returnFiled ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Yes
                        </Badge>
                      ) : referral.isClient ? (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {referral.commissionAmount !== null ? (
                        <div className="flex flex-col items-center">
                          <span className="font-semibold text-green-600">
                            ${referral.commissionAmount.toFixed(2)}
                          </span>
                          {referral.commissionStatus && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs mt-1',
                                referral.commissionStatus === 'PAID'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              )}
                            >
                              {referral.commissionStatus === 'PAID' ? 'Paid' : 'Pending'}
                            </Badge>
                          )}
                        </div>
                      ) : referral.isUnqualified ? (
                        <span className="text-xs text-gray-400">--</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {referral.isClient ? 'Awaiting filing' : 'Awaiting conversion'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(referral.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {referrals.length >= limit && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Showing {limit} of your referrals
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
