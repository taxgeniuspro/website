'use client';

/**
 * Link Performance Card
 *
 * Side-by-side comparison of Tax Filing Link vs Appointment Link performance
 * Shows clicks, leads generated, and earnings for each link
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FileText, Calendar, MousePointerClick, Users, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkPerformanceCardProps {
  intakeLink: {
    clicks: number;
    leads: number;
    earnings: number;
  };
  appointmentLink: {
    clicks: number;
    leads: number;
    earnings: number;
  };
  className?: string;
}

export function LinkPerformanceCard({
  intakeLink,
  appointmentLink,
  className,
}: LinkPerformanceCardProps) {
  const totalClicks = intakeLink.clicks + appointmentLink.clicks;
  const totalLeads = intakeLink.leads + appointmentLink.leads;
  const totalEarnings = intakeLink.earnings + appointmentLink.earnings;

  const intakeClickPercentage = totalClicks > 0 ? (intakeLink.clicks / totalClicks) * 100 : 0;
  const appointmentClickPercentage =
    totalClicks > 0 ? (appointmentLink.clicks / totalClicks) * 100 : 0;

  const intakeEarningsPercentage =
    totalEarnings > 0 ? (intakeLink.earnings / totalEarnings) * 100 : 0;
  const appointmentEarningsPercentage =
    totalEarnings > 0 ? (appointmentLink.earnings / totalEarnings) * 100 : 0;

  const links = [
    {
      name: 'Tax Filing Link',
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      data: intakeLink,
      clickPercentage: intakeClickPercentage,
      earningsPercentage: intakeEarningsPercentage,
    },
    {
      name: 'Appointment Link',
      icon: Calendar,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      data: appointmentLink,
      clickPercentage: appointmentClickPercentage,
      earningsPercentage: appointmentEarningsPercentage,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Link Performance</CardTitle>
        <CardDescription>Compare how your two referral links are performing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {links.map((link) => {
            const Icon = link.icon;
            const conversionRate =
              link.data.clicks > 0 ? (link.data.leads / link.data.clicks) * 100 : 0;

            return (
              <div
                key={link.name}
                className={cn('p-4 rounded-lg border-2', link.borderColor, 'space-y-4')}
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', link.bgColor)}>
                    <Icon className={cn('h-5 w-5', link.color)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{link.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {conversionRate.toFixed(1)}% conversion rate
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MousePointerClick className="h-4 w-4" />
                      <span>Clicks</span>
                    </div>
                    <span className="font-semibold">{link.data.clicks.toLocaleString()}</span>
                  </div>
                  <Progress value={link.clickPercentage} className="h-2" />

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Leads</span>
                    </div>
                    <span className="font-semibold">{link.data.leads}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Earnings</span>
                    </div>
                    <span className="font-semibold">
                      $
                      {link.data.earnings.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <Progress value={link.earningsPercentage} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Clicks</p>
              <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Leads</p>
              <p className="text-2xl font-bold">{totalLeads}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
              <p className="text-2xl font-bold">
                $
                {totalEarnings.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
