'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Phone, Zap, ArrowRight, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ShortLinkTracker } from '@/components/tracking/ShortLinkTracker';
import { logger } from '@/lib/logger';
import Image from 'next/image';

// Default to Owliver Owl (company mascot) when no ref code
const DEFAULT_PREPARER = {
  firstName: 'Owliver',
  lastName: 'Owl',
  phone: '1 (404) 627-1015',
  email: 'taxgenius.tax@gmail.com',
  avatarUrl: 'https://res.cloudinary.com/dhktmiigh/image/upload/v1765487894/taxgeniuspro/preparers/preparer_ow.jpg',
  trackingCode: 'ow',
};

interface PreparerInfo {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  trackingCode: string;
}

type FormMode = 'advance' | 'filing';

function TaxSeasonPageContent() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams?.get('ref');

  // Parallax scroll effect
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 100]);

  const [preparer, setPreparer] = useState<PreparerInfo>(DEFAULT_PREPARER);
  const [hasCustomPreparer, setHasCustomPreparer] = useState(false);
  const [mode, setMode] = useState<FormMode>('filing');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    zipCode: '',
    preferredFiling: 'remote',
    consent: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Track if we've already captured this lead
  const lastCapturedDataRef = useRef<string>('');

  // Check if we're past January 2, 2026
  const isAvailableNow = () => {
    const now = new Date();
    const launchDate = new Date('2026-01-02T00:00:00');
    return now >= launchDate;
  };

  // Always fetch preparer info - API returns Owliver as default
  useEffect(() => {
    fetchPreparerInfo(refCode || undefined);
  }, [refCode]);

  // Early lead capture
  const captureLeadEarly = useCallback(async () => {
    if (!formData.firstName || (!formData.phone && !formData.email)) {
      return;
    }

    const dataSignature = `${formData.firstName}|${formData.lastName}|${formData.phone}|${formData.email}`;
    if (dataSignature === lastCapturedDataRef.current) {
      return;
    }

    try {
      await fetch('/api/lead/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email,
          zipCode: formData.zipCode,
          source: mode === 'advance' ? 'tax_season_advance' : 'tax_season_filing',
          ref: refCode || preparer.trackingCode,
        }),
      });
      lastCapturedDataRef.current = dataSignature;
    } catch (error) {
      logger.error('Early lead capture failed:', error);
    }
  }, [formData, mode, refCode, preparer.trackingCode]);

  const handleFieldBlur = useCallback((fieldName: string) => {
    if (fieldName === 'phone' || fieldName === 'email') {
      captureLeadEarly();
    }
  }, [captureLeadEarly]);

  // Generate Cloudinary avatar URL from tracking code
  const getAvatarUrl = (trackingCode: string) => {
    return `https://res.cloudinary.com/dhktmiigh/image/upload/v1765487894/taxgeniuspro/preparers/preparer_${trackingCode}.jpg`;
  };

  const fetchPreparerInfo = async (code?: string) => {
    try {
      const url = code
        ? `/api/preparer/by-code?code=${encodeURIComponent(code)}`
        : '/api/preparer/by-code';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.preparer) {
          const trackingCode = data.preparer.trackingCode || code || 'ow';
          // Use avatarUrl from API, or generate from tracking code
          const avatarUrl = data.preparer.avatarUrl || getAvatarUrl(trackingCode);
          setPreparer({
            ...data.preparer,
            trackingCode,
            avatarUrl,
          });
          setHasCustomPreparer(!!code && trackingCode !== 'ow');
        }
      }
    } catch (error) {
      logger.error('Error fetching preparer info:', error);
    }
  };

  const preparerName = `${preparer.firstName} ${preparer.lastName}`;
  const cleanPhone = preparer.phone?.replace(/[^+\d]/g, '') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) {
      setSubmitError('Please agree to be contacted to continue.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Submit to our API which saves to CRM, sends notifications, and returns redirect URL
      const response = await fetch('/api/tax-season/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email,
          zipCode: formData.zipCode,
          preferredFiling: formData.preferredFiling,
          ref: refCode || preparer.trackingCode,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit form');

      // Redirect to external taxgenius.tax page with all data pre-filled
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        // Fallback: show success if no redirect URL
        setSubmitSuccess(true);
      }
    } catch (error) {
      logger.error('Error submitting form:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit form');
      setIsSubmitting(false);
    }
    // Note: Don't setIsSubmitting(false) on success - we're redirecting
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Fallback success state (only shown if redirect fails)
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-white dark:bg-card rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-muted-foreground mb-6">
            We&apos;ve received your request. {hasCustomPreparer ? preparerName : 'A tax professional'} will contact you within 24 hours.
          </p>
          <Button
            onClick={() => router.push(`/${locale}/book?ref=${refCode || preparer.trackingCode}`)}
            className="bg-green-500 hover:bg-green-600"
          >
            Book an Appointment
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Suspense fallback={null}>
        <ShortLinkTracker />
      </Suspense>

      {/* Tax Genius Pro Logo */}
      <header className="py-6 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center">
            <Image
              src="/images/logo-light-theme.png"
              alt="Tax Genius Pro"
              width={200}
              height={55}
              className="dark:hidden h-auto"
              priority
            />
            <Image
              src="/images/logo-dark-theme.png"
              alt="Tax Genius Pro"
              width={200}
              height={55}
              className="hidden dark:block h-auto"
              priority
            />
          </div>
        </div>
      </header>

      {/* HERO - BIG $7,000 CALL TO ACTION */}
      <section className="relative pt-4 pb-8 overflow-hidden">
        {/* Animated background */}
        <motion.div
          style={{ y: heroY }}
          className="absolute inset-0 bg-gradient-to-b from-green-500/10 via-primary/5 to-background -z-10"
        />

        {/* Pulsing glow behind amount */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/20 rounded-full blur-[100px] -z-10 animate-pulse" />

        <div className="container mx-auto px-4 max-w-4xl text-center">
          {/* Urgency badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold shadow-lg shadow-green-500/30 mb-6">
              <Zap className="w-4 h-4" />
              LIMITED TIME - PRESEASON 2026
              <Zap className="w-4 h-4" />
            </span>
          </motion.div>

          {/* Main headline - THE STAR */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-foreground mb-2">
              Get Up To
            </h1>
            <div className="relative inline-block">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-7xl sm:text-8xl lg:text-[12rem] font-black text-green-500 leading-none"
              >
                $7,000
              </motion.span>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="absolute -top-2 -right-4 sm:-right-8 bg-yellow-400 text-yellow-900 text-xs sm:text-sm font-bold px-2 py-1 rounded-full rotate-12"
              >
                TAX ADVANCE*
              </motion.div>
            </div>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-xl sm:text-2xl text-muted-foreground mb-6 max-w-2xl mx-auto"
          >
            {isAvailableNow() ? (
              <><span className="text-foreground font-semibold">Available Now!</span> • Fast approval* • File in-person or remotely</>
            ) : (
              <>Available starting <span className="text-foreground font-semibold">January 2</span> • Fast approval* • File in-person or remotely</>
            )}
          </motion.p>

          {/* CONTACT CARD - Shows preparer if ref code, otherwise company */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="bg-white dark:bg-card border-2 border-green-500/30 rounded-2xl p-4 sm:p-5 shadow-xl max-w-md mx-auto mb-8"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 text-center">
              {hasCustomPreparer ? 'Your Personal Tax Professional' : 'Contact Us Today'}
            </p>
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {preparer.avatarUrl ? (
                  <img
                    src={preparer.avatarUrl}
                    alt={hasCustomPreparer ? preparerName : 'Tax Genius Pro'}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-green-500/30 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-green-500/30">
                    <span className="text-3xl font-bold text-primary">
                      {preparer.firstName?.[0]}{preparer.lastName?.[0]}
                    </span>
                  </div>
                )}
              </motion.div>
              <div className="flex-1 text-left">
                <p className="font-bold text-xl sm:text-2xl text-foreground mb-0.5">
                  {hasCustomPreparer ? preparerName : 'Tax Genius Pro'}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {hasCustomPreparer ? 'Licensed Tax Professional' : 'Professional Tax Services'}
                </p>
                {preparer.phone && (
                  <motion.a
                    href={`tel:${cleanPhone}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-shadow"
                  >
                    <Phone className="w-4 h-4" />
                    {preparer.phone}
                  </motion.a>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FORM SECTION */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4 max-w-md">
          {/* Mode Toggle */}
          <div className="flex bg-muted/50 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('advance')}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all ${
                mode === 'advance'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              I want an advance
            </button>
            <button
              type="button"
              onClick={() => setMode('filing')}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all ${
                mode === 'filing'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Just file my taxes
            </button>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-card border rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-center">
              <h2 className="text-xl font-bold text-white">
                {mode === 'advance' ? 'Get Your Cash Advance' : 'Start Your Tax Filing'}
              </h2>
              <p className="text-green-100 text-sm">
                {mode === 'advance' ? "We'll contact you same day" : 'Complete your intake to get started'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium">First Name *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="John"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm font-medium">Last Name *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Smith"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('phone')}
                  required
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('email')}
                  placeholder="john@email.com"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="zipCode" className="text-sm font-medium">Zip Code *</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    required
                    placeholder="30301"
                    maxLength={5}
                    pattern="[0-9]{5}"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="preferredFiling" className="text-sm font-medium">Filing Preference</Label>
                  <select
                    id="preferredFiling"
                    name="preferredFiling"
                    value={formData.preferredFiling}
                    onChange={handleInputChange}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="in-person">In-Person</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="consent"
                  name="consent"
                  checked={formData.consent}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, consent: checked as boolean }))
                  }
                  className="mt-0.5"
                />
                <Label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  I agree to be contacted by Tax Genius Pro via phone, text, or email regarding my tax inquiry.
                </Label>
              </div>

              {submitError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {submitError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-12 rounded-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'Submitting...'
                ) : mode === 'advance' ? (
                  <>
                    CHECK MY ELIGIBILITY
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    START MY TAX FILING
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Secure & Confidential
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* WHAT HAPPENS NEXT */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <h3 className="text-xl sm:text-2xl font-bold text-center mb-8">What Happens Next</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { step: 1, text: 'We call or text same day' },
              { step: 2, text: 'Confirm your documents' },
              { step: 3, text: 'Prepare & e-file' },
              { step: 4, text: 'Get your money' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                  {item.step}
                </div>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <h3 className="text-xl sm:text-2xl font-bold text-center mb-8">Common Questions</h3>
          <div className="space-y-4">
            {[
              {
                q: 'Do I have to get an advance?',
                a: 'No. You can file with Tax Genius Pro with or without an advance.',
              },
              {
                q: 'How does the $7,000 advance work?',
                a: 'If approved, you receive a portion of your expected refund early. When your IRS refund arrives, it repays the advance automatically.',
              },
              {
                q: 'When can I get it?',
                a: 'Funds available starting January 2. Most clients receive same-day or next business day.',
              },
              {
                q: 'What do I need?',
                a: 'W-2s/1099s, valid ID, Social Security card, and bank account info.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white dark:bg-card p-4 rounded-lg border">
                <p className="font-semibold mb-1">{faq.q}</p>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-6 border-t">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <p className="text-xs text-muted-foreground mb-4">
            *Advance amounts based on eligibility, IRS acceptance, and bank approval. Not all applicants qualify for the maximum amount. Funding timing varies by bank. 0% APR and $0 loan fees. Tax preparation fees apply.
          </p>
          <p className="text-xs text-muted-foreground">
            © 2025 Tax Genius Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function TaxSeasonPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <TaxSeasonPageContent />
    </Suspense>
  );
}
