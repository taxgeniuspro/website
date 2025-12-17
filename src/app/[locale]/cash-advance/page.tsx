'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Phone, Mail } from 'lucide-react';
import Image from 'next/image';
import { Header } from '@/components/header';
import { ShortLinkTracker } from '@/components/tracking/ShortLinkTracker';
import { logger } from '@/lib/logger';

interface PreparerInfo {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  trackingCode: string;
}

function CashAdvancePageContent() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams?.get('ref');

  const [preparer, setPreparer] = useState<PreparerInfo | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    phone: '',
    email: '',
    zipCode: '',
    preferredFiling: 'remote',
    bestTimeToContact: 'anytime',
    consent: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (refCode) {
      fetchPreparerInfo(refCode);
    }
  }, [refCode]);

  const fetchPreparerInfo = async (code: string) => {
    try {
      const response = await fetch(`/api/preparer/by-code?code=${encodeURIComponent(code)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.preparer) {
          setPreparer({ ...data.preparer, trackingCode: data.preparer.trackingCode || code });
        }
      }
    } catch (error) {
      logger.error('Error fetching preparer info:', error);
    }
  };

  const preparerName = preparer ? `${preparer.firstName} ${preparer.lastName}` : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) {
      setSubmitError('Please agree to be contacted to continue.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/cash-advance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, locale, ref: refCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit form');

      const thankYouUrl = refCode
        ? `/${locale}/cash-advance/thank-you?ref=${refCode}`
        : `/${locale}/cash-advance/thank-you`;
      router.push(thankYouUrl);
    } catch (error) {
      logger.error('Error submitting cash advance form:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <ShortLinkTracker />
      </Suspense>

      <Header />

      {/* HERO + FORM - Above the fold */}
      <section className="py-8 lg:py-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* Preparer Card - Shows at top when ref code present */}
          {preparer && (
            <div className="mb-6 bg-white dark:bg-card border border-primary/20 rounded-xl p-4 shadow-lg max-w-md mx-auto lg:mx-0">
              <div className="flex items-center gap-4">
                {preparer.avatarUrl ? (
                  <img
                    src={preparer.avatarUrl}
                    alt={preparerName || 'Tax Preparer'}
                    className="w-16 h-16 rounded-full object-cover border-3 border-primary/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-3 border-primary/30">
                    <span className="text-xl font-bold text-primary">
                      {preparer.firstName?.[0]}{preparer.lastName?.[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Your Tax Professional</p>
                  <p className="font-bold text-lg">{preparerName}</p>
                  <div className="flex gap-2 mt-1">
                    {preparer.phone && (
                      <a href={`tel:${preparer.phone.replace(/[^+\d]/g, '')}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    )}
                    {preparer.email && (
                      <a href={`mailto:${preparer.email}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-8 items-start">

            {/* LEFT: Headline + Benefits */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-3">
                Get Up to <span className="text-primary">$7,000</span> Tax Advance*
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Available starting January 2 • Fast approval* • File in-person or remotely
              </p>

              {/* Benefits - checkmarks */}
              <div className="space-y-3 mb-6">
                {[
                  'No credit check',
                  'Same-day or next-day funding*',
                  'File in person or remotely',
                  'Trusted Tax Professionals',
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Trust line */}
              <p className="text-sm text-muted-foreground">
                Secure • Trusted Tax Pros • Atlanta + Remote
              </p>
            </div>

            {/* RIGHT: Lead Capture Form */}
            <Card className="shadow-xl border-2 border-primary/20">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-center mb-1">Check Your Eligibility</h2>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  We'll contact you the same day
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      placeholder="Your first name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
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
                    <Label htmlFor="email">Email (Recommended)</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@email.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="zipCode">Zip Code *</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      placeholder="30315"
                      maxLength={5}
                      pattern="[0-9]{5}"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block text-sm">Preferred Filing</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="preferredFiling"
                          value="in-person"
                          checked={formData.preferredFiling === 'in-person'}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">In-Person</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="preferredFiling"
                          value="remote"
                          checked={formData.preferredFiling === 'remote'}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Remote</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block text-sm">Best Time to Contact</Label>
                    <div className="flex flex-wrap gap-3">
                      {['morning', 'afternoon', 'evening', 'anytime'].map((time) => (
                        <label key={time} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="bestTimeToContact"
                            value={time}
                            checked={formData.bestTimeToContact === time}
                            onChange={handleInputChange}
                            className="w-4 h-4"
                          />
                          <span className="text-sm capitalize">{time}</span>
                        </label>
                      ))}
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
                      I agree to be contacted by Tax Genius Pro via phone, text, or email regarding my tax advance inquiry.
                    </Label>
                  </div>

                  {submitError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                      {submitError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90 text-lg font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit & Get Contacted'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* NEXT STEPS Section */}
      <section className="py-10 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-6">What Happens Next</h2>
          <div className="space-y-4">
            {[
              { step: 1, text: 'We call or text you the same day' },
              { step: 2, text: 'We confirm your documents (W-2, ID, etc.)' },
              { step: 3, text: 'We prepare & e-file your return' },
              { step: 4, text: 'If approved, receive your advance' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4 bg-background p-4 rounded-lg border">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {item.step}
                </div>
                <p className="text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS - Short, 2-3 only */}
      <section className="py-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-6">What Clients Say</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { quote: "I had the money on my card by the time I got home. So easy!", name: "Donna" },
              { quote: "Fast and simple. Love that there are no fees.", name: "Marcus T." },
              { quote: "Got a jumpstart on the new year. Paid my bills early!", name: "Vernisha A." },
            ].map((t) => (
              <div key={t.name} className="bg-muted/30 p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground italic mb-2">"{t.quote}"</p>
                <p className="text-sm font-semibold">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section - 5 questions */}
      <section className="py-10 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'How does the $7,000 advance work?',
                a: 'When you file with us, we apply for an advance on your behalf. If approved, you receive a portion of your expected refund within hours instead of waiting weeks.',
              },
              {
                q: 'Do I have to qualify?',
                a: 'Yes, approval is based on your expected refund amount, not your credit score. Our tax pros will help determine eligibility.',
              },
              {
                q: 'When can I get it?',
                a: 'Funds are available starting January 2, 2025. Most clients receive their advance the same day or next business day.',
              },
              {
                q: 'What documents do I need?',
                a: 'W-2s or 1099s, valid ID, Social Security card, and bank account info for direct deposit.',
              },
              {
                q: 'Does it affect my refund?',
                a: 'The advance is part of your refund paid early. When your IRS refund arrives, it repays the advance automatically.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-background p-4 rounded-lg border">
                <p className="font-semibold mb-2">{faq.q}</p>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEGAL DISCLAIMER */}
      <section className="py-6 border-t">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="text-xs text-muted-foreground text-center">
            *Advance amounts based on eligibility, IRS acceptance, and bank approval. Not all applicants qualify for the maximum amount. Funding timing varies by bank. 0% APR and $0 loan fees. Tax preparation fees apply.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function CashAdvancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CashAdvancePageContent />
    </Suspense>
  );
}
