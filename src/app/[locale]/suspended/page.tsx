import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserX, LogOut, Mail } from 'lucide-react';

export const metadata = {
  title: 'Account Suspended | Tax Genius Pro',
  description: 'Your account has been suspended',
};

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <UserX className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Account Suspended</CardTitle>
          <CardDescription>Your account has been temporarily deactivated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
            <p className="text-muted-foreground">
              Your account has been suspended by an administrator. While suspended, you cannot:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Sign in to your account</li>
              <li>Access your dashboard</li>
              <li>Submit tax returns or documents</li>
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm">
            <p className="text-amber-800 dark:text-amber-200">
              If you believe this suspension is in error, please contact our support team for assistance.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button className="w-full" asChild>
              <Link href="/contact">
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/auth/signout">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Reference this page URL if contacting support about your account status.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
