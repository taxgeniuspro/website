'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { Header } from '@/components/header';
import { ShortLinkTracker } from '@/components/tracking/ShortLinkTracker';
import { BookingCallToAction } from '@/components/crm/BookingCallToAction';
import { ReferralBanner } from '@/components/ReferralBanner';
import { logger } from '@/lib/logger';

// Preparer info interface
interface PreparerInfo {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  trackingCode: string;
}

// Default company contact info
const DEFAULT_CONTACT = {
  phone: '+1 404-627-1015',
  email: 'taxgenius.tax@gmail.com',
};

function ContactPageContent() {
  const t = useTranslations('forms.contact');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const refCode = searchParams?.get('ref');

  const [preparer, setPreparer] = useState<PreparerInfo | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Always fetch preparer info - returns Owliver as default if no ref code
  useEffect(() => {
    fetchPreparerInfo(refCode || undefined);
  }, [refCode]);

  const fetchPreparerInfo = async (code?: string) => {
    try {
      const url = code
        ? `/api/preparer/by-code?code=${encodeURIComponent(code)}`
        : '/api/preparer/by-code';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.preparer) {
          setPreparer({
            ...data.preparer,
            trackingCode: data.preparer.trackingCode || code || 'ow',
          });
        }
      }
    } catch (error) {
      logger.error('Error fetching preparer info:', error);
    }
  };

  // Get preparer display name
  const preparerName = preparer ? `${preparer.firstName} ${preparer.lastName}` : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          locale: locale, // Pass locale for language-based email routing
          ref: refCode, // Pass ref code for preparer attribution
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      setSubmitSuccess(true);
      logger.info('Contact form submitted successfully', { contactId: data.contactId });
    } catch (error) {
      logger.error('Error submitting contact form:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Track short link clicks */}
      <Suspense fallback={null}>
        <ShortLinkTracker />
      </Suspense>

      <Header />
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              {t('badge')}
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              {t('pageTitle')} <span className="text-primary">{t('pageTitleHighlight')}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              {t('pageSubtitle')}
            </p>

            {/* Referral Banner - Shows preparer who will help */}
            {preparer && preparerName && (
              <ReferralBanner
                preparerName={preparerName}
                preparerAvatar={preparer.avatarUrl}
                className="max-w-2xl mx-auto"
              />
            )}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Mobile-first: Preparer card at top on mobile */}
          {preparer && (
            <div className="lg:hidden mb-8">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  {preparer.avatarUrl ? (
                    <img
                      src={preparer.avatarUrl}
                      alt={preparerName || 'Tax Preparer'}
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary/30 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/30">
                      <span className="text-2xl font-bold text-primary">
                        {preparer.firstName?.[0]}{preparer.lastName?.[0]}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('yourTaxPreparer')}</p>
                    <p className="font-bold text-xl text-foreground">{preparerName}</p>
                  </div>
                  {/* Direct contact buttons on mobile */}
                  <div className="flex gap-3 mt-2">
                    {preparer.phone && (
                      <a
                        href={`tel:${preparer.phone.replace(/[^+\d]/g, '')}`}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                      >
                        <Phone className="w-4 h-4" />
                        {t('call')}
                      </a>
                    )}
                    {preparer.email && (
                      <a
                        href={`mailto:${preparer.email}`}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium"
                      >
                        <Mail className="w-4 h-4" />
                        {t('email')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">{t('formTitle')}</CardTitle>
                  <CardDescription>
                    {t('formSubtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">{t('name')} *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">{t('email')} *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">{t('phone')}</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}|[0-9]{10}"
                          placeholder={t('phonePlaceholder')}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="service">{t('service')}</Label>
                        <select
                          id="service"
                          name="service"
                          value={formData.service}
                          onChange={handleInputChange}
                          className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md"
                        >
                          <option value="">{t('serviceSelect')}</option>
                          <option value="individual">{t('serviceIndividual')}</option>
                          <option value="business">{t('serviceBusiness')}</option>
                          <option value="real-estate">{t('serviceRealEstate')}</option>
                          <option value="audit-defense">{t('serviceAuditDefense')}</option>
                          <option value="tax-planning">{t('serviceTaxPlanning')}</option>
                          <option value="other">{t('serviceOther')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="message">{t('message')}</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        maxLength={1000}
                        rows={4}
                        className="mt-1"
                        placeholder={t('messagePlaceholder')}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('messageCounter', { count: formData.message.length })}
                      </p>
                    </div>

                    {submitError && (
                      <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
                        <p className="text-sm font-medium">{submitError}</p>
                      </div>
                    )}

                    {submitSuccess ? (
                      <div className="space-y-6">
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-6 py-8 rounded-lg text-center space-y-4">
                          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
                              {t('successTitle')}
                            </h3>
                            <p className="text-green-700 dark:text-green-300 mb-4">
                              {t('successMessage')}
                            </p>
                          </div>
                        </div>

                        {/* Booking Call-to-Action */}
                        <BookingCallToAction
                          contactEmail={formData.email}
                          contactName={formData.name}
                          contactPhone={formData.phone}
                        />

                        <div className="text-center">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSubmitSuccess(false);
                              setFormData({
                                name: '',
                                email: '',
                                phone: '',
                                service: '',
                                message: '',
                              });
                            }}
                          >
                            {t('sendAnother')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? t('sending') : t('sendMessage')}{' '}
                        {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
                      </Button>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              {/* Show preparer info prominently when assigned (hidden on mobile - shown at top instead) */}
              {preparer ? (
                <div>
                  {/* Preparer Card with Photo - Desktop only */}
                  <div className="hidden lg:block bg-primary/5 border border-primary/20 rounded-lg p-6 mb-6">
                    <div className="flex flex-col items-center text-center gap-4">
                      {preparer.avatarUrl ? (
                        <img
                          src={preparer.avatarUrl}
                          alt={preparerName || 'Tax Preparer'}
                          className="w-24 h-24 rounded-full object-cover border-4 border-primary/30 shadow-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/30">
                          <span className="text-2xl font-bold text-primary">
                            {preparer.firstName?.[0]}{preparer.lastName?.[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t('yourTaxPreparer')}</p>
                        <p className="font-bold text-xl text-foreground">{preparerName}</p>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-foreground mb-6">{t('contactInfoTitle')}</h2>
                  <div className="space-y-6">
                    {/* Preparer's Direct Phone */}
                    {preparer.phone && (
                      <div className="flex items-start gap-4">
                        <Phone className="w-6 h-6 text-primary mt-1" />
                        <div>
                          <h3 className="font-semibold mb-1">{t('directPhone')}</h3>
                          <a href={`tel:${preparer.phone.replace(/[^+\d]/g, '')}`} className="text-muted-foreground hover:text-primary transition-colors">
                            {preparer.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Preparer's Direct Email */}
                    {preparer.email && (
                      <div className="flex items-start gap-4">
                        <Mail className="w-6 h-6 text-primary mt-1" />
                        <div>
                          <h3 className="font-semibold mb-1">{t('directEmail')}</h3>
                          <a href={`mailto:${preparer.email}`} className="text-muted-foreground hover:text-primary transition-colors">
                            {preparer.email}
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <MapPin className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold mb-1">{t('contactLocation')}</h3>
                        <a
                          href="https://maps.google.com/?q=1632+Jonesboro+Rd+SE+Atlanta+GA+30315"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          1632 Jonesboro Rd SE
                          <br />
                          Atlanta, GA 30315
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Clock className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold mb-1">{t('contactHours')}</h3>
                        <div className="text-muted-foreground space-y-1">
                          <p>{t('monday')}</p>
                          <p>{t('tuesday')}</p>
                          <p>{t('wednesday')}</p>
                          <p>{t('thursday')}</p>
                          <p>{t('friday')}</p>
                          <p>{t('saturday')}</p>
                          <p>{t('sunday')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Corporate fallback when no preparer */
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-6">{t('contactInfoTitle')}</h2>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <Phone className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold mb-1">{t('contactPhone')}</h3>
                        <a href={`tel:${DEFAULT_CONTACT.phone.replace(/[^+\d]/g, '')}`} className="text-muted-foreground hover:text-primary transition-colors">
                          {DEFAULT_CONTACT.phone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Mail className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold mb-1">{t('contactEmail')}</h3>
                        <a href={`mailto:${DEFAULT_CONTACT.email}`} className="text-muted-foreground hover:text-primary transition-colors">
                          {DEFAULT_CONTACT.email}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <MapPin className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold mb-1">{t('contactLocation')}</h3>
                        <a
                          href="https://maps.google.com/?q=1632+Jonesboro+Rd+SE+Atlanta+GA+30315"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          1632 Jonesboro Rd SE
                          <br />
                          Atlanta, GA 30315
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Clock className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold mb-1">{t('contactHours')}</h3>
                        <div className="text-muted-foreground space-y-1">
                          <p>{t('monday')}</p>
                          <p>{t('tuesday')}</p>
                          <p>{t('wednesday')}</p>
                          <p>{t('thursday')}</p>
                          <p>{t('friday')}</p>
                          <p>{t('saturday')}</p>
                          <p>{t('sunday')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Service Guarantee */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{t('guaranteeTitle')}</h3>
                    <p className="text-muted-foreground text-sm">
                      {t('guaranteeMessage')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              {t('faqTitle')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('faqSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('faqQ1')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('faqA1')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('faqQ2')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('faqA2')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('faqQ3')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('faqA3')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('faqQ4')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('faqA4')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

// Default export with Suspense boundary for useSearchParams
export default function ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ContactPageContent />
    </Suspense>
  );
}
