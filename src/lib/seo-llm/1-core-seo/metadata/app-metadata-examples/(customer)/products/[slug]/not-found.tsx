import Link from 'next/link'
import { ArrowLeft, Search, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProductNotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">Product Not Found</CardTitle>
          <CardDescription className="text-lg mt-2">
            Sorry, we couldn't find the product you're looking for. It may have been removed or the
            link might be incorrect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/products">
                <Search className="mr-2 h-4 w-4" />
                Browse Products
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>

          <div className="pt-6 border-t">
            <h3 className="font-semibold mb-3 text-center">Popular Categories</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button asChild className="justify-start" variant="ghost">
                <Link href="/products?category=business-cards">Business Cards</Link>
              </Button>
              <Button asChild className="justify-start" variant="ghost">
                <Link href="/products?category=flyers">Flyers</Link>
              </Button>
              <Button asChild className="justify-start" variant="ghost">
                <Link href="/products?category=posters">Posters</Link>
              </Button>
              <Button asChild className="justify-start" variant="ghost">
                <Link href="/products?category=banners">Banners</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
