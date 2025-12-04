'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TicketCard } from './ticket-card';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Inbox } from 'lucide-react';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { logger } from '@/lib/logger';

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  tags: string[];
  lastActivityAt: string;
  creator: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  assignedTo?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  _count?: {
    messages: number;
  };
}

interface TicketListProps {
  role: 'client' | 'preparer' | 'admin';
  statusFilter?: TicketStatus[];
  priorityFilter?: TicketPriority[];
  searchQuery?: string;
  emptyMessage?: string;
}

export function TicketList({
  role,
  statusFilter,
  priorityFilter,
  searchQuery,
  emptyMessage = 'No tickets found.',
}: TicketListProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, searchQuery, page]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (statusFilter && statusFilter.length > 0) {
        statusFilter.forEach((status) => params.append('status', status));
      }

      if (priorityFilter && priorityFilter.length > 0) {
        priorityFilter.forEach((priority) => params.append('priority', priority));
      }

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      params.set('page', page.toString());
      params.set('limit', '10');

      const response = await fetch(`/api/support/tickets?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();

      if (data.success) {
        if (page === 1) {
          setTickets(data.data.tickets);
        } else {
          setTickets((prev) => [...prev, ...data.data.tickets]);
        }
        setHasMore(data.data.hasMore);
      } else {
        throw new Error(data.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      logger.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticketId: string) => {
    if (role === 'client') {
      router.push(`/dashboard/client/tickets/${ticketId}`);
    } else if (role === 'preparer') {
      router.push(`/dashboard/tax-preparer/tickets/${ticketId}`);
    } else if (role === 'admin') {
      router.push(`/admin/tickets/${ticketId}`);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  if (loading && page === 1) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading tickets...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1">
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onClick={() => handleTicketClick(ticket.id)}
            showAssignedTo={role !== 'client'}
            unreadCount={0} // TODO: Implement unread count logic
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Loading more...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
