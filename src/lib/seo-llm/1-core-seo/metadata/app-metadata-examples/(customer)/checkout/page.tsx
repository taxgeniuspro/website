'use client'

import { useState } from 'react'
import { ShoppingBag, Trash2, ArrowRight, Upload, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/contexts/cart-context'
import { CartItemImages } from '@/components/cart/cart-item-images'
import { FileThumbnails } from '@/components/product/FileThumbnails'
import { ArtworkUpload } from '@/components/product/ArtworkUpload'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from '@/lib/toast'

interface UploadedFile {
  id: string
  file: File
  preview?: string
  status: 'uploading' | 'success' | 'error'
  progress?: number
  url?: string
}

export default function CartPage() {
  const router = useRouter()
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    itemCount,
    subtotal,
    tax,
    shipping,
    total,
  } = useCart()

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const handleFilesChange = (files: UploadedFile[]) => {
    setUploadedFiles(files)
    // Store in sessionStorage for checkout
    sessionStorage.setItem('cart_artwork_files', JSON.stringify(files))
  }

  const handleContinueToPayment = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    // Store cart data in session storage for payment page
    const checkoutData = {
      items,
      subtotal,
      tax,
      shipping,
      total,
    }
    sessionStorage.setItem('checkout_cart_data', JSON.stringify(checkoutData))

    // Store uploaded files
    if (uploadedFiles.length > 0) {
      sessionStorage.setItem('cart_artwork_files', JSON.stringify(uploadedFiles))
    }

    // Navigate to payment page
    router.push('/checkout/payment')
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground" />
          <h1 className="text-3xl font-bold">Your cart is empty</h1>
          <p className="text-lg text-muted-foreground">
            Add products to your cart to see them here
          </p>
          <Button asChild size="lg">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShoppingBag className="h-8 w-8" />
              Checkout
            </h1>
            <p className="text-muted-foreground mt-1">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in your order
            </p>
          </div>
          {items.length > 0 && (
            <Button variant="outline" onClick={clearCart}>
              Clear All
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Cart Items & Upload */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cart Items */}
            <Card>
              <CardHeader>
                <CardTitle>Cart Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex gap-4">
                      <CartItemImages item={item} />
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold">{item.productName}</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {item.options.size && <p>Size: {item.options.size}</p>}
                          {item.options.paperStock && <p>Paper: {item.options.paperStock}</p>}
                          {item.options.coating && <p>Coating: {item.options.coating}</p>}
                          {item.options.sides && <p>Sides: {item.options.sides}</p>}
                          {item.options.turnaround && <p>Turnaround: {item.options.turnaround}</p>}
                        </div>
                        {/* Artwork Files */}
                        {item.artworkFiles && item.artworkFiles.length > 0 && (
                          <div className="mt-2">
                            <FileThumbnails files={item.artworkFiles} maxDisplay={3} size="sm" />
                          </div>
                        )}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                        {item.productSlug && (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/products/${item.productSlug}`}>
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Link>
                          </Button>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">${item.subtotal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Artwork Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Your Artwork Files
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload your print-ready files here. Accepted formats: PDF, JPG, PNG, AI, EPS, SVG
                </p>
              </CardHeader>
              <CardContent>
                <ArtworkUpload maxFiles={10} maxSizeMB={50} onFilesChange={handleFilesChange} />

                {/* File Preview/Thumbnails */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-green-600 mb-3">
                      ✓ {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted border-2 border-green-200">
                            {file.preview ? (
                              <img
                                alt={file.file.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                src={file.preview}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-center mt-1 truncate">{file.file.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3">
                  Note: You can also upload files after checkout if needed.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (estimated)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Shipping will be calculated at checkout
                  </p>
                </div>

                {/* Continue to Payment Button */}
                <Button className="w-full" size="lg" onClick={handleContinueToPayment}>
                  Continue to Payment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                {/* Continue Shopping */}
                <Button asChild className="w-full" variant="outline">
                  <Link href="/products">Continue Shopping</Link>
                </Button>

                {/* Trust Badge */}
                <div className="text-center pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    🔒 Secure checkout powered by Square
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
