import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Paperclip, Search, Filter } from 'lucide-react';

export const metadata = {
  title: 'Messages | Tax Genius Pro',
  description: 'Communicate with your tax preparer',
};

async function isClient() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role;
  return role === 'client' || role === 'admin';
}

export default async function ClientMessagesPage() {
  const userIsClient = await isClient();

  if (!userIsClient) {
    redirect('/forbidden');
  }

  // Mock messages data
  const conversations = [
    {
      id: '1',
      preparer: {
        name: 'Sarah Johnson, CPA',
        avatar: 'SJ',
        initials: 'SJ',
      },
      lastMessage:
        "I've reviewed your documents and everything looks good. We can proceed with filing.",
      timestamp: '2024-03-15T14:30:00',
      unread: 2,
      status: 'active',
    },
    {
      id: '2',
      preparer: {
        name: 'Michael Chen, CPA',
        avatar: 'MC',
        initials: 'MC',
      },
      lastMessage: 'Thank you for uploading the additional W-2 form.',
      timestamp: '2024-03-14T10:15:00',
      unread: 0,
      status: 'active',
    },
  ];

  const messages = [
    {
      id: '1',
      sender: 'preparer',
      senderName: 'Sarah Johnson',
      message:
        "Hello! I've started reviewing your 2024 tax return. I noticed you mentioned a home office deduction. Could you provide some details about your home office setup?",
      timestamp: '2024-03-15T10:00:00',
    },
    {
      id: '2',
      sender: 'client',
      senderName: 'You',
      message:
        "Hi Sarah! Yes, I have a dedicated room that I use exclusively for work. It's about 150 square feet. I work from home full-time for my employer.",
      timestamp: '2024-03-15T11:30:00',
    },
    {
      id: '3',
      sender: 'preparer',
      senderName: 'Sarah Johnson',
      message:
        "Perfect! Since you're an employee working from home, we'll need to check if your employer requires you to work from home. Could you provide a letter or email from your employer confirming this?",
      timestamp: '2024-03-15T13:00:00',
    },
    {
      id: '4',
      sender: 'client',
      senderName: 'You',
      message: "Sure, I'll upload that document right away. Give me a few minutes.",
      timestamp: '2024-03-15T13:15:00',
    },
    {
      id: '5',
      sender: 'preparer',
      senderName: 'Sarah Johnson',
      message:
        "I've reviewed your documents and everything looks good. We can proceed with filing.",
      timestamp: '2024-03-15T14:30:00',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Messages</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Communicate with your tax preparer
            </p>
          </div>
          <Button className="w-full sm:w-auto">
            <MessageSquare className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {/* Conversations List */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>Your recent message threads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-9" />
              </div>

              {/* Conversation List */}
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      conversation.id === '1' ? 'bg-primary/5 border-primary' : 'hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>{conversation.preparer.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm truncate">
                            {conversation.preparer.name}
                          </p>
                          {conversation.unread > 0 && (
                            <Badge className="bg-primary text-primary-foreground">
                              {conversation.unread}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {conversation.lastMessage}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(conversation.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Message Thread */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>SJ</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">Sarah Johnson, CPA</CardTitle>
                    <CardDescription>Your Tax Preparer</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Messages */}
              <div className="h-[400px] overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === 'client' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-4 ${
                        message.sender === 'client'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border'
                      }`}
                    >
                      <p className="text-sm font-medium mb-1">{message.senderName}</p>
                      <p className="text-sm">{message.message}</p>
                      <p
                        className={`text-xs mt-2 ${
                          message.sender === 'client'
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <Textarea placeholder="Type your message..." rows={3} className="resize-none" />
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm">
                    <Paperclip className="w-4 h-4 mr-2" />
                    Attach File
                  </Button>
                  <Button>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common message templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              <Button variant="outline" className="justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Request Status Update
              </Button>
              <Button variant="outline" className="justify-start">
                <Paperclip className="w-4 h-4 mr-2" />
                Upload Additional Documents
              </Button>
              <Button variant="outline" className="justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Ask a Question
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
