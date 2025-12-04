'use client';

/**
 * Affiliate Application Form
 *
 * Public page for submitting affiliate applications
 * Supports optional tax preparer bonding via username parameter
 *
 * URL patterns:
 * - /affiliate/apply (standard application)
 * - /affiliate/apply?preparer=johnsmith (bonding request)
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, UserCheck, Link2 } from 'lucide-react';
import { logger } from '@/lib/logger';

const PLATFORMS = [
  'Facebook',
  'Instagram',
  'Twitter',
  'TikTok',
  'YouTube',
  'Blog/Website',
  'Email List',
  'WhatsApp',
  'LinkedIn',
  'Pinterest',
];

// Component that uses searchParams - must be wrapped in Suspense
function AffiliateApplicationForm() {
  const t = useTranslations('forms.affiliateApplication');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const preparerUsername = searchParams?.get('preparer');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    experience: '',
    audience: '',
    platforms: [] as string[],
    website: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      tiktok: '',
      youtube: '',
    },
    message: '',
    agreeToTerms: false,
    bondToPreparerUsername: preparerUsername || '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlatformToggle = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/applications/affiliate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          locale: locale, // Pass locale for language-based email routing
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSubmitted(true);
      logger.info('Affiliate application submitted', { email: formData.email });
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
      logger.error('Failed to submit affiliate application', { error: err });
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">{t('successTitle')}</CardTitle>
            <CardDescription>
              {preparerUsername
                ? t('successSubtitleBonded')
                : t('successSubtitleDefault')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-2">{t('whatHappensNext')}</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{t('nextStep1')}</li>
                  <li>{t('nextStep2')}</li>
                  {preparerUsername && <li>{t('nextStep3Bonded')}</li>}
                  <li>{t('nextStep4')}</li>
                  <li>{t('nextStep5')}</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => (window.location.href = '/')}>
                {t('backToHome')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Application form
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">{t('pageTitle')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('pageSubtitle')}
          </p>
        </div>

        {/* Bonding Banner */}
        {preparerUsername && (
          <Alert className="mb-6 border-primary">
            <UserCheck className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">{t('bondingBanner')}</p>
              <p className="text-sm mt-1">
                {t('bondingDescription', { username: <Badge className="font-mono">{preparerUsername}</Badge> })}
              </p>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('personalInfoTitle')}</CardTitle>
              <CardDescription>{t('personalInfoSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('firstName')} *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('lastName')} *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone')} *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marketing Experience */}
          <Card>
            <CardHeader>
              <CardTitle>{t('marketingExpTitle')}</CardTitle>
              <CardDescription>{t('marketingExpSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="experience">{t('experience')}</Label>
                <Textarea
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder={t('experiencePlaceholder')}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audience">{t('audience')}</Label>
                <Textarea
                  id="audience"
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                  placeholder={t('audiencePlaceholder')}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('platformsLabel')}</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PLATFORMS.map((platform) => (
                    <div key={platform} className="flex items-center space-x-2">
                      <Checkbox
                        id={platform}
                        checked={formData.platforms.includes(platform)}
                        onCheckedChange={() => handlePlatformToggle(platform)}
                      />
                      <label
                        htmlFor={platform}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {platform}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Online Presence */}
          <Card>
            <CardHeader>
              <CardTitle>{t('onlinePresenceTitle')}</CardTitle>
              <CardDescription>{t('onlinePresenceSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website">{t('website')}</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder={t('websitePlaceholder')}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="facebook">{t('facebook')}</Label>
                  <Input
                    id="facebook"
                    value={formData.socialMedia.facebook}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socialMedia: { ...formData.socialMedia, facebook: e.target.value },
                      })
                    }
                    placeholder={t('facebookPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">{t('instagram')}</Label>
                  <Input
                    id="instagram"
                    value={formData.socialMedia.instagram}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socialMedia: { ...formData.socialMedia, instagram: e.target.value },
                      })
                    }
                    placeholder={t('instagramPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">{t('twitter')}</Label>
                  <Input
                    id="twitter"
                    value={formData.socialMedia.twitter}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socialMedia: { ...formData.socialMedia, twitter: e.target.value },
                      })
                    }
                    placeholder={t('twitterPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube">{t('youtube')}</Label>
                  <Input
                    id="youtube"
                    value={formData.socialMedia.youtube}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socialMedia: { ...formData.socialMedia, youtube: e.target.value },
                      })
                    }
                    placeholder={t('youtubePlaceholder')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('additionalInfoTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">{t('whyAffiliate')}</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={t('whyAffiliatePlaceholder')}
                  rows={4}
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, agreeToTerms: checked as boolean })
                  }
                  required
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('agreeToTerms', {
                    termsLink: <a href="/terms" className="text-primary hover:underline" target="_blank">{t('termsAndConditions')}</a>,
                    privacyLink: <a href="/privacy" className="text-primary hover:underline" target="_blank">{t('privacyPolicy')}</a>
                  })}
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              size="lg"
              disabled={loading || !formData.agreeToTerms}
              className="min-w-[200px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                t('submitButton')
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function AffiliateApplicationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">{/* Loading message will be shown while translations load */}</p>
          </div>
        </div>
      }
    >
      <AffiliateApplicationForm />
    </Suspense>
  );
}
