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
import { CheckCircle, Phone, DollarSign, FileText, Clock, CreditCard } from 'lucide-react';
import { ShortLinkTracker } from '@/components/tracking/ShortLinkTracker';
import { logger } from '@/lib/logger';

// Default to Ray Hamilton when no ref code
const DEFAULT_PREPARER = {
  firstName: 'Ray',
  lastName: 'Hamilton',
  phone: '1 (404) 396-9512',
  email: 'rhamiltonfirm@gmail.com',
  avatarUrl: 'https://res.cloudinary.com/dhktmiigh/image/upload/v1765487894/taxgeniuspro/preparers/preparer_rh.jpg',
  trackingCode: 'rh',
};

interface PreparerInfo {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  trackingCode: string;
}

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

function CashAdvancePageContent() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams?.get('ref');
  const heroRef = useRef<HTMLDivElement>(null);

  // Parallax scroll effect
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.3]);

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

      {/* HERO + FORM - Above the fold with parallax */}
      <section ref={heroRef} className="relative py-8 lg:py-16 overflow-hidden">
        {/* Animated background gradient */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background -z-10"
        />

        {/* Floating decorative elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 left-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl -z-10"
        />

        <div className="container mx-auto px-4 max-w-6xl">

          {/* Tax Preparer Card - Always visible at top */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={scaleIn}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="bg-white dark:bg-card border-2 border-primary/20 rounded-2xl p-5 shadow-xl max-w-md mx-auto lg:mx-0">
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {preparer.avatarUrl ? (
                    <img
                      src={preparer.avatarUrl}
                      alt={preparerName}
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary/30 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/30">
                      <span className="text-3xl font-bold text-primary">
                        {preparer.firstName?.[0]}{preparer.lastName?.[0]}
                      </span>
                    </div>
                  )}
                </motion.div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Tax Professional</p>
                  <p className="font-bold text-2xl text-foreground">{preparerName}</p>
                  {preparer.phone && (
                    <motion.a
                      href={`tel:${cleanPhone}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Phone className="w-4 h-4" />
                      {preparer.phone}
                    </motion.a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">

            {/* LEFT: Headline + Benefits */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              <motion.div variants={fadeInUp} transition={{ duration: 0.6 }}>
                <span className="inline-block px-4 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium mb-4">
                  💰 Preseason 2025 Offer
                </span>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl lg:text-6xl font-bold text-foreground mb-4 leading-tight"
              >
                Get Up to{' '}
                <span className="text-primary relative">
                  $7,000
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="absolute bottom-1 left-0 h-3 bg-primary/20 -z-10"
                  />
                </span>
                <br />
                Tax Advance*
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg lg:text-xl text-muted-foreground mb-8"
              >
                Available starting January 2 • Fast approval* • File in-person or remotely
              </motion.p>

              {/* Benefits - checkmarks with stagger */}
              <motion.div
                variants={staggerContainer}
                className="space-y-4 mb-8"
              >
                {[
                  { icon: CreditCard, text: 'No credit check' },
                  { icon: Clock, text: 'Same-day or next-day funding*' },
                  { icon: FileText, text: 'File in person or remotely' },
                  { icon: CheckCircle, text: 'Trusted Tax Professionals' },
                ].map((benefit, index) => (
                  <motion.div
                    key={benefit.text}
                    variants={fadeInUp}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-3 justify-center lg:justify-start"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-foreground font-medium">{benefit.text}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Trust badges */}
              <motion.div
                variants={fadeIn}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm text-muted-foreground"
              >
                <span className="flex items-center gap-1">🔒 Secure</span>
                <span className="flex items-center gap-1">⭐ Trusted Tax Pros</span>
                <span className="flex items-center gap-1">📍 Atlanta + Remote</span>
              </motion.div>
            </motion.div>

            {/* RIGHT: Lead Capture Form */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={scaleIn}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="shadow-2xl border-2 border-primary/20 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
                  <h2 className="text-xl font-bold text-center text-primary-foreground">Check Your Eligibility</h2>
                  <p className="text-sm text-primary-foreground/80 text-center">
                    We'll contact you the same day
                  </p>
                </div>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        placeholder="Your first name"
                        className="mt-1 h-12"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        placeholder="(555) 123-4567"
                        className="mt-1 h-12"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Label htmlFor="email">Email (Recommended)</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="you@email.com"
                        className="mt-1 h-12"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
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
                        className="mt-1 h-12"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <Label className="mb-2 block text-sm">Preferred Filing</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="preferredFiling"
                            value="in-person"
                            checked={formData.preferredFiling === 'in-person'}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-primary"
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
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm">Remote</span>
                        </label>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 }}
                    >
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
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm capitalize">{time}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.0 }}
                      className="flex items-start gap-3 pt-2"
                    >
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
                    </motion.div>

                    {submitError && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm"
                      >
                        {submitError}
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 }}
                    >
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-primary hover:bg-primary/90 text-lg font-semibold h-14 shadow-lg hover:shadow-xl transition-all"
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
                          'Submit & Get Contacted'
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* NEXT STEPS Section with parallax */}
      <section className="py-16 bg-muted/30 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
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
                { step: 4, icon: DollarSign, text: 'If approved, receive your advance' },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="flex items-center gap-4 bg-background p-5 rounded-xl border-2 border-transparent hover:border-primary/20 shadow-sm hover:shadow-md transition-all cursor-default"
                >
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md">
                    {item.step}
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-foreground font-medium text-lg">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* TESTIMONIALS with stagger animation */}
      <section className="py-16">
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
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: -5 }}
                className="bg-muted/30 p-6 rounded-xl border shadow-sm hover:shadow-lg transition-all"
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

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
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
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ scale: 1.01 }}
                className="bg-background p-5 rounded-xl border shadow-sm hover:shadow-md transition-all"
              >
                <p className="font-semibold mb-2 text-lg">{faq.q}</p>
                <p className="text-muted-foreground">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LEGAL DISCLAIMER */}
      <section className="py-8 border-t">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-xs text-muted-foreground text-center"
          >
            *Advance amounts based on eligibility, IRS acceptance, and bank approval. Not all applicants qualify for the maximum amount. Funding timing varies by bank. 0% APR and $0 loan fees. Tax preparation fees apply.
          </motion.p>
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
