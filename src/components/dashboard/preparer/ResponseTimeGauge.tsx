'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ResponseTimeGaugeProps {
  averageHours: number;
  targetHours?: number;
}

export function ResponseTimeGauge({ averageHours, targetHours = 4 }: ResponseTimeGaugeProps) {
  // Determine status based on response time
  const getStatus = () => {
    if (averageHours === 0) {
      return {
        label: 'No data',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        icon: Clock,
        message: 'Start responding to see your average',
      };
    }
    if (averageHours <= targetHours) {
      return {
        label: 'Excellent',
        color: 'text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        icon: CheckCircle,
        message: `Under ${targetHours}h target - Great job!`,
      };
    }
    if (averageHours <= targetHours * 2) {
      return {
        label: 'Good',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        icon: AlertTriangle,
        message: 'Try to respond faster',
      };
    }
    return {
      label: 'Needs Improvement',
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      icon: XCircle,
      message: 'Response time is too slow',
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  // Calculate gauge percentage (max at 2x target)
  const maxHours = targetHours * 2;
  const percentage = Math.min((averageHours / maxHours) * 100, 100);
  const gaugeRotation = (percentage / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5" />
          Response Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Semi-circular gauge */}
          <div className="relative w-32 h-16 overflow-hidden">
            {/* Background arc */}
            <div className="absolute inset-0 rounded-t-full bg-muted" />
            {/* Colored arc based on status */}
            <div
              className={`absolute inset-0 rounded-t-full ${status.bgColor}`}
              style={{
                clipPath: `polygon(50% 100%, 0% 100%, 0% 0%, ${50 + (percentage / 100) * 50}% 0%, 50% 100%)`,
              }}
            />
            {/* Center display */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
              <StatusIcon className={`h-6 w-6 mx-auto ${status.color}`} />
            </div>
          </div>

          {/* Value display */}
          <div className="mt-4 text-center">
            <p className="text-3xl font-bold">
              {averageHours > 0 ? averageHours.toFixed(1) : '--'}
              <span className="text-lg font-normal text-muted-foreground ml-1">hrs</span>
            </p>
            <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{status.message}</p>
          </div>

          {/* Target indicator */}
          <div className="mt-3 pt-3 border-t w-full text-center">
            <p className="text-xs text-muted-foreground">
              Target: Under {targetHours} hours
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
