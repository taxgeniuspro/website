'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Copy,
  CheckCircle2,
  Download,
  ExternalLink,
  AlertCircle,
  Edit3,
  QrCode,
  Lock,
  Link2,
  Users,
  ClipboardList,
  BarChart3,
  Eye,
  Check,
  Zap,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { LogoUploadCard } from './LogoUploadCard';

interface TrackingCodeData {
  trackingCode: string;
  customTrackingCode: string | null;
  trackingCodeChanged: boolean;
  trackingCodeFinalized: boolean;
  trackingCodeQRUrl: string | null;
  canCustomize: boolean;
  activeCode: string;
  trackingUrl: string;
  qrCodeLogoUrl?: string | null;
}

interface IntegratedLink {
  id: string;
  code: string;
  url: string;
  shortUrl: string | null;
  title: string | null;
  description: string | null;
  qrCodeImageUrl: string | null;
  targetPage: string;
  clicks?: number;
  uniqueClicks?: number;
  conversions?: number;
}

interface TrackingCodeDashboardProps {
  userId: string;
  profileId: string;
  role: 'tax_preparer' | 'affiliate' | 'client';
  canEdit?: boolean;
  canViewAnalytics?: boolean;
}

export function TrackingCodeDashboard({ userId, profileId, role }: TrackingCodeDashboardProps) {
  const [trackingData, setTrackingData] = useState<TrackingCodeData | null>(null);
  const [integratedLinks, setIntegratedLinks] = useState<IntegratedLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch tracking code data
  useEffect(() => {
    async function fetchData() {
      try {
        const [trackingResponse, linksResponse] = await Promise.all([
          fetch('/api/profile/tracking-code'),
          fetch('/api/profile/tracking-links'),
        ]);

        if (!trackingResponse.ok) throw new Error('Failed to fetch tracking code');

        const trackingResult = await trackingResponse.json();
        setTrackingData(trackingResult.data);

        if (linksResponse.ok) {
          const linksResult = await linksResponse.json();
          setIntegratedLinks(linksResult.links || []);
        }
      } catch (error) {
        toast.error('Failed to load tracking code');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Check code availability with debounce
  useEffect(() => {
    if (!customCode || customCode.length < 3) {
      setAvailability(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsChecking(true);
      try {
        const response = await fetch('/api/profile/tracking-code/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: customCode }),
        });
        const result = await response.json();
        setAvailability(result);
      } catch (error) {
        toast.error('Failed to check availability');
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [customCode]);

  // Save custom code
  const handleSaveCustomCode = async () => {
    if (!customCode || !availability?.available) return;

    setIsSaving(true);

    try {
      const response = await fetch('/api/profile/tracking-code', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save tracking code');
      }

      const result = await response.json();
      setTrackingData(result.data);
      setIsEditing(false);
      setCustomCode('');
      setAvailability(null);

      toast.success('Tracking code updated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Finalize tracking code
  const handleFinalizeCode = async () => {
    if (
      !confirm(
        'Are you sure? Once finalized, your tracking code cannot be changed. This will also generate your marketing links.'
      )
    ) {
      return;
    }

    setIsFinalizing(true);

    try {
      const response = await fetch('/api/profile/tracking-code/finalize', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to finalize tracking code');
      }

      const result = await response.json();
      setTrackingData(result.data);

      // Refresh links
      const linksResponse = await fetch('/api/profile/tracking-links');
      if (linksResponse.ok) {
        const linksResult = await linksResponse.json();
        setIntegratedLinks(linksResult.links || []);
      }

      toast.success('Tracking code finalized! Your marketing links are now ready.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  // Download QR code
  const downloadQRCode = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded!');
  };

  // Get link info with styling
  const getLinkInfo = (link: IntegratedLink) => {
    const code = link.code.toLowerCase();
    const targetPage = link.targetPage?.toLowerCase() || '';

    // Lead form
    if (code.includes('-lead') || targetPage.includes('contact')) {
      return {
        icon: <Users className="h-5 w-5" />,
        badge: 'Lead Form',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        description: 'Quick contact form for lead capture',
        gradient: 'from-blue-500 to-cyan-500',
        borderColor: 'border-l-blue-500',
      };
    }

    // Intake form
    if (code.includes('-intake') || targetPage.includes('filing')) {
      return {
        icon: <ClipboardList className="h-5 w-5" />,
        badge: 'Tax Intake',
        badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        description: 'Complete tax return intake form',
        gradient: 'from-green-500 to-emerald-500',
        borderColor: 'border-l-green-500',
      };
    }

    // Appointment link
    if (code.includes('-appt') || targetPage.includes('book')) {
      return {
        icon: <Calendar className="h-5 w-5" />,
        badge: 'Appointment',
        badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        description: 'Book an appointment',
        gradient: 'from-purple-500 to-violet-500',
        borderColor: 'border-l-purple-500',
      };
    }

    // Default
    return {
      icon: <Link2 className="h-5 w-5" />,
      badge: 'Custom Link',
      badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      description: link.description || 'Custom marketing link',
      gradient: 'from-gray-500 to-slate-500',
      borderColor: 'border-l-gray-500',
    };
  };

  const isFinalized = trackingData?.trackingCodeFinalized || false;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!trackingData) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load tracking code data. Please refresh the page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Codes & Links</h1>
        <p className="text-muted-foreground mt-1">
          Your tracking codes, QR codes, and marketing links in one place
        </p>
      </div>

      {/* Quick Stats */}
      {isFinalized && integratedLinks.length > 0 && (
        <div className="grid gap-4 grid-cols-3">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Clicks</p>
                  <h3 className="text-xl sm:text-2xl font-bold mt-1">
                    {integratedLinks.reduce((sum, link) => sum + (link.clicks || 0), 0)}
                  </h3>
                </div>
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Unique Visitors</p>
                  <h3 className="text-xl sm:text-2xl font-bold mt-1">
                    {integratedLinks.reduce((sum, link) => sum + (link.uniqueClicks || 0), 0)}
                  </h3>
                </div>
                <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Conversions</p>
                  <h3 className="text-xl sm:text-2xl font-bold mt-1">
                    {integratedLinks.reduce((sum, link) => sum + (link.conversions || 0), 0)}
                  </h3>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tracking Code Section */}
      <Card className={isFinalized ? 'border-green-200 dark:border-green-900' : 'border-yellow-200 dark:border-yellow-900'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isFinalized ? (
                  <Lock className="h-5 w-5 text-green-600" />
                ) : (
                  <Zap className="h-5 w-5 text-yellow-600" />
                )}
                Your Tracking Code
              </CardTitle>
              <CardDescription>
                {isFinalized
                  ? 'Your code is locked and generating leads'
                  : 'Customize your code before finalizing'}
              </CardDescription>
            </div>
            {isFinalized && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Code Display */}
          <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Your Code</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-2xl sm:text-3xl font-bold font-mono text-blue-600 dark:text-blue-400">
                    {trackingData.activeCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(trackingData.activeCode, 'code')}
                  >
                    {copied === 'code' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {trackingData.trackingCodeQRUrl && (
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg border">
                    <img
                      src={trackingData.trackingCodeQRUrl}
                      alt={`QR Code for ${trackingData.activeCode}`}
                      className="w-20 h-20 sm:w-24 sm:h-24"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadQRCode(
                        trackingData.trackingCodeQRUrl!,
                        `tracking-qr-${trackingData.activeCode}.png`
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Tracking URL */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your Tracking URL</Label>
            <div className="flex items-center gap-2">
              <Input value={trackingData.trackingUrl} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(trackingData.trackingUrl, 'url')}
              >
                {copied === 'url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(trackingData.trackingUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Actions for non-finalized codes */}
          {!isFinalized && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                {!isEditing ? (
                  <>
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="flex-1">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Customize Code
                    </Button>
                    <Button
                      onClick={handleFinalizeCode}
                      disabled={isFinalizing}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {isFinalizing ? (
                        'Finalizing...'
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Finalize & Generate Links
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                )}
              </div>

              {/* Customization Form */}
              {isEditing && (
                <Card className="border-2 border-primary">
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customCode">Custom Tracking Code</Label>
                      <Input
                        id="customCode"
                        value={customCode}
                        onChange={(e) =>
                          setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))
                        }
                        placeholder="your-custom-code"
                        maxLength={20}
                        disabled={isSaving}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        3-20 characters: lowercase letters, numbers, hyphens, underscores
                      </p>
                    </div>

                    {isChecking && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        Checking availability...
                      </div>
                    )}

                    {availability && !isChecking && (
                      <Alert variant={availability.available ? 'default' : 'destructive'}>
                        {availability.available ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertDescription>
                          {availability.available
                            ? 'Code is available!'
                            : availability.reason || 'Code is not available'}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handleSaveCustomCode}
                      disabled={!availability?.available || isSaving}
                      className="w-full"
                    >
                      {isSaving ? 'Saving...' : 'Save Custom Code'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Marketing Links Section */}
      {!isFinalized ? (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Finalize Your Code First
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your marketing links and QR codes will be automatically generated once you finalize your
                  tracking code. Click "Finalize & Generate Links" above to get started.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : integratedLinks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Links Generated Yet</h3>
            <p className="text-muted-foreground">
              Your marketing links are being generated. Please refresh the page in a moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Marketing Links</h2>
          <div className="grid gap-4">
            {integratedLinks.map((link) => {
              const linkInfo = getLinkInfo(link);
              return (
                <Card
                  key={link.id}
                  className={`overflow-hidden border-l-4 ${linkInfo.borderColor}`}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Link Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            {linkInfo.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{link.title || link.code}</h3>
                              <Badge className={linkInfo.badgeColor} variant="secondary">
                                {linkInfo.badge}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{linkInfo.description}</p>
                          </div>
                        </div>

                        {/* Short URL */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Short URL
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={link.shortUrl || link.url}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(link.shortUrl || link.url, `short-${link.id}`)
                              }
                            >
                              {copied === `short-${link.id}` ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(link.shortUrl || link.url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-6 text-sm">
                          <div>
                            <span className="font-bold">{link.clicks || 0}</span>
                            <span className="text-muted-foreground ml-1">clicks</span>
                          </div>
                          <div>
                            <span className="font-bold">{link.uniqueClicks || 0}</span>
                            <span className="text-muted-foreground ml-1">unique</span>
                          </div>
                          <div>
                            <span className="font-bold">{link.conversions || 0}</span>
                            <span className="text-muted-foreground ml-1">conversions</span>
                          </div>
                        </div>
                      </div>

                      {/* QR Code */}
                      {link.qrCodeImageUrl && (
                        <div className="flex flex-row lg:flex-col items-center gap-3 p-3 bg-muted rounded-lg">
                          <div className="p-2 bg-white rounded-lg border">
                            <img
                              src={link.qrCodeImageUrl}
                              alt={`QR Code for ${link.code}`}
                              className="w-24 h-24 sm:w-28 sm:h-28"
                            />
                          </div>
                          <Button
                            onClick={() =>
                              downloadQRCode(link.qrCodeImageUrl!, `${link.code}-qr.png`)
                            }
                            size="sm"
                            variant="secondary"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download QR
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Branding Section - Only show for tax preparers */}
      {role === 'tax_preparer' && isFinalized && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">QR Code Branding</h2>
          <LogoUploadCard
            currentLogoUrl={trackingData.qrCodeLogoUrl || null}
            onLogoUpdated={(newLogoUrl) => {
              setTrackingData((prev) =>
                prev ? { ...prev, qrCodeLogoUrl: newLogoUrl } : null
              );
            }}
            isFinalized={isFinalized}
          />
        </div>
      )}
    </div>
  );
}
