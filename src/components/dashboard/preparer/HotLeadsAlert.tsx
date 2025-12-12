'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, Phone, Mail, Clock } from 'lucide-react';
import type { HotLead } from '@/lib/services/preparer-analytics.service';

interface HotLeadsAlertProps {
  data: HotLead[];
}

export function HotLeadsAlert({ data }: HotLeadsAlertProps) {
  if (data.length === 0) {
    return null; // Don't show the card if there are no hot leads
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <Flame className="h-5 w-5" />
          Hot Leads - Act Fast!
          <Badge variant="secondary" className="ml-auto">
            {data.length} potential client{data.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          These people clicked your link in the last 24 hours but haven&apos;t filled out a form yet
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.slice(0, 5).map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-background border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{lead.name}</p>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {lead.hoursAgo}h ago
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clicked: {lead.linkTitle || lead.linkCode}
                </p>
              </div>
              <div className="flex gap-2">
                {lead.phone && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </a>
                  </Button>
                )}
                {lead.email && (
                  <Button size="sm" variant="default" asChild>
                    <a href={`mailto:${lead.email}`}>
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
          {data.length > 5 && (
            <p className="text-sm text-center text-muted-foreground">
              + {data.length - 5} more hot leads
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
