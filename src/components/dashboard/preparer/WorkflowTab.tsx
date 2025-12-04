'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  taxYear: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'FILED' | 'ACCEPTED' | 'REJECTED' | 'AMENDED';
  documentsCount: number;
  lastActivity: string;
  assignedDate: string;
  dueDate: string;
  refundAmount?: number;
  oweAmount?: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface WorkflowTabProps {
  clients: Client[];
  getPriorityColor: (priority: Client['priority']) => string;
  onUpdateStatus: (clientId: string, newStatus: Client['status']) => void;
}

export function WorkflowTab({ clients, getPriorityColor, onUpdateStatus }: WorkflowTabProps) {
  const draftClients = clients.filter((c) => c.status === 'DRAFT');
  const inReviewClients = clients.filter((c) => c.status === 'IN_REVIEW');
  const completedClients = clients.filter((c) => ['FILED', 'ACCEPTED'].includes(c.status));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Draft Column */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Draft ({draftClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {draftClients.map((client) => (
                <Card key={client.id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{client.name}</p>
                      <Badge variant={getPriorityColor(client.priority) as any} className="text-xs">
                        {client.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {client.documentsCount} documents • Due {client.dueDate}
                    </p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        onClick={() => onUpdateStatus(client.id, 'IN_REVIEW')}
                      >
                        Start Review
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* In Review Column */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">In Review ({inReviewClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {inReviewClients.map((client) => (
                <Card key={client.id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{client.name}</p>
                      <Badge variant={getPriorityColor(client.priority) as any} className="text-xs">
                        {client.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {client.documentsCount} documents • Due {client.dueDate}
                    </p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Message
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        onClick={() => onUpdateStatus(client.id, 'FILED')}
                      >
                        File Return
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Completed Column */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Completed ({completedClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {completedClients.map((client) => (
                <Card key={client.id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{client.name}</p>
                      <Badge variant="success" className="text-xs">
                        {client.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {client.refundAmount
                        ? `Refund: $${client.refundAmount}`
                        : `Owe: $${client.oweAmount}`}
                    </p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Download
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
