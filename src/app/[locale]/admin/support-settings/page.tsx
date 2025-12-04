import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SupportSettingsForm } from '@/components/admin/support-settings-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Sparkles, Mail, MessageSquare, Bell } from 'lucide-react';

export const metadata = {
  title: 'Support System Settings | Tax Genius Pro',
  description: 'Configure support system features and integrations',
};

async function isAdmin() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role;
  return role === 'admin' || role === 'super_admin';
}

export default async function SupportSettingsPage() {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect('/forbidden');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Support System Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Configure features, integrations, and automation for the support system
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">
              <Settings className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Features
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <MessageSquare className="w-4 h-4 mr-2" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure basic support system behavior and features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SupportSettingsForm section="general" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Toggles</CardTitle>
                <CardDescription>
                  Enable or disable specific features for the support system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SupportSettingsForm section="features" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings */}
          <TabsContent value="ai" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <CardTitle>AI-Powered Features</CardTitle>
                </div>
                <CardDescription>
                  Configure OpenAI integration for intelligent support features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SupportSettingsForm section="ai" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Feature Settings</CardTitle>
                <CardDescription>Fine-tune AI behavior and availability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Response Suggestions</h4>
                      <p className="text-sm text-muted-foreground">
                        AI generates contextual response suggestions for preparers
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Sentiment Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatically detect client sentiment (positive, negative, urgent)
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Ticket Summarization</h4>
                      <p className="text-sm text-muted-foreground">
                        Generate concise summaries of long ticket conversations
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Auto-Categorization</h4>
                      <p className="text-sm text-muted-foreground">
                        AI suggests relevant tags and categories for tickets
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>
                  Configure when and how users receive ticket notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SupportSettingsForm section="notifications" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>Configure email notifications for ticket updates</CardDescription>
              </CardHeader>
              <CardContent>
                <SupportSettingsForm section="email" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>
                  Customize email templates for different ticket events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-1">New Ticket Created</h4>
                    <p className="text-sm text-muted-foreground">
                      Sent to assigned preparer when a client creates a new ticket
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-1">New Message Received</h4>
                    <p className="text-sm text-muted-foreground">
                      Sent when a new message is added to a ticket
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-1">Ticket Status Changed</h4>
                    <p className="text-sm text-muted-foreground">
                      Sent when ticket status is updated
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-1">Ticket Resolved</h4>
                    <p className="text-sm text-muted-foreground">
                      Sent to client when their ticket is marked as resolved
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integration Settings */}
          <TabsContent value="integrations" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>External Integrations</CardTitle>
                <CardDescription>
                  Connect with third-party platforms for enhanced functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SupportSettingsForm section="integrations" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Integrations</CardTitle>
                <CardDescription>Extend support system with these integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Slack</h4>
                      <span className="text-xs px-2 py-1 bg-muted rounded">Optional</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send ticket notifications to Slack channels
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">SMS (Twilio)</h4>
                      <span className="text-xs px-2 py-1 bg-muted rounded">Optional</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send urgent ticket alerts via SMS
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Discord</h4>
                      <span className="text-xs px-2 py-1 bg-muted rounded">Optional</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Post ticket updates to Discord channels
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Telegram</h4>
                      <span className="text-xs px-2 py-1 bg-muted rounded">Optional</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receive ticket notifications in Telegram
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
