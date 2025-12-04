'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';

export default function AdminSetupPage() {
  const { data: session } = useSession(); const user = session?.user;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const userEmail = user?.emailAddresses[0]?.emailAddress;
  const isAllowed = userEmail === 'support@taxgeniuspro.tax';

  const handleSetupSuperAdmin = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/set-super-admin', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });

        // Reload the page to get updated user metadata
        setTimeout(() => {
          window.location.href = '/dashboard/admin';
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to set super admin' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/auth/signin')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>This page is restricted to authorized personnel only.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Logged in as: <strong>{userEmail}</strong>
            </p>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Super Admin Setup</CardTitle>
          <CardDescription>Configure super administrator access for your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Account Information</p>
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                Email: <span className="font-mono text-foreground">{userEmail}</span>
              </p>
              <p className="text-muted-foreground">
                User ID: <span className="font-mono text-foreground text-xs">{user.id}</span>
              </p>
              <p className="text-muted-foreground">
                Current Role:{' '}
                <span className="font-mono text-foreground">
                  {(user?.role as string) || 'none'}
                </span>
              </p>
            </div>
          </div>

          {message && (
            <div
              className={`rounded-lg p-4 ${
                message.type === 'success'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              <p className="text-sm font-medium">{message.text}</p>
              {message.type === 'success' && (
                <p className="text-xs mt-1">Redirecting to admin dashboard...</p>
              )}
            </div>
          )}

          <Button onClick={handleSetupSuperAdmin} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? 'Setting up...' : 'Activate Super Admin Access'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            This will grant you full administrative access to the platform
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
