'use client';

import { useEffect, useState } from 'react';
import { FileUp, CheckCircle, MessageSquare, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface ClientActionsProps {
  userId: string;
}

export function ClientActions({ userId }: ClientActionsProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/mobile-hub/client-status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      logger.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tax Return Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Tax Return Status</CardTitle>
            </div>
            <Badge variant={getStatusVariant(status?.returnStatus)}>
              {status?.returnStatus || 'Not Started'}
            </Badge>
          </div>
          <CardDescription>{getStatusMessage(status?.returnStatus)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Documents uploaded:</span>
              <span className="font-medium">{status?.documentsCount || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last updated:</span>
              <span className="font-medium">
                {status?.lastUpdated ? new Date(status.lastUpdated).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start h-14"
            onClick={() => router.push('/dashboard/client/documents')}
          >
            <FileUp className="h-5 w-5 mr-3" />
            Upload Documents
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start h-14"
            onClick={() => router.push('/dashboard/client/tickets')}
          >
            <MessageSquare className="h-5 w-5 mr-3" />
            Support Tickets
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start h-14"
            onClick={() => router.push('/dashboard/client/referrals')}
          >
            <DollarSign className="h-5 w-5 mr-3" />
            Refer & Earn
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'pending':
      return 'outline';
    default:
      return 'outline';
  }
}

function getStatusMessage(status: string): string {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'Your tax return has been completed and filed!';
    case 'in_progress':
      return 'Your tax preparer is working on your return';
    case 'pending':
      return 'Waiting for document review';
    default:
      return 'Start by uploading your tax documents';
  }
}
