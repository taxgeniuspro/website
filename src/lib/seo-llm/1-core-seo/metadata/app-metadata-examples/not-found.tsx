import Link from 'next/link'
import { ArrowLeft, Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Search className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-4xl font-bold">404</CardTitle>
          <CardDescription className="text-lg mt-2">
            Oops! The page you're looking for doesn't exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            It seems you've reached a page that doesn't exist. This could be due to a mistyped URL,
            an outdated link, or the page may have been moved or deleted.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go to Homepage
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/products">
                <Search className="mr-2 h-4 w-4" />
                Browse Products
              </Link>
            </Button>
          </div>

          <div className="pt-6 border-t">
            <h3 className="font-semibold mb-3 text-center">Quick Links</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button asChild className="justify-start" variant="ghost">
                <Link href="/about">About Us</Link>
              </Button>
              <Button asChild className="justify-start" variant="ghost">
                <Link href="/contact">Contact</Link>
              </Button>
              <Button asChild className="justify-start" variant="ghost">
                <Link href="/products">Products</Link>
              </Button>
              <Button asChild className="justify-start" variant="ghost">
                <Link href="/help">Help Center</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
