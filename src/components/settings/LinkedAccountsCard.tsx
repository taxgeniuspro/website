'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Link2, Unlink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface LinkedAccount {
  provider: string;
  providerAccountId: string;
  createdAt: string;
}

interface LinkedAccountsResponse {
  accounts: LinkedAccount[];
  hasPassword: boolean;
}

export function LinkedAccountsCard() {
  const searchParams = useSearchParams();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Handle URL query params for success/error messages
  useEffect(() => {
    const linkSuccess = searchParams.get('link_success');
    const linkError = searchParams.get('link_error');

    if (linkSuccess === 'google') {
      setMessage({
        type: 'success',
        text: 'Google account successfully linked! You can now sign in with Google.',
      });
      // Refresh the accounts list
      fetchLinkedAccounts();
    } else if (linkError) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'Google sign-in was cancelled.',
        email_mismatch:
          'The Google account email does not match your account email. Please use the same email.',
        already_linked_other:
          'This Google account is already linked to another user.',
        already_linked: 'This Google account is already linked.',
        invalid_state: 'Session expired. Please try again.',
        invalid_action: 'Invalid request. Please try again.',
        missing_params: 'Invalid callback. Please try again.',
        token_exchange_failed: 'Failed to authenticate with Google. Please try again.',
        no_access_token: 'Failed to get access token. Please try again.',
        userinfo_failed: 'Failed to get account information. Please try again.',
        user_not_found: 'Account not found. Please sign in again.',
        failed: 'Failed to link Google account. Please try again.',
      };
      setMessage({
        type: 'error',
        text: errorMessages[linkError] || 'An error occurred. Please try again.',
      });
    }

    // Clear URL params after reading
    if (linkSuccess || linkError) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // Fetch linked accounts on mount
  async function fetchLinkedAccounts() {
    try {
      const response = await fetch('/api/auth/linked-accounts');
      if (response.ok) {
        const data: LinkedAccountsResponse = await response.json();
        setLinkedAccounts(data.accounts);
        setHasPassword(data.hasPassword);
      }
    } catch (error) {
      console.error('Failed to fetch linked accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  const handleLinkGoogle = async () => {
    setIsLinking(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/link-google', { method: 'POST' });
      const data = await response.json();

      if (response.ok && data.redirectUrl) {
        // Redirect to Google OAuth
        window.location.href = data.redirectUrl;
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to initiate linking',
        });
        setIsLinking(false);
      }
    } catch (error) {
      console.error('Link Google error:', error);
      setMessage({
        type: 'error',
        text: 'Failed to connect. Please try again.',
      });
      setIsLinking(false);
    }
  };

  const handleUnlinkAccount = async (provider: string) => {
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

    if (
      !confirm(
        `Are you sure you want to unlink your ${providerName} account? You will need to use your password to sign in.`
      )
    ) {
      return;
    }

    setIsUnlinking(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/auth/linked-accounts/${provider}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setLinkedAccounts((accounts) =>
          accounts.filter((a) => a.provider !== provider)
        );
        setMessage({
          type: 'success',
          text: `${providerName} account unlinked successfully.`,
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to unlink account.',
        });
      }
    } catch (error) {
      console.error('Unlink error:', error);
      setMessage({
        type: 'error',
        text: 'Failed to unlink account. Please try again.',
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  const hasGoogleLinked = linkedAccounts.some((a) => a.provider === 'google');
  const canUnlinkGoogle = hasPassword || linkedAccounts.length > 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          <CardTitle>Linked Accounts</CardTitle>
        </div>
        <CardDescription>
          Connect external accounts for easier sign-in options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Google Account */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                </div>
                <div>
                  <p className="font-medium">Google</p>
                  <p className="text-sm text-muted-foreground">
                    {hasGoogleLinked
                      ? 'Connected - You can sign in with Google'
                      : 'Not connected'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasGoogleLinked ? (
                  <>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Linked
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlinkAccount('google')}
                      disabled={isUnlinking || !canUnlinkGoogle}
                      title={
                        !canUnlinkGoogle
                          ? 'Set a password before unlinking'
                          : undefined
                      }
                    >
                      {isUnlinking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Unlink className="w-4 h-4 mr-1" />
                          Unlink
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLinkGoogle}
                    disabled={isLinking}
                  >
                    {isLinking ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4 mr-1" />
                        Link Account
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Linking your Google account allows you to sign in with Google in
                addition to your email and password.
              </p>
              {!hasPassword && hasGoogleLinked && (
                <p className="text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  You need to set a password before you can unlink your Google
                  account.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
