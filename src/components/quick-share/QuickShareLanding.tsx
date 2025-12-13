'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  Home,
  LayoutDashboard,
  FileText,
  Users,
  Calendar,
  ClipboardList,
  Link2,
  Share2,
  QrCode,
  BarChart3,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { UserRole } from '@/lib/permissions';

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

interface QuickShareLandingProps {
  userId: string;
  role: UserRole;
  firstName?: string;
}

export function QuickShareLanding({ userId, role, firstName }: QuickShareLandingProps) {
  const router = useRouter();
  const [integratedLinks, setIntegratedLinks] = useState<IntegratedLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://taxgeniuspro.tax';

  // Fetch tracking links
  useEffect(() => {
    async function fetchLinks() {
      try {
        const response = await fetch('/api/profile/tracking-links');
        if (response.ok) {
          const result = await response.json();
          setIntegratedLinks(result.links || []);
        }
      } catch (error) {
        console.error('Failed to fetch links:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLinks();
  }, []);

  // Get role-specific dashboard route
  const getDashboardRoute = () => {
    switch (role) {
      case 'tax_preparer':
        return '/dashboard/tax-preparer';
      case 'affiliate':
        return '/dashboard/affiliate';
      case 'client':
        return '/dashboard/client';
      case 'admin':
        return '/dashboard/admin';
      default:
        return '/dashboard';
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

  // Share link using Web Share API or fallback to copy
  const shareLink = async (url: string, title: string, description: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        // User cancelled or share failed, fallback to copy
        copyToClipboard(url, 'share');
      }
    } else {
      copyToClipboard(url, 'share');
    }
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
        borderColor: 'border-l-blue-500',
        shareTitle: 'Get a Free Tax Consultation',
        shareDescription: 'Looking for professional tax services? Get a free consultation:',
      };
    }

    // Intake form
    if (code.includes('-intake') || targetPage.includes('filing')) {
      return {
        icon: <ClipboardList className="h-5 w-5" />,
        badge: 'Tax Intake',
        badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        description: 'Complete tax return intake form',
        borderColor: 'border-l-green-500',
        shareTitle: 'Start Your Tax Filing',
        shareDescription: 'Ready to file your taxes? Start here:',
      };
    }

    // Appointment link
    if (code.includes('-appt') || targetPage.includes('book')) {
      return {
        icon: <Calendar className="h-5 w-5" />,
        badge: 'Appointment',
        badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        description: 'Book an appointment',
        borderColor: 'border-l-purple-500',
        shareTitle: 'Book a Tax Appointment',
        shareDescription: 'Schedule a tax consultation:',
      };
    }

    // Default
    return {
      icon: <Link2 className="h-5 w-5" />,
      badge: 'Custom Link',
      badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      description: link.description || 'Custom marketing link',
      borderColor: 'border-l-gray-500',
      shareTitle: 'Tax Genius Pro',
      shareDescription: link.description || 'Check out Tax Genius Pro:',
    };
  };

  // Fallback links if no integrated links exist
  const fallbackLinks = [
    {
      id: 'intake-fallback',
      code: 'intake',
      url: `${baseUrl}/start-filing?ref=${userId}`,
      shortUrl: `${baseUrl}/start-filing?ref=${userId}`,
      title: 'Tax Intake Form',
      description: 'Complete tax return intake form',
      qrCodeImageUrl: null,
      targetPage: '/start-filing',
      clicks: 0,
      uniqueClicks: 0,
      conversions: 0,
    },
    {
      id: 'lead-fallback',
      code: 'lead',
      url: `${baseUrl}/contact?ref=${userId}`,
      shortUrl: `${baseUrl}/contact?ref=${userId}`,
      title: 'Lead Form',
      description: 'Quick contact form for lead capture',
      qrCodeImageUrl: null,
      targetPage: '/contact',
      clicks: 0,
      uniqueClicks: 0,
      conversions: 0,
    },
  ];

  const linksToDisplay = integratedLinks.length > 0 ? integratedLinks : fallbackLinks;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Quick Share{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          Share your links and earn referral bonuses
        </p>
      </div>

      {/* Quick Stats */}
      {integratedLinks.length > 0 && (
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

      {/* Share Links Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Share Links</h2>
        <div className="grid gap-4">
          {linksToDisplay.map((link) => {
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
                          Share URL
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

                      {/* Share Button */}
                      <Button
                        onClick={() =>
                          shareLink(
                            link.shortUrl || link.url,
                            linkInfo.shareTitle,
                            linkInfo.shareDescription
                          )
                        }
                        className="w-full sm:w-auto"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share This Link
                      </Button>

                      {/* Stats */}
                      {integratedLinks.length > 0 && (
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
                      )}
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

      {/* Navigation Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <Button
          size="lg"
          variant="outline"
          className="h-16 text-lg font-semibold"
          onClick={() => router.push(getDashboardRoute())}
        >
          <LayoutDashboard className="h-6 w-6 mr-3" />
          Go to Dashboard
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-16 text-lg font-semibold"
          onClick={() => router.push('/')}
        >
          <Home className="h-6 w-6 mr-3" />
          Go to Home Page
        </Button>
      </div>

      {/* Tip Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-6 text-center">
          <QrCode className="h-8 w-8 mx-auto mb-3 text-primary" />
          <h3 className="font-semibold mb-2">Pro Tip</h3>
          <p className="text-muted-foreground">
            Share your links on social media, print QR codes on business cards, or send directly to potential clients. Track your results in the dashboard!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
