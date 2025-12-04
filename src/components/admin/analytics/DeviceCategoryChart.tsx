/**
 * Device Category Chart Component
 * Shows mobile vs desktop vs tablet traffic breakdown
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import type { GA4DeviceCategory } from '@/lib/services/google-analytics.service';

interface DeviceCategoryChartProps {
  devices: GA4DeviceCategory[];
  isLoading?: boolean;
}

export function DeviceCategoryChart({ devices, isLoading }: DeviceCategoryChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Breakdown</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-40 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!devices || devices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Breakdown</CardTitle>
          <CardDescription>No device data available</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Device data will appear once GA4 is configured</p>
        </CardContent>
      </Card>
    );
  }

  const getDeviceIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('mobile')) return Smartphone;
    if (lower.includes('tablet')) return Tablet;
    return Monitor;
  };

  const getDeviceColor = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('mobile')) return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
    if (lower.includes('tablet')) return 'text-purple-600 bg-purple-50 dark:bg-purple-950';
    return 'text-green-600 bg-green-50 dark:bg-green-950';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Breakdown</CardTitle>
        <CardDescription>Sessions by device type</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Device Categories */}
        <div className="grid gap-4">
          {devices.map((device, index) => {
            const Icon = getDeviceIcon(device.deviceCategory);
            const colorClass = getDeviceColor(device.deviceCategory);

            return (
              <div key={index} className={`p-4 rounded-lg ${colorClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium capitalize">{device.deviceCategory}</span>
                  </div>
                  <span className="text-2xl font-bold">{device.percentage.toFixed(1)}%</span>
                </div>
                <p className="text-sm opacity-80">
                  {device.sessions.toLocaleString()} sessions
                </p>
              </div>
            );
          })}
        </div>

        {/* Total Sessions */}
        <div className="pt-4 border-t text-center">
          <p className="text-2xl font-bold">
            {devices.reduce((sum, d) => sum + d.sessions, 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total Sessions Across All Devices</p>
        </div>
      </CardContent>
    </Card>
  );
}
