'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReferralLinksManager } from '@/components/dashboard/ReferralLinksManager';
import { Gift, DollarSign, Users, TrendingUp } from 'lucide-react';

export default function TaxPreparerShareEarnPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Share & Earn</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Share your referral links and QR codes to earn commissions
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            Earn commissions by referring clients to Tax Genius Pro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">1. Share Your Link</h3>
                <p className="text-sm text-muted-foreground">
                  Send your personalized referral link or QR code to potential clients
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">2. They Sign Up</h3>
                <p className="text-sm text-muted-foreground">
                  When someone clicks your link and starts their tax filing, you get credit
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
                <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold">3. Earn Commissions</h3>
                <p className="text-sm text-muted-foreground">
                  Get paid when your referrals complete their tax filing
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Links Manager */}
      <ReferralLinksManager />
    </div>
  );
}
