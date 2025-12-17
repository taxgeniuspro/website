'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle,
  Calendar,
  Upload,
  Phone,
  Mail,
  Clock,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { logger } from '@/lib/logger';

interface PreparerInfo {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  trackingCode: string;
}

function ThankYouContent() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const refCode = searchParams?.get('ref');

  const [preparer, setPreparer] = useState<PreparerInfo | null>(null);

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
  const defaultPhone = '+14046271015';
  const contactPhone = preparer?.phone || defaultPhone;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Success Message */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-14 h-14 text-success" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                You're In!
              </h1>
              <p className="text-xl text-muted-foreground">
                We'll contact you shortly to discuss your preseason tax advance.
              </p>
            </motion.div>

            {/* Preparer Card */}
            {preparer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-8"
              >
                <Card className="border-2 border-primary/20">
                  <CardContent className="p-6">
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
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Your Tax Professional</p>
                        <p className="font-bold text-xl text-foreground mb-2">{preparerName}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Will contact you within the same day
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* What Happens Next */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8"
            >
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-bold text-lg mb-4">What Happens Next</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-bold text-primary">1</span>
                      </div>
                      <div>
                        <p className="font-medium">We'll call or text you</p>
                        <p className="text-sm text-muted-foreground">
                          {preparer ? preparerName : 'A tax professional'} will reach out within the same day to discuss your advance.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-bold text-primary">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Gather your documents</p>
                        <p className="text-sm text-muted-foreground">
                          Have your W-2s, ID, and Social Security card ready for your appointment.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-bold text-success">3</span>
                      </div>
                      <div>
                        <p className="font-medium">Get your money</p>
                        <p className="text-sm text-muted-foreground">
                          File your taxes and receive your advance as soon as funds are available (starting Jan 2).
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-4"
            >
              <h2 className="font-bold text-lg text-center mb-4">Ready to Get Started?</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Book Appointment */}
                <Button
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90"
                  asChild
                >
                  <Link href={preparer?.trackingCode ? `/go/${preparer.trackingCode}-appt` : `/${locale}/book`}>
                    <Calendar className="w-5 h-5 mr-2" />
                    Book Appointment
                  </Link>
                </Button>

                {/* Call/Text */}
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <a href={`tel:${contactPhone.replace(/[^+\d]/g, '')}`}>
                    <Phone className="w-5 h-5 mr-2" />
                    Call {preparer ? preparer.firstName : 'Us'} Now
                  </a>
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Text Message */}
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <a href={`sms:${contactPhone.replace(/[^+\d]/g, '')}`}>
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Text Us
                  </a>
                </Button>

                {/* Email */}
                {preparer?.email ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <a href={`mailto:${preparer.email}`}>
                      <Mail className="w-5 h-5 mr-2" />
                      Email {preparer.firstName}
                    </a>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <Link href={`/${locale}/contact`}>
                      <Mail className="w-5 h-5 mr-2" />
                      Contact Us
                    </Link>
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Documents Checklist */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-10"
            >
              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <h3 className="font-bold mb-4">Documents You'll Need</h3>
                  <ul className="space-y-2">
                    {[
                      'W-2 forms from all employers',
                      'Government-issued photo ID',
                      'Social Security card (you and dependents)',
                      '1099 forms (if applicable)',
                      'Last year\'s tax return (if available)',
                      'Bank account info for direct deposit',
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Back to Home */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-center mt-8"
            >
              <Link
                href={`/${locale}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                Return to Home
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ThankYouContent />
    </Suspense>
  );
}
