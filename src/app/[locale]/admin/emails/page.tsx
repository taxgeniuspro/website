import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  Send,
  Inbox,
  Archive,
  Star,
  Search,
  PlusCircle,
  Paperclip,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default async function EmailsPage() {
  const session = await auth(); const user = session?.user;
  if (!user) redirect('/auth/signin');

  const role = user?.role as UserRole | undefined;
  const customPermissions = user?.permissions as any;
  const permissions = getUserPermissions(role || 'client', customPermissions);

  if (!permissions.emails) redirect('/forbidden');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="w-8 h-8" />
            Email Communication Center
          </h1>
          <p className="text-muted-foreground">
            Centralized email management for client communications
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Button className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" />
              Compose Email
            </Button>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    <Inbox className="w-4 h-4 mr-2" />
                    Inbox
                    <Badge className="ml-auto">24</Badge>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <Send className="w-4 h-4 mr-2" />
                    Sent
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <Star className="w-4 h-4 mr-2" />
                    Starred
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Email Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Welcome Email
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Documents Reminder
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Return Complete
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Payment Reminder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="inbox" className="space-y-4">
              <TabsList>
                <TabsTrigger value="inbox">Inbox</TabsTrigger>
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="inbox" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Emails</CardTitle>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search emails..." className="pl-8 w-[250px]" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        >
                          <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">John Doe</p>
                                <p className="text-sm font-medium mt-1">
                                  Tax Documents Ready for Review
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Hi, I&apos;ve uploaded all my tax documents for this year...
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">2 hours ago</p>
                                <Badge variant="secondary" className="mt-1">
                                  Client
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compose">
                <Card>
                  <CardHeader>
                    <CardTitle>Compose Email</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">To</label>
                        <Input placeholder="Enter recipient email..." />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Subject</label>
                        <Input placeholder="Enter subject..." />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Message</label>
                        <Textarea
                          placeholder="Type your message here..."
                          className="min-h-[300px]"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Button variant="outline">
                          <Paperclip className="w-4 h-4 mr-2" />
                          Attach Files
                        </Button>
                        <div className="space-x-2">
                          <Button variant="outline">Save Draft</Button>
                          <Button>
                            <Send className="w-4 h-4 mr-2" />
                            Send Email
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="templates">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>Manage and customize email templates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {['Welcome', 'Reminder', 'Completion', 'Follow-up'].map((template) => (
                        <div key={template} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{template} Email Template</p>
                              <p className="text-sm text-muted-foreground">
                                Last updated: 2 days ago
                              </p>
                            </div>
                            <div className="space-x-2">
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                              <Button variant="outline" size="sm">
                                Preview
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
