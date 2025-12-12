import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Global 404 page for all routes under [locale]
 * Shows helpful navigation options
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-muted rounded-full">
              <FileQuestion className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl">Page Not Found</CardTitle>
          <CardDescription className="text-lg">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Here are some helpful links to get you back on track:</p>
          </div>

          <div className="grid gap-2">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Return Home
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/start-filing/form">
                Start Your Tax Filing
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/book">
                Book an Appointment
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/contact">
                Contact Support
              </Link>
            </Button>
          </div>

          <div className="text-center">
            <button
              onClick={() => typeof window !== 'undefined' && window.history.back()}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Go back to previous page
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
