'use client';

/**
 * Client Referral Landing Page
 *
 * URL format: /new/?tp={preparerCode}&cl={clientName}&co={referralCode}
 *
 * This page:
 * 1. Parses the referral parameters
 * 2. Shows a personalized welcome message with preparer photo
 * 3. Tracks the referral click
 * 4. Redirects to the intake form with attribution
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Gift, Users, FileText, Loader2, Phone, Mail } from 'lucide-react';
import Image from 'next/image';

interface PreparerInfo {
  name: string;
  firstName: string | null;
  avatarUrl: string | null;
  phone: string | null;
}

export default function ClientReferralLandingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [preparerInfo, setPreparerInfo] = useState<PreparerInfo | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [preparerCode, setPreparerCode] = useState<string | null>(null);

  useEffect(() => {
    const tp = searchParams.get('tp'); // Preparer tracking code
    const cl = searchParams.get('cl'); // Client name who referred
    const co = searchParams.get('co'); // Referral code

    setPreparerCode(tp);
    setClientName(cl ? decodeURIComponent(cl) : null);
    setReferralCode(co);

    // Track the click
    if (co) {
      fetch('/api/referral-tracking/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: co }),
      }).catch(() => {
        // Silent fail - tracking is non-critical
      });
    }

    // Resolve preparer info from code
    if (tp) {
      fetch(`/api/referrals/resolve?username=${tp}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.referralSource) {
            setPreparerInfo({
              name: data.referralSource.name,
              firstName: data.referralSource.firstName,
              avatarUrl: data.referralSource.avatarUrl,
              phone: data.referralSource.phone,
            });
          }
        })
        .catch(() => {
          // Use code as fallback
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [searchParams]);

  const handleGetStarted = () => {
    // Build intake form URL with tracking
    const params = new URLSearchParams();
    if (preparerCode) {
      params.set('ref', preparerCode);
    }
    if (referralCode) {
      params.set('clientRef', referralCode);
    }

    router.push(`/start-filing/form?${params.toString()}`);
  };

  // Format phone number for display
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-secondary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-secondary text-white py-4">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <Image
            src="/images/tax-genius-logo.png"
            alt="Tax Genius Pro"
            width={150}
            height={50}
            className="h-10 w-auto"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Welcome Card */}
        <Card className="mb-8 border-secondary/20 shadow-lg">
          <CardHeader className="text-center bg-secondary/5 rounded-t-lg">
            <div className="flex justify-center mb-4">
              <Gift className="h-16 w-16 text-secondary" />
            </div>
            <CardTitle className="text-3xl text-secondary">
              Welcome to Tax Genius!
            </CardTitle>
            <CardDescription className="text-lg">
              {clientName ? (
                <>
                  <span className="font-semibold text-foreground">{clientName}</span> thinks
                  you&apos;d love our tax services!
                </>
              ) : (
                <>You&apos;ve been referred by a happy Tax Genius client!</>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Preparer Card with Photo */}
            {preparerInfo && (
              <div className="mb-8 p-6 bg-muted rounded-xl">
                <p className="text-sm text-muted-foreground text-center mb-4">Your Tax Expert</p>
                <div className="flex flex-col items-center">
                  {/* Preparer Photo */}
                  {preparerInfo.avatarUrl ? (
                    <div className="relative w-32 h-32 mb-4 rounded-full overflow-hidden border-4 border-secondary shadow-lg">
                      <Image
                        src={preparerInfo.avatarUrl}
                        alt={preparerInfo.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 mb-4 rounded-full bg-secondary/20 flex items-center justify-center border-4 border-secondary">
                      <span className="text-4xl font-bold text-secondary">
                        {preparerInfo.firstName?.charAt(0) || 'T'}
                      </span>
                    </div>
                  )}

                  {/* Preparer Name */}
                  <h2 className="text-2xl font-bold text-foreground mb-2">{preparerInfo.name}</h2>

                  {/* Preparer Contact Info */}
                  {preparerInfo.phone && (
                    <a
                      href={`tel:${preparerInfo.phone.replace(/\D/g, '')}`}
                      className="flex items-center gap-2 text-secondary hover:underline mt-2"
                    >
                      <Phone className="h-5 w-5" />
                      <span className="text-lg font-medium">{formatPhone(preparerInfo.phone)}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Fast & Easy Filing</h3>
                  <p className="text-sm text-muted-foreground">
                    Our simple intake process takes just minutes to complete.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Expert Tax Preparers</h3>
                  <p className="text-sm text-muted-foreground">
                    Work with licensed professionals who maximize your refund.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <Gift className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Referral Rewards</h3>
                  <p className="text-sm text-muted-foreground">
                    After filing, you can earn money by referring your friends too!
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-white px-8 py-6 text-lg"
                onClick={handleGetStarted}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="text-sm text-muted-foreground mt-4">
                Free quote • No obligation • Fast refunds
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <p className="text-3xl font-bold text-secondary">10K+</p>
            <p className="text-sm text-muted-foreground">Satisfied Clients</p>
          </div>
          <div className="p-4">
            <p className="text-3xl font-bold text-secondary">$50M+</p>
            <p className="text-sm text-muted-foreground">Refunds Delivered</p>
          </div>
          <div className="p-4">
            <p className="text-3xl font-bold text-secondary">4.9★</p>
            <p className="text-sm text-muted-foreground">Client Rating</p>
          </div>
        </div>

        {/* Footer - Now shows preparer contact instead of company */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          {preparerInfo?.phone ? (
            <p>
              Questions? Call {preparerInfo.firstName || preparerInfo.name} at{' '}
              <a href={`tel:${preparerInfo.phone.replace(/\D/g, '')}`} className="text-secondary hover:underline">
                {formatPhone(preparerInfo.phone)}
              </a>
            </p>
          ) : (
            <p>Questions? Call us at <a href="tel:+14046271015" className="text-secondary hover:underline">+1 404-627-1015</a></p>
          )}
          <p className="mt-2">© 2025 TaxGeniusPro. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
