'use client';

/**
 * Real-Time Activity Feed Component
 *
 * Shows live activity updates:
 * - New leads (last 24h) with count badge
 * - Hot leads (clicked but no follow-up) - action needed
 * - Today's activity timeline
 *
 * Auto-refreshes every 30 seconds for near-real-time updates.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  UserPlus,
  Flame,
  Clock,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'new_lead' | 'intake_completed' | 'appointment_booked' | 'follow_up_needed' | 'conversion';
  title: string;
  description: string;
  timestamp: string;
  priority?: 'high' | 'medium' | 'low';
  actionUrl?: string;
}

interface RealTimeActivityFeedProps {
  preparerId?: string;
  maxItems?: number;
}

export function RealTimeActivityFeed({ preparerId, maxItems = 20 }: RealTimeActivityFeedProps) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['activity-feed', preparerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (preparerId) params.append('preparerId', preparerId);
      params.append('limit', maxItems.toString());
      const response = await fetch(`/api/analytics/activity-feed?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 15000,
  });

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'new_lead':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'intake_completed':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'appointment_booked':
        return <Clock className="h-4 w-4 text-purple-500" />;
      case 'follow_up_needed':
        return <Flame className="h-4 w-4 text-orange-500" />;
      case 'conversion':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority?: ActivityItem['priority']) => {
    if (!priority || priority === 'low') return null;

    if (priority === 'high') {
      return (
        <Badge variant="destructive" className="text-xs">
          Urgent
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        Action Needed
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Unable to load activity feed</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activities: ActivityItem[] = data?.activities || [];
  const newLeadsCount = data?.newLeadsCount || 0;
  const hotLeadsCount = data?.hotLeadsCount || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
              {isFetching && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription>Real-time updates from your leads</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick stats */}
        <div className="flex gap-3 pt-2">
          {newLeadsCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <UserPlus className="h-3 w-3" />
              {newLeadsCount} new today
            </Badge>
          )}
          {hotLeadsCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Flame className="h-3 w-3" />
              {hotLeadsCount} need follow-up
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Activity will appear here as leads interact with your links
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="p-2 rounded-full bg-muted">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{activity.title}</p>
                      {getPriorityBadge(activity.priority)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Action buttons for high priority items */}
                  {activity.priority === 'high' && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
