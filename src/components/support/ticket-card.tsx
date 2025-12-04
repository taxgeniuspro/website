/**
 * Ticket Card Component
 * Displays a ticket summary in list view with status, priority, and metadata
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertCircle,
  Clock,
  MessageSquare,
  User,
  CheckCircle2,
  Circle,
  Clock4,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TicketCardProps {
  ticket: {
    id: string;
    ticketNumber: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    creator?: {
      firstName?: string | null;
      lastName?: string | null;
      avatarUrl?: string | null;
    };
    assignedTo?: {
      firstName?: string | null;
      lastName?: string | null;
      avatarUrl?: string | null;
    };
    lastActivityAt: string | Date;
    messages?: { id: string }[];
    tags?: string[];
  };
  onClick?: () => void;
  showAssignedTo?: boolean;
  unreadCount?: number;
}

const statusConfig = {
  OPEN: {
    label: 'Open',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Circle,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    icon: Clock4,
  },
  WAITING_CLIENT: {
    label: 'Waiting for You',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: User,
  },
  WAITING_PREPARER: {
    label: 'Waiting for Preparer',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: Clock,
  },
  RESOLVED: {
    label: 'Resolved',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: CheckCircle2,
  },
  CLOSED: {
    label: 'Closed',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    icon: XCircle,
  },
  ARCHIVED: {
    label: 'Archived',
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400',
    icon: XCircle,
  },
};

const priorityConfig = {
  LOW: {
    label: 'Low',
    color: 'text-gray-500',
    dotColor: 'bg-gray-400',
  },
  NORMAL: {
    label: 'Normal',
    color: 'text-blue-600',
    dotColor: 'bg-blue-500',
  },
  HIGH: {
    label: 'High',
    color: 'text-orange-600',
    dotColor: 'bg-orange-500',
  },
  URGENT: {
    label: 'Urgent',
    color: 'text-red-600',
    dotColor: 'bg-red-500',
  },
};

export function TicketCard({
  ticket,
  onClick,
  showAssignedTo = false,
  unreadCount = 0,
}: TicketCardProps) {
  const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.OPEN;
  const priority =
    priorityConfig[ticket.priority as keyof typeof priorityConfig] || priorityConfig.NORMAL;
  const StatusIcon = status.icon;

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const formatDate = (date: string | Date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const messageCount = ticket.messages?.length || 0;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        onClick && 'hover:scale-[1.01]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Avatar */}
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {showAssignedTo && ticket.assignedTo
                    ? getInitials(ticket.assignedTo.firstName, ticket.assignedTo.lastName)
                    : getInitials(ticket.creator?.firstName, ticket.creator?.lastName)}
                </AvatarFallback>
              </Avatar>

              {/* Title & Ticket Number */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base truncate">{ticket.title}</h3>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{ticket.ticketNumber}</p>
              </div>
            </div>

            {/* Priority Indicator */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className={cn('h-2 w-2 rounded-full', priority.dotColor)} />
              <span className={cn('text-xs font-medium', priority.color)}>{priority.label}</span>
            </div>
          </div>

          {/* Description Preview */}
          {ticket.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
          )}

          {/* Tags */}
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ticket.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {ticket.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{ticket.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer Row */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-xs', status.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>

              {/* Message Count */}
              {messageCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{messageCount}</span>
                </div>
              )}
            </div>

            {/* Last Activity */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDate(ticket.lastActivityAt)}</span>
            </div>
          </div>

          {/* Assigned To (if shown) */}
          {showAssignedTo && ticket.assignedTo && (
            <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>
                Assigned to {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
