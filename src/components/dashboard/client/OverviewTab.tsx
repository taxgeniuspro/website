'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  MessageSquare,
  CreditCard,
  Download,
  Calendar,
  FileText,
  Lightbulb,
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'document' | 'status' | 'message' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  icon: any;
  color: string;
}

interface OverviewTabProps {
  activities: Activity[];
}

const quickActions = [
  { icon: Upload, label: 'Upload Documents', variant: 'default' as const },
  { icon: MessageSquare, label: 'Message Preparer', variant: 'outline' as const },
  { icon: CreditCard, label: 'Make Payment', variant: 'outline' as const },
  { icon: Download, label: 'Download Returns', variant: 'outline' as const },
];

export function OverviewTab({ activities }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant}
                className="h-auto flex-col gap-2 py-4"
              >
                <action.icon className="h-5 w-5" />
                <span className="text-xs">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className={`p-2 rounded-lg ${activity.color} h-fit`}>
                      <activity.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Tax Tip of the Day */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Tax Tip of the Day
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Maximize Your Deductions</h4>
              <p className="text-sm text-muted-foreground">
                Don't forget to claim home office expenses if you work from home. You may be
                eligible for deductions on a portion of your rent, utilities, and internet costs.
              </p>
            </div>
            <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
              <FileText className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Required Documents</p>
                <p className="text-xs text-muted-foreground">
                  Keep receipts for all business expenses
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Learn More Tax Tips
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
