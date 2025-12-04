'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, CheckCircle2, Mail, Phone, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LeadDashboard() {
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const router = useRouter();

  // Redirect if user is no longer a lead (role changed)
  useEffect(() => {
    if (isLoaded && user) {
      const role = user?.role as string;
      // Normalize role to lowercase to handle any case inconsistencies
      const normalizedRole = role?.toLowerCase();
      if (normalizedRole && normalizedRole !== 'lead') {
        // Role was changed, redirect to appropriate dashboard
        const dashboardMap: Record<string, string> = {
          client: '/dashboard/client',
          affiliate: '/dashboard/affiliate',
          tax_preparer: '/dashboard/tax-preparer',
          admin: '/dashboard/admin',
          super_admin: '/dashboard/admin',
        };
        router.push(dashboardMap[normalizedRole] || '/dashboard');
      }
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto p-6 md:p-8 lg:p-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
            <Clock className="h-10 w-10 text-yellow-600 dark:text-yellow-400 animate-pulse" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Account Pending Approval
          </h1>
          <p className="text-lg text-muted-foreground">Welcome to TaxGeniusPro!</p>
        </div>

        {/* Main Status Card */}
        <Card className="mb-6 border-2 border-yellow-200 dark:border-yellow-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Application Under Review
            </CardTitle>
            <CardDescription>Our team is currently reviewing your application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Application Received</AlertTitle>
              <AlertDescription>
                Thank you for signing up! Your account has been created and is currently pending
                approval from our administrative team.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">1</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Application Submitted</h3>
                  <p className="text-sm text-muted-foreground">
                    Your account has been created successfully
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-1" />
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="mt-1">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-yellow-600">2</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Admin Review</h3>
                  <p className="text-sm text-muted-foreground">
                    Our team is reviewing your application (typically 24-48 hours)
                  </p>
                </div>
                <Clock className="h-5 w-5 text-yellow-500 mt-1 animate-pulse" />
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 opacity-50">
                <div className="mt-1">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-semibold text-muted-foreground">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-muted-foreground">Account Activation</h3>
                  <p className="text-sm text-muted-foreground">
                    You'll receive an email once your account is approved
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What Happens Next Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What Happens Next?</CardTitle>
            <CardDescription>Here's what to expect during the review process</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Email Notification</h3>
                  <p className="text-sm text-muted-foreground">
                    You'll receive an email at{' '}
                    <span className="font-medium">{user?.email}</span>{' '}
                    once your account has been reviewed.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Contact Information</h3>
                  <p className="text-sm text-muted-foreground">
                    If you have questions or need to update your application, please contact us at:
                  </p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm">
                      <strong>Phone:</strong>{' '}
                      <a href="tel:+14046271015" className="text-primary hover:underline">
                        +1 404-627-1015
                      </a>
                    </p>
                    <p className="text-sm">
                      <strong>Email:</strong>{' '}
                      <a
                        href="mailto:taxgenius.tax@gmail.com"
                        className="text-primary hover:underline"
                      >
                        taxgenius.tax@gmail.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Account Activation</h3>
                  <p className="text-sm text-muted-foreground">
                    Once approved, your account will be activated and you'll gain access to:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                    <li>Full dashboard access</li>
                    <li>Tax preparation services</li>
                    <li>Referral tracking (if applicable)</li>
                    <li>Direct messaging with tax preparers</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => router.push('/')}>
            Return to Homepage
          </Button>
          <Button onClick={() => window.location.reload()}>Check Status</Button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Account created on{' '}
          {new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}
