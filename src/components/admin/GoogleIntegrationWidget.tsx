'use client';

/**
 * Google Integration Status Widget
 *
 * Shows status and controls for all Google company integrations:
 * - Google Sheets (data sync)
 * - Google Drive (document backup)
 * - Google Calendar (master calendar)
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  HardDrive,
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Clock,
  FileSpreadsheet,
  FolderOpen,
  CalendarDays,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SyncStatus {
  sheetType: string;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  lastSyncAt: string | null;
  rowCount: number;
  syncStatus: string;
}

interface GoogleStatus {
  configured: boolean;
  serviceAccountEmail?: string;
  sheets?: {
    connected: boolean;
    syncs: SyncStatus[];
  };
  drive?: {
    connected: boolean;
    totalBackups: number;
    totalSize: number;
  };
  calendar?: {
    connected: boolean;
    totalEvents: number;
    appointmentEvents: number;
  };
}

export function GoogleIntegrationWidget() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStatus = useCallback(async () => {
    try {
      // Test connection
      const testRes = await fetch('/api/google/test');
      const testData = await testRes.json();

      if (!testData.configured) {
        setStatus({ configured: false });
        return;
      }

      // Fetch all statuses in parallel
      const [sheetsRes, driveRes, calendarRes] = await Promise.all([
        fetch('/api/google/sheets/sync').catch(() => null),
        fetch('/api/google/drive').catch(() => null),
        fetch('/api/google/calendar').catch(() => null),
      ]);

      const sheetsData = sheetsRes?.ok ? await sheetsRes.json() : null;
      const driveData = driveRes?.ok ? await driveRes.json() : null;
      const calendarData = calendarRes?.ok ? await calendarRes.json() : null;

      setStatus({
        configured: true,
        serviceAccountEmail: testData.serviceAccountEmail,
        sheets: sheetsData
          ? {
              connected: testData.services.sheets,
              syncs: sheetsData.status || [],
            }
          : undefined,
        drive: driveData
          ? {
              connected: testData.services.drive,
              totalBackups: driveData.stats?.totalBackups || 0,
              totalSize: driveData.stats?.totalSize || 0,
            }
          : undefined,
        calendar: calendarData
          ? {
              connected: testData.services.calendar,
              totalEvents: calendarData.stats?.totalEvents || 0,
              appointmentEvents: calendarData.stats?.appointmentEvents || 0,
            }
          : undefined,
      });
    } catch (error) {
      console.error('Failed to fetch Google status:', error);
      setStatus({ configured: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSync = async (type: string) => {
    setSyncing(type);
    try {
      const res = await fetch(`/api/google/sheets/sync?type=${type}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Sync Complete',
          description: `${type} data synced to Google Sheets`,
        });
        fetchStatus();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleInitDrive = async () => {
    setSyncing('drive');
    try {
      const res = await fetch('/api/google/drive?action=init', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Drive Initialized',
          description: 'Folder structure created successfully',
        });
        fetchStatus();
      } else {
        throw new Error(data.error || 'Initialization failed');
      }
    } catch (error) {
      toast({
        title: 'Initialization Failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Google Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status?.configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Google Integration
          </CardTitle>
          <CardDescription>Not configured</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm mb-4">
              Google service account not configured. Set environment variables:
            </p>
            <code className="text-xs bg-muted p-2 rounded block">
              GOOGLE_SERVICE_ACCOUNT_EMAIL
              <br />
              GOOGLE_SERVICE_ACCOUNT_KEY
            </code>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Google Integration
        </CardTitle>
        <CardDescription>
          Connected as {status.serviceAccountEmail}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Sheets Section */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold">Google Sheets</h3>
              <Badge variant={status.sheets?.connected ? 'default' : 'secondary'}>
                {status.sheets?.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSync('all')}
              disabled={syncing === 'all'}
            >
              {syncing === 'all' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync All
            </Button>
          </div>

          {status.sheets?.syncs && status.sheets.syncs.length > 0 ? (
            <div className="grid gap-2">
              {status.sheets.syncs.map((sync) => (
                <div
                  key={sync.sheetType}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Sheet className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium capitalize">
                      {sync.sheetType.toLowerCase().replace('_', ' ')}
                    </span>
                    {sync.syncStatus === 'SYNCED' ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : sync.syncStatus === 'FAILED' ? (
                      <XCircle className="w-3 h-3 text-red-500" />
                    ) : (
                      <Clock className="w-3 h-3 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {sync.rowCount} rows
                    </span>
                    {sync.spreadsheetUrl && (
                      <a
                        href={sync.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSync(sync.sheetType.toLowerCase())}
                      disabled={syncing === sync.sheetType.toLowerCase()}
                    >
                      {syncing === sync.sheetType.toLowerCase() ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No sheets synced yet. Click &quot;Sync All&quot; to start.
            </p>
          )}
        </div>

        {/* Google Drive Section */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold">Google Drive</h3>
              <Badge variant={status.drive?.connected ? 'default' : 'secondary'}>
                {status.drive?.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleInitDrive}
              disabled={syncing === 'drive'}
            >
              {syncing === 'drive' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <HardDrive className="w-4 h-4 mr-2" />
              )}
              Initialize Folders
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded">
              <p className="text-2xl font-bold">{status.drive?.totalBackups || 0}</p>
              <p className="text-xs text-muted-foreground">Documents Backed Up</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded">
              <p className="text-2xl font-bold">
                {formatBytes(status.drive?.totalSize || 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Storage Used</p>
            </div>
          </div>
        </div>

        {/* Google Calendar Section */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Google Calendar</h3>
              <Badge variant={status.calendar?.connected ? 'default' : 'secondary'}>
                {status.calendar?.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Open Calendar
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded">
              <p className="text-2xl font-bold">{status.calendar?.totalEvents || 0}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded">
              <p className="text-2xl font-bold">
                {status.calendar?.appointmentEvents || 0}
              </p>
              <p className="text-xs text-muted-foreground">Appointments Synced</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
