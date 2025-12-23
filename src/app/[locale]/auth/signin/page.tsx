'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { DollarSign, Shield, Award, CheckCircle, TrendingUp, Users, Zap, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { AuthLogo } from '@/components/Logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';

function SignInContent() {
  const t = useTranslations('auth.signin');
  const tErrors = useTranslations('auth.error.errors');
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get('role') || 'client';
  const urlError = searchParams.get('error');

  // Clean the callback URL to prevent 0.0.0.0 or localhost from being used
  let callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  try {
    // If callbackUrl is a full URL, extract just the pathname
    if (callbackUrl.startsWith('http://') || callbackUrl.startsWith('https://')) {
      const url = new URL(callbackUrl);
      callbackUrl = url.pathname + url.search;
    }
  } catch (e) {
    // If parsing fails, default to /dashboard
    callbackUrl = '/dashboard';
  }

  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Classic email/password login state
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCredentialsLoading, setIsCredentialsLoading] = useState(false);

  // Handle URL error parameter (e.g., OAuthAccountNotLinked)
  useEffect(() => {
    if (urlError) {
      // Map error codes to translated messages
      const errorMessages: Record<string, { title: string; description: string }> = {
        OAuthAccountNotLinked: {
          title: tErrors('OAuthAccountNotLinked.title', { defaultValue: 'Account Not Linked' }),
          description: tErrors('OAuthAccountNotLinked.description', { defaultValue: 'This email is already associated with another account. Please sign in with email and password below.' }),
        },
        CredentialsSignin: {
          title: tErrors('CredentialsSignin.title', { defaultValue: 'Sign In Failed' }),
          description: tErrors('CredentialsSignin.description', { defaultValue: 'Invalid email or password.' }),
        },
        EmailSignin: {
          title: tErrors('EmailSignin.title', { defaultValue: 'Email Sign In Error' }),
          description: tErrors('EmailSignin.description', { defaultValue: 'Error sending verification email.' }),
        },
      };

      const errorInfo = errorMessages[urlError] || {
        title: 'Sign In Error',
        description: 'An error occurred. Please try again.',
      };

      setError(`${errorInfo.title}: ${errorInfo.description}`);

      // If OAuthAccountNotLinked, automatically show the email/password form
      if (urlError === 'OAuthAccountNotLinked') {
        setShowEmailPassword(true);
      }
    }
  }, [urlError, tErrors]);

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
      ctaText: t('client.ctaText'),
      imageSuggestion: t('client.imageSuggestion'),
      theme: 'from-blue-50 to-blue-100 dark:bg-blue-900/20',
      accentColor: 'text-blue-600 dark:text-blue-400',
      welcomeBack: t('client.welcomeBack'),
      formSubheading: t('client.formSubheading'),
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
      ctaText: t('preparer.ctaText'),
      imageSuggestion: t('preparer.imageSuggestion'),
      theme: 'from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20',
      accentColor: 'text-blue-600 dark:text-blue-400',
      welcomeBack: t('preparer.welcomeBack'),
      formSubheading: t('preparer.formSubheading'),
    },
    affiliate: {
      badge: t('affiliate.badge'),
      icon: DollarSign,
      heading: t('affiliate.heading'),
      subheading: t('affiliate.subheading'),
      benefits: [
        { icon: Zap, text: t('affiliate.benefit1') },
        { icon: TrendingUp, text: t('affiliate.benefit2') },
        { icon: DollarSign, text: t('affiliate.benefit3') },
      ],
      ctaText: t('affiliate.ctaText'),
      imageSuggestion: t('affiliate.imageSuggestion'),
      theme: 'from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-800/20',
      accentColor: 'text-yellow-600 dark:text-yellow-400',
      welcomeBack: t('affiliate.welcomeBack'),
      formSubheading: t('affiliate.formSubheading'),
    },
  };

  const content = roleContent[role as keyof typeof roleContent] || roleContent.client;
  const IconComponent = content.icon;

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signIn('google', {
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error('Google sign in error:', error);
      setError(t('errors.unexpectedError'));
      setIsLoading(false);
    }
  };

  const handleMagicLinkSignIn = async () => {
    if (!magicLinkEmail) {
      setError(t('errors.emailRequired', { defaultValue: 'Please enter your email address' }));
      return;
    }

    setError('');
    setIsMagicLinkLoading(true);

    try {
      const result = await signIn('resend', {
        email: magicLinkEmail,
        redirect: false,
      });

      if (result?.error) {
        setError(t('errors.magicLinkFailed', { defaultValue: 'Failed to send magic link. Please try again.' }));
        setIsMagicLinkLoading(false);
        return;
      }

      // Success - show confirmation message
      setMagicLinkSent(true);
      setIsMagicLinkLoading(false);

      // Redirect to verify page after 2 seconds
      setTimeout(() => {
        router.push('/auth/verify');
      }, 2000);
    } catch (error) {
      console.error('Magic link error:', error);
      setError(t('errors.unexpectedError'));
      setIsMagicLinkLoading(false);
    }
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError(t('errors.emailRequired', { defaultValue: 'Please enter your email address' }));
      return;
    }
    if (!password) {
      setError(t('errors.passwordRequired', { defaultValue: 'Please enter your password' }));
      return;
    }

    setError('');
    setIsCredentialsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        // Check for specific error types from the server
        if (result.error.includes('Account temporarily locked')) {
          setError(result.error);
        } else if (result.error === 'Account suspended') {
          setError(t('errors.accountSuspended', { defaultValue: 'Your account has been suspended. Please contact support.' }));
        } else {
          setError(t('errors.invalidCredentials', { defaultValue: 'Invalid email or password. Please check your credentials and try again.' }));
        }
        setIsCredentialsLoading(false);
        return;
      }

      // Success - redirect to dashboard
      router.push(callbackUrl);
    } catch (error) {
      console.error('Credentials sign in error:', error);
      setError(t('errors.unexpectedError', { defaultValue: 'An unexpected error occurred. Please try again.' }));
      setIsCredentialsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Role-specific messaging with image */}
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

          {/* Welcome back message */}
          <div className="pt-4 border-t">
            <p className="text-lg font-semibold">{content.welcomeBack}</p>
          </div>
        </div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <AuthLogo className="mb-6" />
            <h2 className="text-2xl font-bold mb-2">{content.ctaText}</h2>
            <p className="text-sm text-muted-foreground">
              {content.formSubheading}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Google OAuth - First and most prominent */}
          <Button
            type="button"
            variant="default"
            className="w-full h-14 text-base font-semibold"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isMagicLinkLoading || isCredentialsLoading}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('form.signInWithGoogle', { defaultValue: 'Sign in with Google' })}
          </Button>

          {/* Magic Link - Second */}
          <div className="space-y-2">
            <Input
              type="email"
              placeholder={t('form.emailForMagicLink', { defaultValue: 'Enter email for magic link' })}
              value={magicLinkEmail}
              onChange={(e) => setMagicLinkEmail(e.target.value)}
              disabled={isLoading || isMagicLinkLoading || isCredentialsLoading || magicLinkSent}
              className="h-12 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base"
              onClick={handleMagicLinkSignIn}
              disabled={isLoading || isMagicLinkLoading || isCredentialsLoading || magicLinkSent}
            >
              {isMagicLinkLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('form.sendingMagicLink', { defaultValue: 'Sending link...' })}
                </>
              ) : magicLinkSent ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  {t('form.magicLinkSent', { defaultValue: 'Magic link sent!' })}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('form.signInWithMagicLink', { defaultValue: 'Sign in with Magic Link' })}
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('form.or', { defaultValue: 'Or' })}
              </span>
            </div>
          </div>

          {/* Classic Email/Password Login - Always visible */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-3">
            <Input
              type="email"
              placeholder={t('form.email', { defaultValue: 'Email address' })}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isCredentialsLoading}
              className="h-12 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm"
              autoComplete="email"
            />
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('form.password', { defaultValue: 'Password' })}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isCredentialsLoading}
                className="h-12 pr-10 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm"
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isCredentialsLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <Button
              type="submit"
              variant="default"
              className="w-full h-12 text-base"
              disabled={isCredentialsLoading}
            >
              {isCredentialsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('form.signingIn', { defaultValue: 'Signing in...' })}
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  {t('form.signIn', { defaultValue: 'Sign In' })}
                </>
              )}
            </Button>
            <div className="text-center">
              <a
                href="/auth/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                {t('form.forgotPassword', { defaultValue: 'Forgot password?' })}
              </a>
            </div>
          </form>

          {/* Sign Up CTA - Made more prominent */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {t('form.dontHaveAccount')}
            </p>
            <a
              href={`/auth/signup${role ? `?role=${role}` : ''}`}
              className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
            >
              {t('form.signUp')}
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}
    >
      <SignInContent />
    </Suspense>
  );
}
