'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SentryExamplePage() {
  const triggerError = () => {
    // This will trigger a Sentry error
    // @ts-ignore - Intentionally calling undefined function
    myUndefinedFunction()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>🎯 Sentry Test Page</CardTitle>
          <CardDescription>
            Click the button below to trigger a test error and verify Sentry is working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={triggerError} size="lg" className="w-full">
            🚨 Trigger Test Error
          </Button>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>What happens when you click:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>A JavaScript error will be thrown</li>
              <li>Sentry will catch and report it</li>
              <li>Check your Sentry dashboard at sentry.io</li>
              <li>You'll see the error in "Issues" tab</li>
            </ol>
          </div>

          <div className="pt-4 border-t">
            <a
              href="https://sentry.io/organizations/gangrunprintingcom/projects/javascript-nextjs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              → Open Your Sentry Dashboard
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
