'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/supabase/useSession';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Mail,
  Check,
  X,
  Loader2,
  ArrowRight,
  Shield,
  Zap,
  Users,
  Star,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import Link from 'next/link';

/**
 * Professional Email Settings Page
 * /dashboard/tax-preparer/settings/professional-email
 *
 * Allows tax preparers to purchase and manage professional email addresses
 * (e.g., ira@taxgeniuspro.tax)
 */
export default function ProfessionalEmailSettingsPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoaded = status !== 'loading';

  // Form state
  const [username, setUsername] = useState('');
  const [forwardToEmail, setForwardToEmail] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Availability checking
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilityError, setAvailabilityError] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Purchase state
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  // Pricing
  const [pricing, setPricing] = useState<{
    firstAlias: number;
    additionalAlias: number;
    nextAliasPrice: number;
    existingAliasesCount: number;
  } | null>(null);

  // Load pricing on mount
  useEffect(() => {
    async function loadPricing() {
      try {
        const response = await fetch('/api/store/professional-email/purchase');
        if (response.ok) {
          const data = await response.json();
          setPricing(data);
        }
      } catch (error) {
        logger.error('Error loading pricing', error);
      }
    }

    if (isLoaded && user) {
      loadPricing();
    }
  }, [isLoaded, user]);

  // Auto-fill display name from session user
  useEffect(() => {
    if (user && !displayName) {
      const name = user.name || '';
      if (name) {
        setDisplayName(name);
      }
    }
  }, [user, displayName]);

  // Check availability with debounce
  useEffect(() => {
    if (!username || username.length < 2) {
      setIsAvailable(null);
      setAvailabilityError('');
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      await checkAvailability(username);
    }, 500);

    return () => clearTimeout(timeout);
  }, [username]);

  async function checkAvailability(usernameToCheck: string) {
    setCheckingAvailability(true);
    setAvailabilityError('');
    setSuggestions([]);

    try {
      const response = await fetch(
        `/api/store/professional-email/check-availability?username=${encodeURIComponent(usernameToCheck)}`
      );
      const data = await response.json();

      if (response.ok) {
        setIsAvailable(data.available);
        if (!data.available && data.suggestions) {
          setSuggestions(data.suggestions);
        }
        if (data.error) {
          setAvailabilityError(data.error);
        }
      } else {
        setAvailabilityError(data.error || 'Failed to check availability');
        setIsAvailable(false);
      }
    } catch (error) {
      logger.error('Error checking availability', error);
      setAvailabilityError('Failed to check availability');
      setIsAvailable(false);
    } finally {
      setCheckingAvailability(false);
    }
  }

  async function handlePurchase() {
    if (!username || !forwardToEmail || !displayName) {
      setPurchaseError('Please fill in all required fields');
      return;
    }

    if (!isAvailable) {
      setPurchaseError('This username is not available');
      return;
    }

    setPurchasing(true);
    setPurchaseError('');

    try {
      const response = await fetch('/api/store/professional-email/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          forwardToEmail,
          displayName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        logger.info('Professional email alias created', {
          aliasId: data.aliasId,
          email: data.email,
        });
        window.location.href = data.checkoutUrl;
      } else {
        setPurchaseError(data.error || 'Failed to create professional email');
      }
    } catch (error) {
      logger.error('Error purchasing professional email', error);
      setPurchaseError('Failed to create professional email. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to manage professional email</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPrice = pricing?.nextAliasPrice || 36;
  const isFirstPurchase = pricing?.existingAliasesCount === 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl space-y-6 pb-20 md:pb-6">
      {/* Back Link */}
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard/tax-preparer/settings">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Professional Email</h1>
        </div>
        <p className="text-muted-foreground">
          Get a professional @taxgeniuspro.tax email address to build trust with clients.
        </p>
      </div>

      {/* Existing Aliases */}
      {pricing && pricing.existingAliasesCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Email Addresses</CardTitle>
            <CardDescription>
              You have {pricing.existingAliasesCount} professional email
              {pricing.existingAliasesCount > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage your existing emails in the settings below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isFirstPurchase ? 'Get Your First Email' : 'Add Another Email'}
            </CardTitle>
            <CardDescription>
              Choose your username and set up forwarding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Username Input */}
            <div className="space-y-2">
              <Label htmlFor="username">
                Email Username <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="username"
                  placeholder="yourname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="flex-1"
                />
                <span className="text-muted-foreground whitespace-nowrap text-sm">
                  @taxgeniuspro.tax
                </span>
              </div>

              {/* Availability Status */}
              {username && username.length >= 2 && (
                <div className="flex items-center gap-2 text-sm">
                  {checkingAvailability && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking...</span>
                    </>
                  )}
                  {!checkingAvailability && isAvailable === true && (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium">Available!</span>
                    </>
                  )}
                  {!checkingAvailability && isAvailable === false && (
                    <>
                      <X className="w-4 h-4 text-red-600" />
                      <span className="text-red-600">
                        {availabilityError || 'Taken'}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Try these:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => setUsername(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Forward To Email */}
            <div className="space-y-2">
              <Label htmlFor="forwardToEmail">
                Forward To <span className="text-red-500">*</span>
              </Label>
              <Input
                id="forwardToEmail"
                type="email"
                placeholder="your.personal.email@gmail.com"
                value={forwardToEmail}
                onChange={(e) => setForwardToEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Emails will be forwarded here
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">
                Display Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="displayName"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            {/* Purchase Error */}
            {purchaseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{purchaseError}</AlertDescription>
              </Alert>
            )}

            {/* Purchase Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handlePurchase}
              disabled={
                !username ||
                !forwardToEmail ||
                !displayName ||
                !isAvailable ||
                checkingAvailability ||
                purchasing
              }
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Continue - ${currentPrice}/year
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Features */}
        <div className="space-y-4">
          {/* Pricing */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">First email:</span>
                <span className="font-medium">$36/year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Additional emails:</span>
                <span className="font-medium">$24/year each</span>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">What's Included</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Professional @taxgeniuspro.tax address</span>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Auto-forward to your inbox</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Gmail Send-As setup</span>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Email templates</span>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Professional brand trust</span>
              </div>
              <div className="flex items-start gap-3">
                <Star className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Dashboard integration</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
