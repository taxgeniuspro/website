'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
} from 'lucide-react';
import { logger } from '@/lib/logger';
import Link from 'next/link';

/**
 * Professional Email Store Page
 * /store/professional-email
 *
 * Allows tax preparers to purchase professional email addresses
 * (e.g., ira@taxgeniuspro.tax)
 */
export default function ProfessionalEmailStorePage() {
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';

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

  // Auto-fill display name from Clerk user
  useEffect(() => {
    if (user && !displayName) {
      const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
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

  /**
   * Check if username is available
   */
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

  /**
   * Handle purchase
   */
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
        // Redirect to checkout
        logger.info('Professional email alias created', {
          aliasId: data.aliasId,
          email: data.email,
        });

        // TODO: Redirect to actual payment page
        // For now, show success message
        alert(`Success! Your email ${data.email} has been created. Redirecting to checkout...`);
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
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to purchase a professional email</CardDescription>
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
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-8 pb-20 md:pb-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <Badge className="mb-2">Professional Email</Badge>
        <h1 className="text-4xl font-bold">Get Your Professional Email</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Stand out with a professional @taxgeniuspro.tax email address. Build trust with clients
          and grow your tax preparation business.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column: Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Email Address</CardTitle>
              <CardDescription>
                Select your professional email username. All emails will be forwarded to your
                personal email.
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
                  <span className="text-muted-foreground whitespace-nowrap">
                    @taxgeniuspro.tax
                  </span>
                </div>

                {/* Availability Status */}
                {username && username.length >= 2 && (
                  <div className="flex items-center gap-2 text-sm">
                    {checkingAvailability && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Checking availability...</span>
                      </>
                    )}
                    {!checkingAvailability && isAvailable === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          {username}@taxgeniuspro.tax is available!
                        </span>
                      </>
                    )}
                    {!checkingAvailability && isAvailable === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-red-600">
                          {availabilityError || 'This username is taken'}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Try these alternatives:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          onClick={() => setUsername(suggestion)}
                        >
                          {suggestion}@taxgeniuspro.tax
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Forward To Email */}
              <div className="space-y-2">
                <Label htmlFor="forwardToEmail">
                  Forward To Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="forwardToEmail"
                  type="email"
                  placeholder="your.personal.email@gmail.com"
                  value={forwardToEmail}
                  onChange={(e) => setForwardToEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Emails sent to your professional address will be forwarded here
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
                <p className="text-xs text-muted-foreground">
                  This name will appear when you send emails
                </p>
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
                    Continue to Checkout
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pricing & Features */}
        <div className="space-y-6">
          {/* Pricing Card */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Simple, transparent pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <div className="text-5xl font-bold text-primary">${currentPrice}</div>
                <div className="text-muted-foreground">/year</div>
                {isFirstPurchase && (
                  <Badge variant="secondary" className="mt-2">
                    First Email
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">First email:</span>
                  <span className="font-medium">$36/year</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Additional emails:</span>
                  <span className="font-medium">$24/year each</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Card */}
          <Card>
            <CardHeader>
              <CardTitle>What's Included</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Professional Email Address</div>
                    <p className="text-sm text-muted-foreground">
                      yourname@taxgeniuspro.tax
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Auto-Forwarding</div>
                    <p className="text-sm text-muted-foreground">
                      Receive emails in your personal inbox
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Gmail Send-As Setup</div>
                    <p className="text-sm text-muted-foreground">
                      Send from your professional address in Gmail
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Email Templates</div>
                    <p className="text-sm text-muted-foreground">
                      Quick response templates for leads and clients
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Professional Brand</div>
                    <p className="text-sm text-muted-foreground">
                      Build trust with a business email address
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Dashboard Integration</div>
                    <p className="text-sm text-muted-foreground">
                      Send emails directly from your Tax Genius Pro dashboard
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle>Common Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium mb-1">Can I use multiple emails?</div>
                <p className="text-muted-foreground">
                  Yes! Purchase additional aliases like support@, hello@, or support@taxgeniuspro.tax
                  for $24/year each.
                </p>
              </div>

              <div>
                <div className="font-medium mb-1">Where do emails go?</div>
                <p className="text-muted-foreground">
                  All emails are forwarded to your personal email address. You stay in your
                  familiar inbox!
                </p>
              </div>

              <div>
                <div className="font-medium mb-1">Can I cancel anytime?</div>
                <p className="text-muted-foreground">
                  Yes, you can cancel your subscription at any time from your settings.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
