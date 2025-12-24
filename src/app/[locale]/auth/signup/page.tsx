'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  DollarSign,
  Shield,
  Award,
  CheckCircle,
  TrendingUp,
  Users,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AuthLogo } from '@/components/Logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

function SignUpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get('role') || 'client';
  const t = useTranslations('auth.signup');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Email/password signup state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCredentialsLoading, setIsCredentialsLoading] = useState(false);

  // Role-specific content
  // Note: All signups become 'client' with automatic affiliate features
  // The 'affiliate' option is kept for marketing purposes but creates same client role
  const roleContent = {
    client: {
      badge: t('client.badge'),
      icon: Shield,
      heading: t('client.heading'),
      subheading: t('client.subheading'),
      benefits: [
        { icon: CheckCircle, text: t('client.benefit1') },
        { icon: Shield, text: t('client.benefit2') },
        { icon: TrendingUp, text: t('client.benefit3') },
      ],
      ctaText: t('client.ctaText'),
      imageSuggestion: t('client.imageSuggestion'),
      trustIndicator: t('client.trustIndicator'),
      accountSubtext: t('client.accountSubtext'),
      theme: 'from-blue-50 to-blue-100 dark:bg-blue-900/20',
      accentColor: 'text-blue-600 dark:text-blue-400',
    },
    preparer: {
      badge: t('preparer.badge'),
      icon: Award,
      heading: t('preparer.heading'),
      subheading: t('preparer.subheading'),
      benefits: [
        { icon: DollarSign, text: t('preparer.benefit1') },
        { icon: Users, text: t('preparer.benefit2') },
        { icon: Shield, text: t('preparer.benefit3') },
      ],
      ctaText: t('preparer.ctaText'),
      imageSuggestion: t('preparer.imageSuggestion'),
      trustIndicator: t('preparer.trustIndicator'),
      accountSubtext: t('preparer.accountSubtext'),
      theme: 'from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20',
      accentColor: 'text-blue-600 dark:text-blue-400',
    },
    // 'affiliate' signup creates a client with auto-approved affiliate status
    // This is for marketing - users who want to focus on referring
    affiliate: {
      badge: `💰 ${t('affiliate.badge')}`,
      icon: DollarSign,
      heading: t('affiliate.heading'),
      subheading: t('affiliate.subheading'),
      benefits: [
        { icon: DollarSign, text: t('affiliate.benefit1') },
        { icon: TrendingUp, text: t('affiliate.benefit2') },
        { icon: CheckCircle, text: t('affiliate.benefit3') },
      ],
      ctaText: t('affiliate.ctaText'),
      imageSuggestion: t('affiliate.imageSuggestion'),
      trustIndicator: t('affiliate.trustIndicator'),
      accountSubtext: t('affiliate.accountSubtext'),
      theme: 'from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-800/20',
      accentColor: 'text-yellow-600 dark:text-yellow-400',
    },
  };

  const content = roleContent[role as keyof typeof roleContent] || roleContent.client;
  const IconComponent = content.icon;

  const handleGoogleSignUp = async () => {
    setError('');
    setIsLoading(true);
    try {
      // All signups go directly to client dashboard - no role selection needed
      await signIn('google', {
        callbackUrl: '/dashboard/client',
        redirect: true,
      });
    } catch (error) {
      console.error('Google sign up error:', error);
      setError(t('errors.unexpectedError'));
      setIsLoading(false);
    }
  };

  const handleCredentialsSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter a password');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setIsCredentialsLoading(true);

    try {
      // Call signup API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password,
          name: name || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        setIsCredentialsLoading(false);
        return;
      }

      // Auto sign in after successful signup
      const result = await signIn('credentials', {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created! Please sign in.');
        router.push('/auth/signin');
        return;
      }

      // Success - redirect to dashboard
      if (result?.ok) {
        router.push('/dashboard/client');
        router.refresh();
      } else {
        // Fallback: account created but auto-login unclear - redirect to signin
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setError(t('errors.unexpectedError'));
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

          {/* Image Placeholder */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white/50 dark:bg-black/20 backdrop-blur">
            <div className="aspect-video flex items-center justify-center p-12">
              <div className="text-center">
                <div
                  className={`w-32 h-32 bg-white/80 dark:bg-black/40 rounded-full mx-auto mb-6 flex items-center justify-center`}
                >
                  <IconComponent className={`w-16 h-16 ${content.accentColor}`} />
                </div>
                <p className="text-sm font-semibold text-muted-foreground mb-2">
                  {t('imagePlaceholder.replaceWith')}
                </p>
                <p className="text-xs text-muted-foreground">{content.imageSuggestion}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('imagePlaceholder.recommended')}</p>
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

          {/* Trust indicators */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              {role === 'affiliate' ? '🔥 ' : '✓ '}{content.trustIndicator}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <AuthLogo className="mb-6" />
            <h2 className="text-2xl font-bold mb-2">{content.ctaText}</h2>
            <p className="text-sm text-muted-foreground">
              {content.accountSubtext}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Google OAuth - Primary sign up method */}
          <Button
            type="button"
            variant="default"
            className={`w-full h-14 text-base font-semibold ${
              role === 'affiliate' ? 'bg-yellow-500 hover:bg-yellow-600' : ''
            }`}
            onClick={handleGoogleSignUp}
            disabled={isLoading || isCredentialsLoading}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill={role === 'affiliate' ? '#000' : '#4285F4'}
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill={role === 'affiliate' ? '#000' : '#34A853'}
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill={role === 'affiliate' ? '#000' : '#FBBC05'}
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill={role === 'affiliate' ? '#000' : '#EA4335'}
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? 'Creating account...' : 'Sign up with Google'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">
                Or use email
              </span>
            </div>
          </div>

          {/* Email/Password Sign Up Form */}
          <form onSubmit={handleCredentialsSignUp} className="space-y-3">
            <Input
              type="text"
              placeholder="Full name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCredentialsLoading}
              className="h-12 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm"
              autoComplete="name"
            />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isCredentialsLoading}
              className="h-12 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm"
              autoComplete="username"
              name="signup-email"
            />
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isCredentialsLoading}
                className="h-12 pr-10 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm"
                autoComplete="new-password"
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
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isCredentialsLoading}
              className="h-12 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm"
              autoComplete="new-password"
            />
            <Button
              type="submit"
              variant="default"
              className="w-full h-12 text-base"
              disabled={isCredentialsLoading}
            >
              {isCredentialsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <div className="text-xs text-muted-foreground text-center">
            {t('form.termsText')}{' '}
            <a href="/terms" className="text-primary hover:underline">
              {t('form.termsLink')}
            </a>{' '}
            {t('form.termsAnd')}{' '}
            <a href="/privacy" className="text-primary hover:underline">
              {t('form.privacyLink')}
            </a>
            .
          </div>

          <div className="text-center text-sm text-muted-foreground pt-4">
            {t('form.alreadyHaveAccount')}{' '}
            <a
              href={`/auth/signin${role ? `?role=${role}` : ''}`}
              className="text-primary hover:underline font-semibold"
            >
              {t('form.signInLink')}
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
