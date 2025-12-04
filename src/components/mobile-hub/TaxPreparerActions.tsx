'use client';

import { useEffect, useState } from 'react';
import { ShareButton } from './ShareButton';
import { FileText, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

interface TaxPreparerActionsProps {
  userId: string;
}

export function TaxPreparerActions({ userId }: TaxPreparerActionsProps) {
  const [links, setLinks] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const response = await fetch('/api/mobile-hub/preparer-links');
      const data = await response.json();
      if (data.success) {
        setLinks(data.data);
      }
    } catch (error) {
      logger.error('Error loading links:', error);
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
      {/* Tax Intake Link */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Tax Intake Form</CardTitle>
          </div>
          <CardDescription>Share with clients to start their tax filing</CardDescription>
        </CardHeader>
        <CardContent>
          <ShareButton
            title="Share Intake Form"
            description="Start your tax filing with TaxGeniusPro! Click here to begin:"
            url={
              links?.intakeUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/start-filing?ref=${userId}`
            }
            icon={<FileText className="h-5 w-5 mr-2" />}
            trackingId={`intake-${userId}`}
          />
        </CardContent>
      </Card>

      {/* Lead Form Link */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Lead Generation Form</CardTitle>
          </div>
          <CardDescription>Capture potential client information</CardDescription>
        </CardHeader>
        <CardContent>
          <ShareButton
            title="Share Lead Form"
            description="Interested in professional tax services? Get a free consultation:"
            url={links?.leadUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/contact?ref=${userId}`}
            icon={<Users className="h-5 w-5 mr-2" />}
            trackingId={`lead-${userId}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
