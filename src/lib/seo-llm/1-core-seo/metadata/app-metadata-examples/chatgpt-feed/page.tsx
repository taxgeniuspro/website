import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { CopyButton } from './copy-button'

export const metadata = {
  title: 'ChatGPT Shopping Feed - GangRun Printing',
  description: 'Submit GangRun Printing products to ChatGPT Shopping for AI-powered commerce',
}

export default function ChatGPTFeedPage() {
  const feedUrl = 'https://gangrunprinting.com/feeds/chatgpt-products.json'

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">🤖 ChatGPT Shopping Feed</h1>
        <p className="text-lg text-muted-foreground">
          GangRun Printing is now available on ChatGPT Shopping
        </p>
      </div>

      <Card className="mb-8 border-2 border-green-500 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📦 Product Feed URL
            <span className="ml-auto text-xs bg-green-500 text-white px-3 py-1 rounded-full">
              ACTIVE
            </span>
          </CardTitle>
          <CardDescription>Copy this URL to submit to ChatGPT Merchants Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <input
              readOnly
              className="flex-1 px-4 py-2 border rounded-lg bg-white font-mono text-sm"
              type="text"
              value={feedUrl}
            />
            <CopyButton text={feedUrl} />
          </div>

          <div className="flex gap-2">
            <Button asChild className="flex-1" variant="default">
              <a href={feedUrl} rel="noopener noreferrer" target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Feed JSON
              </a>
            </Button>
            <Button asChild className="flex-1" variant="secondary">
              <a href="https://merchants.chatgpt.com" rel="noopener noreferrer" target="_blank">
                Submit to ChatGPT
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>📋 Submission Instructions</CardTitle>
          <CardDescription>
            Follow these steps to list your products on ChatGPT Shopping
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-1">Copy Feed URL</h3>
              <p className="text-sm text-muted-foreground">
                Click the copy button above to copy the feed URL to your clipboard
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-1">Visit ChatGPT Merchants Portal</h3>
              <p className="text-sm text-muted-foreground">
                Go to{' '}
                <a
                  className="text-primary hover:underline"
                  href="https://merchants.chatgpt.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  merchants.chatgpt.com
                </a>{' '}
                and sign in with your business account
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-1">Submit Product Feed</h3>
              <p className="text-sm text-muted-foreground">
                Navigate to "Product Feeds" → "Add New Feed" and paste the feed URL
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold mb-1">Wait for Approval</h3>
              <p className="text-sm text-muted-foreground">
                OpenAI will review your feed (typically 1-3 business days). You'll receive an email
                when approved.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ℹ️ Feed Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="font-medium">Feed Format:</span>
            <span className="text-muted-foreground">OpenAI Shopping Feed Specification v1.0</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="font-medium">Update Frequency:</span>
            <span className="text-muted-foreground">Every 15 minutes (automated)</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="font-medium">Products Included:</span>
            <span className="text-muted-foreground">Active products with images and pricing</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-medium">Content-Type:</span>
            <span className="text-muted-foreground">application/json; charset=UTF-8</span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          Need help?{' '}
          <a className="text-primary hover:underline" href="mailto:support@gangrunprinting.com">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  )
}
