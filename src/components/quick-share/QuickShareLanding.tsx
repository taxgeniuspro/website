'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShareButton } from '@/components/mobile-hub/ShareButton';
import { Home, LayoutDashboard, FileText, Users } from 'lucide-react';
import { UserRole } from '@/lib/permissions';

interface QuickShareLandingProps {
  userId: string;
  role: UserRole;
  firstName?: string;
}

export function QuickShareLanding({ userId, role, firstName }: QuickShareLandingProps) {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://taxgeniuspro.tax';

  // Get role-specific dashboard route
  const getDashboardRoute = () => {
    switch (role) {
      case 'tax_preparer':
        return '/dashboard/tax-preparer';
      case 'affiliate':
        return '/dashboard/affiliate';
      case 'client':
      case 'lead':
        return '/dashboard/client';
      case 'admin':
      case 'super_admin':
        return '/dashboard/admin';
      default:
        return '/dashboard';
    }
  };

  // Render share buttons - same for all roles
  const renderShareButtons = () => {
    return (
      <>
        {/* Tax Intake Link */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Ready To Do Taxes</CardTitle>
            </div>
            <CardDescription className="text-base">
              Send to people you know are ready to do their taxes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShareButton
              title="Share Intake Form"
              description="Start your tax filing with TaxGeniusPro! Click here to begin:"
              url={`${baseUrl}/start-filing?ref=${userId}`}
              icon={<FileText className="h-5 w-5 mr-2" />}
              trackingId={`intake-${userId}`}
            />
          </CardContent>
        </Card>

        {/* Lead Form Link */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Preparing To Do Taxes</CardTitle>
            </div>
            <CardDescription className="text-base">
              Send this to people that are preparing or need to talk to someone before doing their
              taxes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShareButton
              title="Share Lead Form"
              description="Interested in professional tax services? Get a free consultation:"
              url={`${baseUrl}/contact?ref=${userId}`}
              icon={<Users className="h-5 w-5 mr-2" />}
              trackingId={`lead-${userId}`}
            />
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-8">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Welcome{firstName ? `, ${firstName}` : ''}!
        </h1>
        <p className="text-lg md:text-xl opacity-90">Start Sharing and Earn Extra Cash</p>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 mt-8 space-y-6">
        {/* Share Links Section - MOVED TO TOP */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center mb-4">Your Custom Share Links</h2>
          {renderShareButtons()}
        </div>

        {/* Navigation Buttons - MOVED BELOW SHARE LINKS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg font-semibold"
            onClick={() => router.push(getDashboardRoute())}
          >
            <LayoutDashboard className="h-6 w-6 mr-3" />
            Go to Dashboard
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg font-semibold"
            onClick={() => router.push('/')}
          >
            <Home className="h-6 w-6 mr-3" />
            Go to Home Page
          </Button>
        </div>

        {/* Bottom Message */}
        <div className="text-center mt-8 p-6 bg-muted/50 rounded-lg">
          <p className="text-lg font-medium">
            And then all you have to do is come back and watch your referrals grow.
          </p>
        </div>

        {/* Mobile Hub Link */}
        <div className="text-center mt-4">
          <Button
            variant="link"
            className="text-muted-foreground"
            onClick={() => router.push('/mobile-hub')}
          >
            View Mobile Hub →
          </Button>
        </div>
      </div>
    </div>
  );
}
