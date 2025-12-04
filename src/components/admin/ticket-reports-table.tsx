'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/lib/logger';

interface TicketReportsTableProps {
  view: 'recent' | 'preparers';
}

export function TicketReportsTable({ view }: TicketReportsTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [view]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/support/reports/${view}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data || []);
      }
    } catch (error) {
      logger.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (view === 'recent') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium">Ticket</th>
              <th className="text-left py-3 px-4 font-medium">Client</th>
              <th className="text-left py-3 px-4 font-medium">Preparer</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-left py-3 px-4 font-medium">Priority</th>
              <th className="text-left py-3 px-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  No recent tickets found
                </td>
              </tr>
            ) : (
              data.map((ticket: any) => (
                <tr key={ticket.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{ticket.ticketNumber}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{ticket.title}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {ticket.creator?.firstName} {ticket.creator?.lastName}
                  </td>
                  <td className="py-3 px-4">
                    {ticket.assignedTo
                      ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                      : 'Unassigned'}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline">{ticket.status.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        ticket.priority === 'URGENT'
                          ? 'destructive'
                          : ticket.priority === 'HIGH'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {ticket.priority}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // Preparers view
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium">Preparer</th>
            <th className="text-right py-3 px-4 font-medium">Active Tickets</th>
            <th className="text-right py-3 px-4 font-medium">Resolved</th>
            <th className="text-right py-3 px-4 font-medium">Avg Response</th>
            <th className="text-right py-3 px-4 font-medium">Resolution Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-muted-foreground">
                No preparer data available
              </td>
            </tr>
          ) : (
            data.map((preparer: any, idx: number) => (
              <tr key={idx} className="border-b hover:bg-muted/50">
                <td className="py-3 px-4 font-medium">{preparer.name}</td>
                <td className="py-3 px-4 text-right">{preparer.activeTickets || 0}</td>
                <td className="py-3 px-4 text-right">{preparer.resolvedTickets || 0}</td>
                <td className="py-3 px-4 text-right">{preparer.avgResponseTime || 'N/A'}</td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={
                      (preparer.resolutionRate || 0) >= 95
                        ? 'text-green-600 font-medium'
                        : (preparer.resolutionRate || 0) >= 90
                          ? 'text-blue-600 font-medium'
                          : 'text-orange-600 font-medium'
                    }
                  >
                    {preparer.resolutionRate || 0}%
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
