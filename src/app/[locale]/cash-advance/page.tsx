'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Phone, DollarSign, FileText, Clock, CreditCard, ArrowRight, Zap } from 'lucide-react';
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

function CashAdvancePageContent() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams?.get('ref');
  const formRef = useRef<HTMLDivElement>(null);

  // Parallax scroll effect
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 100]);

  const [preparer, setPreparer] = useState<PreparerInfo>(DEFAULT_PREPARER);
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

  const preparerName = `${preparer.firstName} ${preparer.lastName}`;
  const cleanPhone = preparer.phone?.replace(/[^+\d]/g, '') || '';

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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
        body: JSON.stringify({ ...formData, locale, ref: refCode || preparer.trackingCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit form');

      const thankYouUrl = refCode
        ? `/${locale}/cash-advance/thank-you?ref=${refCode}`
        : `/${locale}/cash-advance/thank-you?ref=${preparer.trackingCode}`;
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
              LIMITED TIME - PRESEASON 2025
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
            Available starting <span className="text-foreground font-semibold">January 2</span> • Fast approval* • File in-person or remotely
          </motion.p>

          {/* CONTACT CARD - Shows preparer if ref code, otherwise company */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="bg-white dark:bg-card border-2 border-green-500/30 rounded-2xl p-4 sm:p-5 shadow-xl max-w-md mx-auto mb-8"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 text-center">
              {refCode ? 'Your Personal Tax Professional' : 'Contact Us Today'}
            </p>
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {preparer.avatarUrl ? (
                  <img
                    src={preparer.avatarUrl}
                    alt={refCode ? preparerName : 'Tax Genius Pro'}
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
                  {refCode ? preparerName : 'Tax Genius Pro'}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {refCode ? 'Licensed Tax Professional' : 'Professional Tax Services'}
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

          {/* KEY BENEFITS - Quick scan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-4 mb-8"
          >
            {[
              { icon: CreditCard, text: 'No Credit Check' },
              { icon: Clock, text: 'Same-Day Funding*' },
              { icon: CheckCircle, text: '0% APR' },
            ].map((item, i) => (
              <div
                key={item.text}
                className="flex items-center gap-2 bg-white dark:bg-card px-4 py-2 rounded-full shadow-md border"
              >
                <item.icon className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-sm">{item.text}</span>
              </div>
            ))}
          </motion.div>

          {/* BIG CTA BUTTON */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mb-8"
          >
            <Button
              onClick={scrollToForm}
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white text-xl sm:text-2xl font-bold px-10 sm:px-16 py-7 sm:py-8 rounded-full shadow-2xl shadow-green-500/40 hover:shadow-green-500/60 transition-all hover:scale-105"
            >
              CHECK MY ELIGIBILITY
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          </motion.div>

          {/* Trust indicator */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-sm text-muted-foreground"
          >
            🔒 Secure & Confidential • Takes only 60 seconds
          </motion.p>
        </div>
      </section>

      {/* LEAD CAPTURE FORM - The money maker */}
      <section ref={formRef} className="py-12 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="shadow-2xl border-2 border-green-500/30 overflow-hidden">
              {/* Form header */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  Get Your Cash Advance
                </h2>
                <p className="text-green-100">
                  Fill out the form • We call you same day
                </p>
              </div>

              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="firstName" className="text-base font-semibold">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      placeholder="Your first name"
                      className="mt-1.5 h-12 text-lg"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-base font-semibold">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="(555) 123-4567"
                      className="mt-1.5 h-12 text-lg"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-base font-semibold">Email (Recommended)</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@email.com"
                      className="mt-1.5 h-12 text-lg"
                    />
                  </div>

                  <div>
                    <Label htmlFor="zipCode" className="text-base font-semibold">Zip Code *</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      placeholder="30315"
                      maxLength={5}
                      pattern="[0-9]{5}"
                      className="mt-1.5 h-12 text-lg"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold mb-3 block">Preferred Filing</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer bg-muted/50 px-4 py-3 rounded-lg flex-1 hover:bg-muted transition-colors">
                        <input
                          type="radio"
                          name="preferredFiling"
                          value="in-person"
                          checked={formData.preferredFiling === 'in-person'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-green-500"
                        />
                        <span className="font-medium">In-Person</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-muted/50 px-4 py-3 rounded-lg flex-1 hover:bg-muted transition-colors">
                        <input
                          type="radio"
                          name="preferredFiling"
                          value="remote"
                          checked={formData.preferredFiling === 'remote'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-green-500"
                        />
                        <span className="font-medium">Remote</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-semibold mb-3 block">Best Time to Contact</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['morning', 'afternoon', 'evening', 'anytime'].map((time) => (
                        <label
                          key={time}
                          className="flex items-center gap-2 cursor-pointer bg-muted/50 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <input
                            type="radio"
                            name="bestTimeToContact"
                            value={time}
                            checked={formData.bestTimeToContact === time}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-green-500"
                          />
                          <span className="font-medium capitalize">{time}</span>
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
                      className="mt-1"
                    />
                    <Label htmlFor="consent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to be contacted by Tax Genius Pro via phone, text, or email regarding my tax advance inquiry.
                    </Label>
                  </div>

                  {submitError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm font-medium">
                      {submitError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-green-500 hover:bg-green-600 text-white text-xl font-bold h-16 rounded-xl shadow-lg hover:shadow-xl transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        Submitting...
                      </motion.span>
                    ) : (
                      <>
                        GET MY CASH ADVANCE
                        <ArrowRight className="w-6 h-6 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    🔒 Your information is secure and will never be shared
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* NEXT STEPS - Quick info */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold text-center mb-10"
          >
            What Happens Next
          </motion.h2>
          <div className="space-y-4">
            {[
              { step: 1, icon: Phone, text: 'We call or text you the same day' },
              { step: 2, icon: FileText, text: 'We confirm your documents (W-2, ID, etc.)' },
              { step: 3, icon: CheckCircle, text: 'We prepare & e-file your return' },
              { step: 4, icon: DollarSign, text: 'If approved, receive your advance!' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center gap-4 bg-white dark:bg-card p-5 rounded-xl border shadow-sm"
              >
                <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {item.step}
                </div>
                <p className="text-foreground font-medium text-lg">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold text-center mb-10"
          >
            What Clients Say
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: "I had the money on my card by the time I got home. So easy!", name: "Donna" },
              { quote: "Fast and simple. Love that there are no fees.", name: "Marcus T." },
              { quote: "Got a jumpstart on the new year. Paid my bills early!", name: "Vernisha A." },
            ].map((t, index) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white dark:bg-card p-6 rounded-xl border shadow-sm"
              >
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-yellow-500">⭐</span>
                  ))}
                </div>
                <p className="text-muted-foreground italic mb-4">"{t.quote}"</p>
                <p className="font-semibold text-foreground">— {t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold text-center mb-10"
          >
            Frequently Asked Questions
          </motion.h2>
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
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="bg-white dark:bg-card p-5 rounded-xl border shadow-sm"
              >
                <p className="font-semibold mb-2 text-lg">{faq.q}</p>
                <p className="text-muted-foreground">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-12 bg-green-500">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Get Your Advance?
            </h2>
            <p className="text-green-100 mb-8 text-lg">
              Don't wait weeks for your refund. Get cash in hand now.
            </p>
            <Button
              onClick={scrollToForm}
              size="lg"
              className="bg-white text-green-600 hover:bg-green-50 text-xl font-bold px-12 py-7 rounded-full shadow-xl"
            >
              CHECK MY ELIGIBILITY NOW
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          </motion.div>
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
