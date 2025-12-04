/**
 * Ticket Detail Component
 * Full ticket view with conversation thread and message composer
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Paperclip, Lock, Sparkles, Clock, User, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TicketDetailProps {
  ticketId: string;
  currentUserId: string;
  userRole: string;
  onTicketUpdate?: () => void;
}

export function TicketDetail({
  ticketId,
  currentUserId,
  userRole,
  onTicketUpdate,
}: TicketDetailProps) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messageContent, setMessageContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isPreparer =
    userRole === 'TAX_PREPARER' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  // Fetch ticket details
  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/support/tickets/${ticketId}`);
      const data = await response.json();

      if (data.success) {
        setTicket(data.data.ticket);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load ticket',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load ticket details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageContent.trim()) return;

    try {
      setSending(true);
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageContent,
          isInternal: isPreparer && isInternal,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessageContent('');
        setIsInternal(false);
        await fetchTicket();
        onTicketUpdate?.();
        toast({
          title: 'Success',
          description: 'Message sent successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send message',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTicket();
        onTicketUpdate?.();
        toast({
          title: 'Success',
          description: 'Ticket status updated',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updatePriority = async (newPriority: string) => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTicket();
        onTicketUpdate?.();
        toast({
          title: 'Success',
          description: 'Ticket priority updated',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update priority',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!ticket) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Ticket not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  return (
    <div className="grid gap-6">
      {/* Main Conversation Area */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{ticket.title}</CardTitle>
              <CardDescription className="font-mono text-xs">{ticket.ticketNumber}</CardDescription>
            </div>
            <Badge variant="outline" className="ml-4">
              {ticket.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Messages Thread */}
          <div className="h-[500px] overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
            {/* Initial Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(ticket.creator?.firstName, ticket.creator?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {ticket.creator?.firstName} {ticket.creator?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="ml-10 p-4 bg-card border rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>

            <Separator />

            {/* Messages */}
            {ticket.messages?.map((message: any) => {
              const isOwn = message.senderId === currentUserId;
              const isInternalNote = message.isInternal;

              return (
                <div key={message.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(
                          message.senderProfile?.firstName,
                          message.senderProfile?.lastName
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {message.senderProfile?.firstName} {message.senderProfile?.lastName}
                        </p>
                        {isInternalNote && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Internal Note
                          </Badge>
                        )}
                        {message.isAIGenerated && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'ml-10 p-4 rounded-lg',
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : isInternalNote
                          ? 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800'
                          : 'bg-card border'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Composer */}
          {ticket.status !== 'CLOSED' && ticket.status !== 'ARCHIVED' && (
            <div className="space-y-3">
              {isPreparer && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="internal"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="internal" className="text-sm flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    Internal Note (preparer only)
                  </label>
                </div>
              )}

              <Textarea
                placeholder="Type your message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    sendMessage();
                  }
                }}
                rows={4}
                className="resize-none"
              />

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" disabled>
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach File
                </Button>
                <Button onClick={sendMessage} disabled={sending || !messageContent.trim()}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Message
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Tip: Press Ctrl+Enter to send quickly</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
