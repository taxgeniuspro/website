import React, { useState, useEffect } from 'react';
import { Check, Copy, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useVanityUrl,
  useSetVanitySlug,
  useCheckVanitySlugAvailability,
} from '@/hooks/useReferrerData';
import { useToast } from '@/hooks/use-toast';

interface VanityLinkManagerProps {
  referrerId: string;
  currentSlug?: string;
}

export const VanityLinkManager: React.FC<VanityLinkManagerProps> = ({
  referrerId,
  currentSlug,
}) => {
  const { toast } = useToast();
  const [inputSlug, setInputSlug] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'idle' | 'checking' | 'available' | 'unavailable'
  >('idle');
  const [copied, setCopied] = useState(false);

  const { data: vanityUrl } = useVanityUrl(referrerId);
  const { mutate: setVanitySlug, isPending: isSettingSlug } = useSetVanitySlug();
  const { mutate: checkAvailability, isPending: isCheckingAvailability } =
    useCheckVanitySlugAvailability();

  const hasVanityUrl = Boolean(vanityUrl || currentSlug);
  const displayUrl = vanityUrl || currentSlug;
  const fullUrl = displayUrl ? `https://taxgenius.com/${displayUrl}` : '';

  // Debounced availability check
  useEffect(() => {
    if (!inputSlug || inputSlug.length < 3 || hasVanityUrl) {
      setAvailabilityStatus('idle');
      return;
    }

    // Basic validation
    const slugRegex = /^[a-zA-Z0-9-_]+$/;
    if (!slugRegex.test(inputSlug)) {
      setAvailabilityStatus('unavailable');
      return;
    }

    setAvailabilityStatus('checking');
    const timeoutId = setTimeout(() => {
      checkAvailability(inputSlug.toLowerCase(), {
        onSuccess: (isAvailable) => {
          setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');
        },
        onError: () => {
          setAvailabilityStatus('idle');
          toast({
            title: 'Error',
            description: 'Unable to check availability. Please try again.',
            variant: 'destructive',
          });
        },
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inputSlug, checkAvailability, hasVanityUrl, toast]);

  const handleSetVanitySlug = () => {
    if (!inputSlug || availabilityStatus !== 'available') return;

    setVanitySlug(
      { referrerId, slug: inputSlug.toLowerCase() },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({
              title: 'Success!',
              description: 'Your vanity URL has been set successfully.',
            });
            setInputSlug('');
            setAvailabilityStatus('idle');
          } else {
            toast({
              title: 'Error',
              description: result.error || 'Failed to set vanity URL.',
              variant: 'destructive',
            });
          }
        },
        onError: () => {
          toast({
            title: 'Error',
            description: 'Failed to set vanity URL. Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleCopyUrl = async () => {
    if (!fullUrl) return;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Vanity URL copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy URL to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const getInputBorderClass = () => {
    switch (availabilityStatus) {
      case 'available':
        return 'border-green-500 focus:border-green-500';
      case 'unavailable':
        return 'border-red-500 focus:border-red-500';
      case 'checking':
        return 'border-yellow-500 focus:border-yellow-500';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (availabilityStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />;
      case 'available':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'unavailable':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (availabilityStatus) {
      case 'checking':
        return 'Checking availability...';
      case 'available':
        return 'Available! You can claim this URL.';
      case 'unavailable':
        return 'Not available. Try a different name.';
      default:
        return null;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Your Referral Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasVanityUrl ? (
          // Show existing vanity URL
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
              <Label className="text-sm font-medium text-green-900 dark:text-green-100">
                Your Custom URL
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-background px-2 py-1 rounded border flex-1">
                  {fullUrl}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopyUrl} className="shrink-0">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your vanity URL is set and ready to use! Share this link to track your referrals.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          // Show vanity URL creation form
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="vanity-slug">Choose Your Custom URL</Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  taxgenius.com/
                </span>
                <div className="relative flex-1">
                  <Input
                    id="vanity-slug"
                    placeholder="YourName"
                    value={inputSlug}
                    onChange={(e) => setInputSlug(e.target.value)}
                    className={getInputBorderClass()}
                    disabled={isSettingSlug}
                    maxLength={50}
                  />
                  {getStatusIcon() && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {getStatusIcon()}
                    </div>
                  )}
                </div>
              </div>
              {getStatusMessage() && (
                <p
                  className={`text-xs ${
                    availabilityStatus === 'available'
                      ? 'text-green-600'
                      : availabilityStatus === 'unavailable'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                  }`}
                >
                  {getStatusMessage()}
                </p>
              )}
            </div>

            <Button
              onClick={handleSetVanitySlug}
              disabled={
                !inputSlug ||
                availabilityStatus !== 'available' ||
                isSettingSlug ||
                isCheckingAvailability
              }
              className="w-full"
            >
              {isSettingSlug ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting URL...
                </>
              ) : (
                'Claim This URL'
              )}
            </Button>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Choose carefully! You can only set your vanity URL once. Use letters, numbers,
                hyphens, and underscores only.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VanityLinkManager;
