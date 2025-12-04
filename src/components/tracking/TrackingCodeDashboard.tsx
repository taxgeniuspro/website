'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Copy,
  CheckCircle2,
  Download,
  ExternalLink,
  AlertCircle,
  Edit3,
  Sparkles,
  QrCode,
  Lock,
  Link2,
  Users,
  ClipboardList,
  BarChart3,
  Eye,
  Camera,
  Check,
  Zap,
  TrendingUp,
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
        description:
          'Quick contact form for lead capture. Perfect for business cards, flyers, and social media.',
        formType: 'Simple • 1 Page',
        gradient: 'from-blue-500 to-cyan-500',
      };
    }

    // Intake form
    if (code.includes('-intake') || targetPage.includes('filing')) {
      return {
        icon: <ClipboardList className="h-5 w-5" />,
        badge: 'Tax Intake',
        badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        description:
          'Complete tax return intake form. For clients ready to submit their full tax information.',
        formType: 'Comprehensive • Multi-Step',
        gradient: 'from-green-500 to-emerald-500',
      };
    }

    // Default
    return {
      icon: <Link2 className="h-5 w-5" />,
      badge: 'Custom Link',
      badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      description: link.description || 'Custom marketing link',
      formType: 'Custom',
      gradient: 'from-gray-500 to-slate-500',
    };
  };

  const isFinalized = trackingData?.trackingCodeFinalized || false;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!trackingData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load tracking code data. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Tracking</h1>
          <p className="text-muted-foreground mt-2">
            Manage your tracking code, QR codes, and marketing links in one place
          </p>
        </div>

        {/* Quick Stats */}
        {isFinalized && integratedLinks.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {integratedLinks.reduce((sum, link) => sum + (link.clicks || 0), 0)}
                    </h3>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unique Visitors</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {integratedLinks.reduce((sum, link) => sum + (link.uniqueClicks || 0), 0)}
                    </h3>
                  </div>
                  <Eye className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Links</p>
                    <h3 className="text-2xl font-bold mt-1">{integratedLinks.length}</h3>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <Sparkles className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="links">
            <Link2 className="h-4 w-4 mr-2" />
            Marketing Links
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Camera className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Tracking Code Card */}
          <Card className={isFinalized ? 'border-green-200 dark:border-green-900' : ''}>
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
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-medium text-muted-foreground">Active Code</Label>
                  {isFinalized && <Badge className="bg-green-500">Finalized</Badge>}
                </div>
                <div className="flex items-center gap-4">
                  <code className="text-3xl font-bold font-mono text-blue-600 dark:text-blue-400">
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

              {/* Actions */}
              {!isFinalized && (
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
              )}

              {/* Customization Form */}
              {isEditing && !isFinalized && (
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

                    {/* Availability Status */}
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
                            ? '✓ Code is available!'
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
            </CardContent>
          </Card>

          {/* QR Code Card */}
          {trackingData.trackingCodeQRUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Universal QR Code
                </CardTitle>
                <CardDescription>
                  Scan this QR code to visit your main tracking page
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                  <img
                    src={trackingData.trackingCodeQRUrl}
                    alt={`QR Code for ${trackingData.activeCode}`}
                    className="w-48 h-48"
                  />
                </div>
                <Button
                  onClick={() =>
                    downloadQRCode(
                      trackingData.trackingCodeQRUrl!,
                      `tracking-qr-${trackingData.activeCode}.png`
                    )
                  }
                  className="w-full sm:w-auto"
                  variant="default"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Marketing Links Tab */}
        <TabsContent value="links" className="space-y-6">
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
                      Your marketing links will be automatically generated once you finalize your tracking
                      code. Click "Finalize & Generate Links" in the Overview tab to get started.
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
            <div className="grid gap-6">
              {integratedLinks.map((link) => {
                const linkInfo = getLinkInfo(link);
                return (
                  <Card
                    key={link.id}
                    className="overflow-hidden border-l-4"
                    style={{ borderLeftColor: `rgb(${linkInfo.gradient.includes('blue') ? '59 130 246' : '34 197 94'})` }}
                  >
                    <CardHeader className={`bg-gradient-to-r ${linkInfo.gradient} bg-opacity-5 pb-4`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            {linkInfo.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-xl">{link.title || link.code}</CardTitle>
                              <Badge className={linkInfo.badgeColor} variant="secondary">
                                {linkInfo.badge}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{linkInfo.formType}</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      {/* Description */}
                      <p className="text-sm text-muted-foreground">{linkInfo.description}</p>

                      {/* URLs */}
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Short URL (Best for sharing)
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

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Full URL</Label>
                          <div className="flex items-center gap-2">
                            <Input value={link.url} readOnly className="font-mono text-xs" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(link.url, `full-${link.id}`)}
                            >
                              {copied === `full-${link.id}` ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      {(link.clicks || link.uniqueClicks || link.conversions) && (
                        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{link.clicks || 0}</p>
                            <p className="text-xs text-muted-foreground">Clicks</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{link.uniqueClicks || 0}</p>
                            <p className="text-xs text-muted-foreground">Unique</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{link.conversions || 0}</p>
                            <p className="text-xs text-muted-foreground">Conversions</p>
                          </div>
                        </div>
                      )}

                      {/* QR Code */}
                      {link.qrCodeImageUrl && (
                        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-muted rounded-lg">
                          <div className="p-3 bg-white rounded-lg border">
                            <img
                              src={link.qrCodeImageUrl}
                              alt={`QR Code for ${link.code}`}
                              className="w-32 h-32"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <h4 className="font-medium">QR Code</h4>
                            <p className="text-sm text-muted-foreground">
                              Print this QR code on business cards, flyers, or display it at your office.
                            </p>
                            <Button
                              onClick={() =>
                                downloadQRCode(link.qrCodeImageUrl!, `${link.code}-qr.png`)
                              }
                              size="sm"
                              variant="secondary"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download QR
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="settings" className="space-y-6">
          {role === 'tax_preparer' && (
            <LogoUploadCard
              currentLogoUrl={trackingData.qrCodeLogoUrl || null}
              onLogoUpdated={(newLogoUrl) => {
                setTrackingData((prev) =>
                  prev ? { ...prev, qrCodeLogoUrl: newLogoUrl } : null
                );
              }}
              isFinalized={isFinalized}
            />
          )}

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>About QR Code Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Custom Logo</p>
                    <p className="text-muted-foreground">
                      Upload your photo or business logo to appear in the center of all QR codes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">High Quality</p>
                    <p className="text-muted-foreground">
                      All QR codes are generated at 512x512px with high error correction
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Professional Appearance</p>
                    <p className="text-muted-foreground">
                      Stand out with branded QR codes that clients will trust and remember
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
