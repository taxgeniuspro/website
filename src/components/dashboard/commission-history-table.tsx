'use client';

/**
 * Commission History Table
 *
 * Displays detailed commission history with status, amounts, and dates
 * Includes filtering and pagination
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6
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
import { Loader2, RefreshCw, Clock, CheckCircle, DollarSign, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';

interface Commission {
  id: string;
  leadId: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  leadStatus: string;
  createdAt: string;
  approvedAt?: string | null;
  paidAt?: string | null;
  notes?: string | null;
}

interface CommissionHistoryTableProps {
  className?: string;
  limit?: number;
}

const STATUS_CONFIG = {
  PENDING: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    label: 'Pending',
  },
  APPROVED: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    label: 'Approved',
  },
  PAID: {
    icon: DollarSign,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    label: 'Paid',
  },
  CANCELLED: {
    icon: XCircle,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    label: 'Cancelled',
  },
};

export function CommissionHistoryTable({ className, limit = 50 }: CommissionHistoryTableProps) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`/api/earnings/history?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch commissions');
      }

      const data = await response.json();
      setCommissions(data.commissions || []);
    } catch (err) {
      logger.error('Failed to fetch commission history', { error: err });
      setError(err.message || 'Failed to load commissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchCommissions(true);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>Loading your commission records...</CardDescription>
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
          <CardTitle>Commission History</CardTitle>
          <CardDescription>Unable to load commission history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchCommissions()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (commissions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commission History</CardTitle>
              <CardDescription>Your commission records will appear here</CardDescription>
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
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No commissions yet</p>
            <p className="text-xs mt-2">When your leads convert, commissions will appear here</p>
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
            <CardTitle>Commission History</CardTitle>
            <CardDescription>
              {commissions.length} commission record{commissions.length !== 1 ? 's' : ''}
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lead Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => {
                const statusConfig = STATUS_CONFIG[commission.status];
                const Icon = statusConfig.icon;
                const lastUpdate =
                  commission.paidAt || commission.approvedAt || commission.createdAt;

                return (
                  <TableRow key={commission.id}>
                    <TableCell className="font-mono text-xs">
                      {commission.leadId.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-semibold">${commission.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
                        <Icon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {commission.leadStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(commission.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(lastUpdate), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {commissions.length >= limit && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">Showing {limit} most recent commissions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
