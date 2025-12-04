'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[Product Page Error]:', error)
    console.error('[Product Page Error Stack]:', error.stack)
    console.error('[Product Page Error Digest]:', error.digest)

    // Report to monitoring service (if configured)
    if (typeof window !== 'undefined' && window.location) {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }
      console.error('[Product Page Error Context]:', errorInfo)
    }
  }, [error])

  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-2xl">Unable to Load Product</CardTitle>
              <CardDescription>
                We encountered an error while loading this product page.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isDevelopment && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Development Error Details</AlertTitle>
              <AlertDescription className="mt-2">
                <pre className="text-xs font-mono overflow-x-auto p-2 bg-white rounded border">
                  {error.message}
                </pre>
                {error.digest && (
                  <p className="text-xs mt-2 text-muted-foreground">Error ID: {error.digest}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>This might be happening because:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The product information is temporarily unavailable</li>
              <li>There's a connection issue with our servers</li>
              <li>The product link may be incorrect or outdated</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex items-center gap-2" onClick={reset}>
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t text-sm text-muted-foreground">
            <p>
              If this problem persists, please{' '}
              <Link className="text-primary hover:underline" href="/contact">
                contact our support team
              </Link>{' '}
              and we'll be happy to help.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
