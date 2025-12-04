'use client';

import { useEffect, useState } from 'react';
import { ShareButton } from './ShareButton';
import { Link2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

interface AffiliateActionsProps {
  userId: string;
}

export function AffiliateActions({ userId }: AffiliateActionsProps) {
  const [links, setLinks] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const response = await fetch('/api/mobile-hub/affiliate-links');
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
      {/* Referral Link */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Referral Link</CardTitle>
          </div>
          <CardDescription>Share and earn commissions on every referral</CardDescription>
        </CardHeader>
        <CardContent>
          <ShareButton
            title="Share Referral"
            description="Get professional tax services! Use my referral link for special benefits:"
            url={links?.referralUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/ref/${userId}`}
            icon={<Link2 className="h-5 w-5 mr-2" />}
            trackingId={`referral-${userId}`}
          />
        </CardContent>
      </Card>

      {/* Custom Tracking Link */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Custom Tracking Link</CardTitle>
          </div>
          <CardDescription>Track your marketing campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <ShareButton
            title="Share Tracking Link"
            description="Professional tax preparation services - Get started today:"
            url={links?.trackingUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/?aff=${userId}`}
            icon={<TrendingUp className="h-5 w-5 mr-2" />}
            trackingId={`tracking-${userId}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
