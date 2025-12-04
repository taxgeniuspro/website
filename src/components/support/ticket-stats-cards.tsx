'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Ticket, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  waitingClient: number;
  waitingPreparer: number;
  resolved: number;
  closed: number;
  avgResponseTime: number; // in hours
  avgResolutionTime: number; // in hours
}

interface TicketStatsCardsProps {
  role: 'client' | 'preparer' | 'admin';
}

export function TicketStatsCards({ role }: TicketStatsCardsProps) {
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/support/tickets/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch ticket statistics');
      }

      const data = await response.json();

      if (data.success) {
        setStats(data.data.stats);
      } else {
        throw new Error(data.error || 'Failed to fetch statistics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      logger.error('Error fetching ticket stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return null; // Silently fail - stats are nice to have but not critical
  }

  const activeCount = stats.open + stats.inProgress + stats.waitingPreparer;
  const waitingCount = stats.waitingClient;
  const resolvedCount = stats.resolved + stats.closed;

  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else {
      return `${Math.round(hours / 24)}d`;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Total Tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">All time</p>
        </CardContent>
      </Card>

      {/* Active Tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeCount}</div>
          <p className="text-xs text-muted-foreground">
            {stats.open} open, {stats.inProgress} in progress
          </p>
        </CardContent>
      </Card>

      {/* Waiting on Response */}
      {role === 'client' ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting on You</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitingCount}</div>
            <p className="text-xs text-muted-foreground">
              {waitingCount === 1 ? 'Needs your response' : 'Need your response'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgResponseTime > 0 ? formatTime(stats.avgResponseTime) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Average first response</p>
          </CardContent>
        </Card>
      )}

      {/* Resolved Tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resolved Tickets</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{resolvedCount}</div>
          <p className="text-xs text-muted-foreground">
            {stats.avgResolutionTime > 0
              ? `Avg ${formatTime(stats.avgResolutionTime)} to resolve`
              : 'All time'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
