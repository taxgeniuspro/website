'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DollarSign,
  Clock,
  CheckCircle,
  ArrowRight,
  Shield,
  Phone,
  Zap,
  Star,
  Calendar,
  MapPin,
  Users,
  FileText,
  MessageCircle,
  Mail,
} from 'lucide-react';
import Image from 'next/image';
import { Header } from '@/components/header';
import { ShortLinkTracker } from '@/components/tracking/ShortLinkTracker';
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

  // Fetch preparer info if ref code is present
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
          setPreparer({
            ...data.preparer,
            trackingCode: data.preparer.trackingCode || code,
          });
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
        body: JSON.stringify({
          ...formData,
          locale,
          ref: refCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      // Redirect to thank you page with ref code preserved
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
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Track short link clicks */}
      <Suspense fallback={null}>
        <ShortLinkTracker />
      </Suspense>

      <Header />

      {/* Hero Section with Form */}
      <section className="relative py-12 lg:py-20 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Mobile-first: Preparer card at top on mobile */}
            {preparer && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:hidden mb-8"
              >
                <div className="bg-white dark:bg-card border border-primary/20 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-4">
                    {preparer.avatarUrl ? (
                      <img
                        src={preparer.avatarUrl}
                        alt={preparerName || 'Tax Preparer'}
                        className="w-16 h-16 rounded-full object-cover border-3 border-primary/30 shadow-md"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-3 border-primary/30">
                        <span className="text-xl font-bold text-primary">
                          {preparer.firstName?.[0]}{preparer.lastName?.[0]}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Your Tax Pro</p>
                      <p className="font-bold text-lg text-foreground">{preparerName}</p>
                      <div className="flex gap-2 mt-2">
                        {preparer.phone && (
                          <a
                            href={`tel:${preparer.phone.replace(/[^+\d]/g, '')}`}
                            className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium"
                          >
                            <Phone className="w-3 h-3" />
                            Call
                          </a>
                        )}
                        {preparer.email && (
                          <a
                            href={`mailto:${preparer.email}`}
                            className="flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium"
                          >
                            <Mail className="w-3 h-3" />
                            Email
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
              {/* Left: Hero Content */}
              <div className="text-center lg:text-left">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Badge className="mb-4 bg-success/10 text-success border-success/20 text-sm px-4 py-1.5">
                    <Calendar className="w-4 h-4 mr-2" />
                    Preseason Offer - Funds Available Jan 2
                  </Badge>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4"
                >
                  Get Up to{' '}
                  <span className="text-primary">$7,000</span>
                  <br />
                  <span className="text-3xl lg:text-4xl xl:text-5xl">Preseason</span> Tax Advance*
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg lg:text-xl text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0"
                >
                  Don't wait weeks for your refund — get cash in hand before tax season even starts with Tax Genius Pro.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-wrap justify-center lg:justify-start gap-4 mb-8"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle className="w-5 h-5 text-success" />
                    No Credit Check
                  </span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="w-5 h-5 text-success" />
                    Same-Day Funding*
                  </span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="w-5 h-5 text-success" />
                    Trusted Tax Pros
                  </span>
                </motion.div>

                {/* Desktop: Preparer card */}
                {preparer && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="hidden lg:block"
                  >
                    <div className="bg-white dark:bg-card border border-primary/20 rounded-xl p-5 shadow-lg max-w-sm">
                      <div className="flex items-center gap-4">
                        {preparer.avatarUrl ? (
                          <img
                            src={preparer.avatarUrl}
                            alt={preparerName || 'Tax Preparer'}
                            className="w-20 h-20 rounded-full object-cover border-4 border-primary/30 shadow-md"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/30">
                            <span className="text-2xl font-bold text-primary">
                              {preparer.firstName?.[0]}{preparer.lastName?.[0]}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Your Tax Professional</p>
                          <p className="font-bold text-xl text-foreground">{preparerName}</p>
                          <div className="flex gap-2 mt-2">
                            {preparer.phone && (
                              <a
                                href={`tel:${preparer.phone.replace(/[^+\d]/g, '')}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                Call Now
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right: Lead Capture Form */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="shadow-2xl border-2 border-primary/20">
                  <CardHeader className="bg-primary/5 border-b border-primary/10">
                    <CardTitle className="text-xl lg:text-2xl text-center">
                      Check Your Eligibility
                    </CardTitle>
                    <p className="text-center text-muted-foreground text-sm">
                      Get a call back within the same day
                    </p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter your first name"
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
                        <Label className="mb-2 block">Preferred Filing Method</Label>
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
                            <span className="text-sm">Remote / Virtual</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <Label className="mb-2 block">Best Time to Contact</Label>
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
                          I agree to be contacted by Tax Genius Pro via phone, text, or email regarding my tax advance inquiry. Message & data rates may apply.
                        </Label>
                      </div>

                      {submitError && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
                          <p className="text-sm font-medium">{submitError}</p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-primary hover:bg-primary/90 text-lg font-semibold"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          'Submitting...'
                        ) : (
                          <>
                            Check My Eligibility
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-center text-muted-foreground">
                        Secure • No obligation • Free to apply
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Simple Process
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              What Happens Next
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              After you submit, here's how we get you your money fast
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                step: 1,
                icon: Phone,
                title: 'We Contact You',
                description: 'A tax professional will call or text you the same day to discuss your advance.',
                color: 'primary',
              },
              {
                step: 2,
                icon: FileText,
                title: 'Confirm Documents',
                description: 'We review what documents you need (W-2s, ID, etc.) to file your return.',
                color: 'success',
              },
              {
                step: 3,
                icon: CheckCircle,
                title: 'File & Get Approved',
                description: 'We prepare and e-file your return, then apply for your advance.',
                color: 'secondary',
              },
              {
                step: 4,
                icon: DollarSign,
                title: 'Receive Your Money',
                description: 'If approved, get same-day or next-day funding via prepaid card or direct deposit.',
                color: 'primary',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="text-center h-full hover:shadow-lg transition-all border-2 hover:border-primary/30">
                  <CardContent className="pt-8 pb-6">
                    <div className={`w-16 h-16 bg-${item.color}/10 rounded-full flex items-center justify-center mx-auto mb-4 relative`}>
                      <item.icon className={`w-8 h-8 text-${item.color}`} />
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 lg:py-20 bg-muted/50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Why Get Your Advance with Us
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Thousands trust Tax Genius Pro to get their money faster
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Shield,
                title: 'No Credit Check',
                description: 'Your credit score is not affected. Quick approval based on your expected refund.',
              },
              {
                icon: Zap,
                title: 'Same-Day Funding*',
                description: 'Get your money as fast as the same day. Next-day funding available for most banks.',
              },
              {
                icon: DollarSign,
                title: 'Up to $7,000',
                description: 'Qualify for advances up to $7,000 based on your expected tax refund amount.',
              },
              {
                icon: MapPin,
                title: 'In-Office or Remote',
                description: 'File in person at our Atlanta location or virtually from anywhere.',
              },
              {
                icon: Users,
                title: 'Trusted Tax Professionals',
                description: 'Work with licensed, experienced tax preparers who maximize your refund.',
              },
              {
                icon: CheckCircle,
                title: '100% Accuracy Guarantee',
                description: 'We guarantee your return is accurate or we pay any IRS penalties.',
              },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all">
                  <CardContent className="pt-6 pb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              What Our Clients Say
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real stories from people who got their refund advance
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                quote: "I had the Refund Advance money loaded on my card by the time I got home. I really needed the advance and Tax Genius Pro made it so easy.",
                name: "Donna",
              },
              {
                quote: "I like how fast and simple Refund Advance was. And how quickly I got money on my card. Couldn't be happier!",
                name: "Hollis",
              },
              {
                quote: "Refund Advance was easy. Love that there are no fees for it. Makes a huge difference when money is tight.",
                name: "Marcus T.",
              },
              {
                quote: "I like that with Refund Advance we are able to get some money now instead of waiting for the IRS. Perfect solution!",
                name: "Brittany B.",
              },
              {
                quote: "Refund Advance allowed me to get a jumpstart into the new year. I was able to get ahead of my bills by a couple months.",
                name: "Vernisha A.",
              },
              {
                quote: "Overall, it was very quick. I would recommend a Refund Advance. Always helps in any pinch.",
                name: "S. Bryant",
              },
            ].map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground italic mb-4 text-sm leading-relaxed">
                      "{testimonial.quote}"
                    </p>
                    <p className="font-semibold text-foreground">— {testimonial.name}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-20 bg-muted/50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about the Tax Advance
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {[
                {
                  question: "How does the $7,000 tax advance work?",
                  answer: "When you file your taxes with Tax Genius Pro, we can apply for a Refund Advance on your behalf. If approved, you receive a portion of your expected refund (up to $7,000) within hours or the next business day, instead of waiting weeks for the IRS. When your actual refund arrives, it automatically pays back the advance.",
                },
                {
                  question: "Do I have to qualify for the advance?",
                  answer: "Yes, approval is based on your expected federal tax refund amount, not your credit score. You must have enough expected refund to cover the advance amount. Our tax professionals will help determine your eligibility when you file.",
                },
                {
                  question: "When can I get the advance?",
                  answer: "Funds are available starting January 2, 2025. Once approved, most clients receive their advance the same day or next business day, depending on the bank and funding method chosen.",
                },
                {
                  question: "What documents do I need?",
                  answer: "To file and apply for an advance, you'll typically need: W-2s or 1099 forms, valid government ID, Social Security cards for you and dependents, last year's tax return (if available), and bank account info for direct deposit.",
                },
                {
                  question: "Does the advance affect my refund?",
                  answer: "The advance is essentially an early portion of your refund. When your actual IRS refund arrives, it will be used to pay back the advance. You'll receive any remaining balance after the advance is repaid.",
                },
                {
                  question: "Are there any fees or interest?",
                  answer: "The Refund Advance loan itself has 0% APR and no loan fees. Standard tax preparation fees apply for filing your return. There are no hidden charges for the advance.",
                },
              ].map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="bg-background rounded-lg border px-6">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 lg:py-20 bg-primary/5">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden">
              <CardContent className="p-8 lg:p-12">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <DollarSign className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                      Ready to Get Your Preseason Advance?
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                      Don't wait for tax season. Apply now and get up to $7,000 starting January 2.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-lg"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                      Start My Application
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-lg"
                      asChild
                    >
                      <a href={`tel:${preparer?.phone?.replace(/[^+\d]/g, '') || '+14046271015'}`}>
                        <Phone className="w-5 h-5 mr-2" />
                        Call {preparer ? preparerName : 'Us'} Now
                      </a>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-6 justify-center text-sm text-muted-foreground pt-6 border-t">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      No Credit Check
                    </span>
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-success" />
                      100% Secure
                    </span>
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-success" />
                      Same-Day Funding*
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Disclaimer */}
            <p className="text-xs text-muted-foreground text-center mt-6 max-w-2xl mx-auto leading-relaxed">
              *Advance amounts based on eligibility, IRS acceptance, and bank approval. Not all applicants qualify for the maximum amount. Funding timing varies by bank. 0% APR and $0 loan fees. Tax preparation fees apply. See tax professional for details.
            </p>
          </motion.div>
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
