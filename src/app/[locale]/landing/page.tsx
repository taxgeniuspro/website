'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Phone, Clock, CreditCard, ArrowRight, Zap, Lock } from 'lucide-react';
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

function LandingPageContent() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams?.get('ref');

  const [preparer, setPreparer] = useState<PreparerInfo>(DEFAULT_PREPARER);
  const [hasCustomPreparer, setHasCustomPreparer] = useState(false);
  const [mode, setMode] = useState<FormMode>('advance');
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

  // Fetch preparer info on mount
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
          setPreparer({ ...data.preparer, trackingCode: data.preparer.trackingCode || code || 'ow' });
          setHasCustomPreparer(!!code && data.preparer.trackingCode !== 'ow');
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
      if (mode === 'advance') {
        // Submit to cash advance API
        const response = await fetch('/api/cash-advance/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName,
            phone: formData.phone,
            email: formData.email,
            zipCode: formData.zipCode,
            preferredFiling: formData.preferredFiling,
            bestTimeToContact: 'anytime',
            consent: formData.consent,
            locale,
            ref: refCode || preparer.trackingCode,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to submit form');

        setSubmitSuccess(true);
      } else {
        // Submit to tax intake lead API then redirect
        const response = await fetch('/api/tax-intake/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            email: formData.email,
            zip_code: formData.zipCode,
            filing_preference: formData.preferredFiling,
            tax_year: new Date().getFullYear(),
            ref: refCode || preparer.trackingCode,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to submit form');

        // Redirect to full intake form
        const intakeUrl = refCode
          ? `/${locale}/start-filing/form?ref=${refCode}`
          : `/${locale}/start-filing/form?ref=${preparer.trackingCode}`;
        router.push(intakeUrl);
      }
    } catch (error) {
      logger.error('Error submitting form:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Success state for advance mode
  if (submitSuccess && mode === 'advance') {
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
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <ShortLinkTracker />
      </Suspense>

      {/* Header */}
      <header className="py-4 px-4 border-b">
        <div className="container mx-auto max-w-4xl flex justify-between items-center">
          <Image
            src="/images/logo-light-theme.png"
            alt="Tax Genius Pro"
            width={160}
            height={44}
            className="dark:hidden h-10 w-auto"
            priority
          />
          <Image
            src="/images/logo-dark-theme.png"
            alt="Tax Genius Pro"
            width={160}
            height={44}
            className="hidden dark:block h-10 w-auto"
            priority
          />
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>IRS Authorized</span>
            <span>•</span>
            <span>BBB A+</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <section className="text-center mb-8">
          {/* Preseason Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold shadow-lg shadow-green-500/30 mb-6">
            <Zap className="w-4 h-4" />
            PRESEASON 2025
            <Zap className="w-4 h-4" />
          </span>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-foreground mb-4 leading-tight">
            Need cash now — or just want your taxes{' '}
            <span className="text-green-500">done right?</span>
          </h1>

          {/* Subheadline with blinking text */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
            File in-person or remotely.{' '}
            <span className="text-green-500 font-bold text-xl sm:text-2xl animate-pulse">
              Get up to $7,000 advance*
            </span>{' '}
            — or just professional filing. Your choice.
          </p>

          {/* Trust Items */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { icon: CreditCard, text: 'No Credit Check*' },
              { icon: Clock, text: 'Same-Day Funding*' },
              { icon: CheckCircle, text: '0% APR' },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-2 bg-white dark:bg-card px-4 py-2 rounded-full shadow-md border text-sm font-semibold"
              >
                <item.icon className="w-5 h-5 text-green-500" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Preparer Card */}
          <div className="bg-white dark:bg-card border-2 border-green-500/30 rounded-2xl p-4 shadow-xl max-w-md mx-auto mb-8">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 text-center">
              {hasCustomPreparer ? 'Your Personal Tax Professional' : 'Contact Us Today'}
            </p>
            <div className="flex items-center gap-4">
              {preparer.avatarUrl ? (
                <img
                  src={preparer.avatarUrl}
                  alt={hasCustomPreparer ? preparerName : 'Tax Genius Pro'}
                  className="w-20 h-20 rounded-full object-cover border-4 border-green-500/30 shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-4 border-green-500/30">
                  <span className="text-2xl font-bold text-primary">
                    {preparer.firstName?.[0]}{preparer.lastName?.[0]}
                  </span>
                </div>
              )}
              <div className="flex-1 text-left">
                <p className="font-bold text-xl text-foreground mb-0.5">
                  {hasCustomPreparer ? preparerName : 'Tax Genius Pro'}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {hasCustomPreparer ? 'Licensed Tax Professional' : 'Professional Tax Services'}
                </p>
                {preparer.phone && (
                  <a
                    href={`tel:${cleanPhone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold shadow-md hover:bg-green-600 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {preparer.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-muted/50 rounded-lg p-1 max-w-md mx-auto mb-6">
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
          <div className="bg-white dark:bg-card border rounded-xl shadow-lg max-w-md mx-auto overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-center">
              <h2 className="text-xl font-bold text-white">
                {mode === 'advance' ? 'Get Your Cash Advance' : 'Start Your Tax Filing'}
              </h2>
              <p className="text-green-100 text-sm">
                {mode === 'advance' ? 'We\'ll contact you same day' : 'Complete your intake to get started'}
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
        </section>

        {/* Steps Section */}
        <section className="py-8">
          <h3 className="text-xl sm:text-2xl font-bold text-center mb-6">What Happens Next</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { step: 1, text: 'We call or text same day' },
              { step: 2, text: 'Confirm your documents' },
              { step: 3, text: 'Prepare & e-file' },
              { step: 4, text: 'Get your money' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-2">
                  {item.step}
                </div>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-8">
          <h3 className="text-xl sm:text-2xl font-bold text-center mb-6">Common Questions</h3>
          <div className="space-y-4 max-w-2xl mx-auto">
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
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t">
        <div className="container mx-auto max-w-4xl px-4 text-center">
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

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LandingPageContent />
    </Suspense>
  );
}
