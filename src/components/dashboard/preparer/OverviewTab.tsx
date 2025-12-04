'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calculator, FileCheck, MessageSquare, Archive } from 'lucide-react';

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

interface OverviewTabProps {
  clients: Client[];
  getPriorityColor: (priority: Client['priority']) => string;
}

const quickActions = [
  { icon: Calculator, label: 'Tax Calculator' },
  { icon: FileCheck, label: 'Review Documents' },
  { icon: MessageSquare, label: 'Client Messages' },
  { icon: Archive, label: 'Archive Returns' },
];

const recentActivities = [
  {
    text: 'John Smith uploaded W2 form',
    time: '2 hours ago',
    color: 'bg-green-500',
  },
  {
    text: 'Filed return for Sarah Johnson',
    time: '5 hours ago',
    color: 'bg-blue-500',
  },
  {
    text: 'New message from Michael Brown',
    time: '1 day ago',
    color: 'bg-yellow-500',
  },
  {
    text: 'Return accepted for Lisa Davis',
    time: '2 days ago',
    color: 'bg-green-500',
  },
];

export function OverviewTab({ clients, getPriorityColor }: OverviewTabProps) {
  const priorityClients = clients.filter((c) => c.priority === 'HIGH').slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Priority Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Clients</CardTitle>
            <CardDescription>Clients requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priorityClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {client.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">Due: {client.dueDate}</p>
                    </div>
                  </div>
                  <Badge variant={getPriorityColor(client.priority) as any}>
                    {client.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest client interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`h-2 w-2 ${activity.color} rounded-full`} />
                  <div className="flex-1">
                    <p className="text-sm">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common preparer tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-4">
          {quickActions.map((action) => (
            <Button key={action.label} variant="outline" className="justify-start">
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
