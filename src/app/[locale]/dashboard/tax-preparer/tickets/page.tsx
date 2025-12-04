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
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Sparkles,
  FileText,
} from 'lucide-react';
import { TicketList } from '@/components/support/ticket-list';
import { TicketStatsCards } from '@/components/support/ticket-stats-cards';
import Link from 'next/link';

export const metadata = {
  title: 'Client Tickets | Tax Genius Pro',
  description: 'Manage client support tickets',
};

async function isTaxPreparer() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role;
  return role === 'tax_preparer' || role === 'admin' || role === 'super_admin';
}

export default async function TaxPreparerTicketsPage() {
  const userIsPreparer = await isTaxPreparer();

  if (!userIsPreparer) {
    redirect('/forbidden');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Client Support Tickets
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage and respond to client inquiries
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/saved-replies">
              <Button variant="outline" className="w-full sm:w-auto">
                <FileText className="w-4 h-4 mr-2" />
                Saved Replies
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <TicketStatsCards role="preparer" />

        {/* AI Quick Actions */}
        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">AI Assistant Tools</CardTitle>
            </div>
            <CardDescription>
              Use AI to streamline your responses and improve client communication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <h4 className="font-semibold text-sm">Smart Suggestions</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get AI-powered response suggestions based on ticket content
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-green-500" />
                  <h4 className="font-semibold text-sm">Sentiment Analysis</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Understand client emotions to tailor your responses
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <h4 className="font-semibold text-sm">Auto-Summarize</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate concise summaries of long ticket threads
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <h4 className="font-semibold text-sm">Auto-Categorize</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI suggests relevant tags and categories automatically
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
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
                  <SelectItem value="WAITING_CLIENT">Waiting on Client</SelectItem>
                  <SelectItem value="WAITING_PREPARER">Waiting on Me</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>

              {/* Client Filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Filter by client..." className="pl-9" id="client-filter" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List with Tabs */}
        <Tabs defaultValue="assigned" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="assigned">
              <TicketIcon className="w-4 h-4 mr-2" />
              My Tickets
            </TabsTrigger>
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
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="mt-6">
            <TicketList
              role="preparer"
              emptyMessage="No tickets assigned to you. New client tickets will appear here automatically."
            />
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            <TicketList
              role="preparer"
              statusFilter={['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT']}
              emptyMessage="No active tickets."
            />
          </TabsContent>

          <TabsContent value="waiting" className="mt-6">
            <TicketList
              role="preparer"
              statusFilter={['WAITING_PREPARER']}
              emptyMessage="No tickets waiting on your response."
            />
          </TabsContent>

          <TabsContent value="resolved" className="mt-6">
            <TicketList
              role="preparer"
              statusFilter={['RESOLVED', 'CLOSED']}
              emptyMessage="No resolved tickets yet."
            />
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <TicketList role="preparer" emptyMessage="No tickets found." />
          </TabsContent>
        </Tabs>

        {/* Productivity Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Productivity Tips</CardTitle>
            <CardDescription>Make the most of the support system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">💬 Use Saved Replies</h4>
                <p className="text-xs text-muted-foreground">
                  Save time with templates for common tax questions
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">🤖 Leverage AI Tools</h4>
                <p className="text-xs text-muted-foreground">
                  Get AI suggestions for faster, better responses
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">📝 Internal Notes</h4>
                <p className="text-xs text-muted-foreground">
                  Add private notes that clients can't see
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
