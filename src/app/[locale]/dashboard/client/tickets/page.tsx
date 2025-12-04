import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Ticket as TicketIcon,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { TicketList } from '@/components/support/ticket-list';
import { CreateTicketDialog } from '@/components/support/create-ticket-dialog';
import { TicketStatsCards } from '@/components/support/ticket-stats-cards';

export const metadata = {
  title: 'Ask Your Tax Genius | Tax Genius Pro',
  description: 'Get help from your tax preparer',
};

async function isClient() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role;
  return role === 'client' || role === 'admin';
}

export default async function ClientTicketsPage() {
  const userIsClient = await isClient();

  if (!userIsClient) {
    redirect('/forbidden');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Ask Your Tax Genius</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Get help from your tax preparer
            </p>
          </div>
          <CreateTicketDialog
            trigger={
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Question
              </Button>
            }
          />
        </div>

        {/* Stats Cards */}
        <TicketStatsCards role="client" />

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search tickets..." className="pl-9" id="ticket-search" />
              </div>

              {/* Priority Filter */}
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="WAITING_CLIENT">Waiting on You</SelectItem>
                  <SelectItem value="WAITING_PREPARER">Waiting on Preparer</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List with Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="active">
              <Clock className="w-4 h-4 mr-2" />
              Active
            </TabsTrigger>
            <TabsTrigger value="waiting">
              <AlertCircle className="w-4 h-4 mr-2" />
              Waiting
            </TabsTrigger>
            <TabsTrigger value="resolved">
              <CheckCircle className="w-4 h-4 mr-2" />
              Resolved
            </TabsTrigger>
            <TabsTrigger value="all">
              <Filter className="w-4 h-4 mr-2" />
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <TicketList
              role="client"
              statusFilter={['OPEN', 'IN_PROGRESS', 'WAITING_PREPARER']}
              emptyMessage="No active tickets. Create a new ticket to get help from your tax preparer."
            />
          </TabsContent>

          <TabsContent value="waiting" className="mt-6">
            <TicketList
              role="client"
              statusFilter={['WAITING_CLIENT']}
              emptyMessage="No tickets waiting on your response."
            />
          </TabsContent>

          <TabsContent value="resolved" className="mt-6">
            <TicketList
              role="client"
              statusFilter={['RESOLVED', 'CLOSED']}
              emptyMessage="No resolved tickets yet."
            />
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <TicketList
              role="client"
              emptyMessage="No tickets yet. Create your first ticket to get started."
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
