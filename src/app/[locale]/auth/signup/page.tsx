'use client';

import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { DollarSign, Shield, Award, CheckCircle, TrendingUp, Users } from 'lucide-react';
import Image from 'next/image';
import { AuthLogo } from '@/components/Logo';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

function SignUpContent() {
  const t = useTranslations('auth.signup');
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'client';

  // Role-specific content
  const roleContent = {
    client: {
      badge: t('client.badge'),
      icon: Shield,
      heading: t('client.heading'),
      subheading: t('client.subheading'),
      benefits: [
        { icon: CheckCircle, text: t('client.benefit1') },
        { icon: TrendingUp, text: t('client.benefit2') },
        { icon: Shield, text: t('client.benefit3') },
      ],
      theme: 'from-blue-50 to-blue-100 dark:bg-blue-900/20',
      accentColor: 'text-blue-600 dark:text-blue-400',
    },
    preparer: {
      badge: t('preparer.badge'),
      icon: Award,
      heading: t('preparer.heading'),
      subheading: t('preparer.subheading'),
      benefits: [
        { icon: Users, text: t('preparer.benefit1') },
        { icon: DollarSign, text: t('preparer.benefit2') },
        { icon: CheckCircle, text: t('preparer.benefit3') },
      ],
      theme: 'from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20',
      accentColor: 'text-blue-600 dark:text-blue-400',
    },
    affiliate: {
      badge: t('affiliate.badge'),
      icon: DollarSign,
      heading: t('affiliate.heading'),
      subheading: t('affiliate.subheading'),
      benefits: [
        { icon: TrendingUp, text: t('affiliate.benefit1') },
        { icon: DollarSign, text: t('affiliate.benefit2') },
        { icon: CheckCircle, text: t('affiliate.benefit3') },
      ],
      theme: 'from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-800/20',
      accentColor: 'text-yellow-600 dark:text-yellow-400',
    },
  };

  const content = roleContent[role as keyof typeof roleContent] || roleContent.client;
  const IconComponent = content.icon;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Role-specific messaging */}
      <div
        className={`relative bg-gradient-to-br ${content.theme} p-8 lg:p-16 flex flex-col justify-center`}
      >
        <div className="max-w-lg mx-auto space-y-8">
          <div>
            <Badge className="mb-4 text-base px-4 py-2">
              <IconComponent className="w-5 h-5 mr-2" />
              {content.badge}
            </Badge>

            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">{content.heading}</h1>

            <p className="text-xl text-muted-foreground">{content.subheading}</p>
          </div>

          {/* Owliver Mascot */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white/50 dark:bg-black/20 backdrop-blur">
            <div className="aspect-video flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-40 h-40 mx-auto mb-4 flex items-center justify-center">
                  <Image
                    src="/images/owliver-owl-icon.png"
                    alt="Owliver - Tax Genius Mascot"
                    width={160}
                    height={160}
                    className="w-full h-full object-contain drop-shadow-lg"
                    priority
                  />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {t('mascot.greeting', { defaultValue: 'Meet Owliver, your tax guide!' })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('mascot.tagline', { defaultValue: 'Smart, reliable, always here to help' })}
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            {content.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start">
                <benefit.icon
                  className={`w-6 h-6 ${content.accentColor} mr-3 flex-shrink-0 mt-0.5`}
                />
                <p className="text-lg">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Clerk Sign Up Component */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <AuthLogo className="mb-6" />
          </div>

          {/* Clerk SignUp Component */}
          <SignUp
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0 w-full',
                headerTitle: 'text-2xl font-bold',
                headerSubtitle: 'text-muted-foreground',
                socialButtonsBlockButton: 'h-12 text-base font-semibold',
                formFieldInput: 'h-12 border-2',
                formButtonPrimary: 'h-12 text-base font-semibold bg-primary hover:bg-primary/90',
                footerAction: 'text-sm',
                identityPreviewEditButton: 'text-primary',
              },
              variables: {
                colorPrimary: '#ff6b35',
                colorBackground: 'transparent',
              },
            }}
            routing="path"
            path="/auth/signup"
            signInUrl="/auth/signin"
            forceRedirectUrl="/dashboard"
          />

          {/* Sign In CTA */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {t('form.alreadyHaveAccount', { defaultValue: 'Already have an account?' })}
            </p>
            <a
              href={`/auth/signin${role ? `?role=${role}` : ''}`}
              className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
            >
              {t('form.signIn', { defaultValue: 'Sign In' })}
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}
    >
      <SignUpContent />
    </Suspense>
  );
}
