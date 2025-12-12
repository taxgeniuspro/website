'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link as LinkIcon, MousePointerClick, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { PreparerLinkPerformance } from '@/lib/services/preparer-analytics.service';

interface TopLinksCardProps {
  data: PreparerLinkPerformance[];
}

export function TopLinksCard({ data }: TopLinksCardProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LinkIcon className="h-5 w-5" />
            Top Links (Today)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <LinkIcon className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No link activity today</p>
            <Button variant="link" size="sm" className="mt-2" asChild>
              <Link href="/dashboard/tax-preparer/tracking">Create a link</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <LinkIcon className="h-5 w-5" />
          Top Links (Today)
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/tax-preparer/tracking">
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((link, index) => (
            <div
              key={link.linkId}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-sm truncate max-w-[150px]">
                    {link.title}
                  </p>
                  {link.conversions > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {link.conversions} conversion{link.conversions !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <MousePointerClick className="h-3 w-3" />
                {link.clicks}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
