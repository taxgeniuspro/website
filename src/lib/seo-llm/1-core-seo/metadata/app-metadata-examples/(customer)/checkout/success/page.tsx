'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import {
  CheckCircle,
  Download,
  Mail,
  Package,
  Truck,
  Clock,
  MapPin,
  User,
  ImageIcon,
  Printer,
  FileText,
  Copy,
  Share2,
  MessageSquare,
  CheckCircle2,
  Check,
  Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import toast from '@/lib/toast'

interface ProductOptions {
  size?: string
  paperStock?: string
  coating?: string
  sides?: string
  turnaround?: string
  [key: string]: string | undefined
}

interface OrderItem {
  productName: string
  quantity: number
  price: number
  options?: ProductOptions
  fileUrl?: string
  fileName?: string
}

interface UploadedImage {
  id: string
  url: string
  thumbnailUrl?: string
  fileName: string
  fileSize?: number
  uploadedAt?: string
}

interface OrderInfo {
  orderNumber: string
  orderId?: string
  total: number
  subtotal: number
  tax: number
  shipping: number
  items: OrderItem[]
  uploadedImages?: UploadedImage[]
  customerInfo?: {
    email: string
    firstName: string
    lastName: string
    phone?: string
  }
  shippingAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  status?: string
  createdAt?: string
  paidAt?: string
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        // First try to get order info from session storage
        const storedOrder = sessionStorage.getItem('lastOrder')
        if (storedOrder) {
          const orderData = JSON.parse(storedOrder)
          setOrderInfo(orderData)
          sessionStorage.removeItem('lastOrder')
          setIsLoading(false)
          return
        }

        // Fallback to query params and API call
        const orderNumber = searchParams.get('order') || searchParams.get('orderNumber')
        if (orderNumber) {
          const response = await fetch(`/api/orders/${orderNumber}/public`)
          if (response.ok) {
            const orderData = await response.json()
            setOrderInfo(orderData)
          } else {
            // Minimal fallback data
            setOrderInfo({
              orderNumber,
              total: 0,
              subtotal: 0,
              tax: 0,
              shipping: 0,
              items: [],
            })
          }
        }
      } catch {
        // Silently handle error - fallback to minimal order display
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrderData()
  }, [searchParams])

  const orderNumber = orderInfo?.orderNumber || searchParams.get('order') || 'ORD-XXXXXX'

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Success Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold mb-3">Thank You for Your Order!</h1>
            <p className="text-lg text-gray-600 mb-8">
              Your order has been successfully placed and will be processed shortly.
            </p>

            {/* Order Number Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 max-w-md mx-auto shadow-lg">
              <p className="text-sm opacity-90 mb-2">Order Confirmation Number</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-3xl font-bold font-mono">{orderNumber}</p>
                <Button
                  className="text-white hover:bg-white/20"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(orderNumber)
                    toast.success('Order number copied!')
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {orderInfo?.createdAt && (
                <p className="text-sm opacity-75 mt-3">
                  {new Date(orderInfo.createdAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items Card */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {orderInfo?.items && orderInfo.items.length > 0 ? (
                    <>
                      {orderInfo.items.map((item, index) => (
                        <div key={index} className="border-b border-border/50 pb-4 last:border-b-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                              {item.options && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.options.size && <span>Size: {item.options.size}</span>}
                                  {item.options.size && item.options.paperStock && <span> • </span>}
                                  {item.options.paperStock && (
                                    <span>Paper: {item.options.paperStock}</span>
                                  )}
                                  {item.options.coating && (
                                    <span> • Coating: {item.options.coating}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="font-medium">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>

                          {/* Display uploaded images as thumbnails */}
                          {orderInfo.uploadedImages && orderInfo.uploadedImages.length > 0 && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                <ImageIcon className="h-4 w-4" />
                                Uploaded Design Files
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {orderInfo.uploadedImages.slice(0, 4).map((img) => (
                                  <div
                                    key={img.id}
                                    className="relative aspect-square rounded border bg-white overflow-hidden"
                                  >
                                    <Image
                                      fill
                                      alt={img.fileName}
                                      className="object-contain p-1"
                                      src={img.thumbnailUrl || img.url}
                                    />
                                  </div>
                                ))}
                                {orderInfo.uploadedImages.length > 4 && (
                                  <div className="flex items-center justify-center bg-muted rounded border">
                                    <span className="text-xs text-muted-foreground">
                                      +{orderInfo.uploadedImages.length - 4}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 space-y-1">
                                {orderInfo.uploadedImages.map((img) => (
                                  <p
                                    key={img.id}
                                    className="text-xs text-muted-foreground truncate"
                                  >
                                    • {img.fileName}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fallback for file name if no uploaded images */}
                          {(!orderInfo.uploadedImages || orderInfo.uploadedImages.length === 0) &&
                            item.fileName && (
                              <div className="mt-2 p-2 bg-muted/50 rounded">
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <ImageIcon className="h-3 w-3" />
                                  Design File: {item.fileName}
                                </p>
                              </div>
                            )}
                        </div>
                      ))}
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${orderInfo.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax</span>
                          <span>${orderInfo.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shipping</span>
                          <span>${orderInfo.shipping.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total</span>
                          <span>${orderInfo.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Order details not available</p>
                  )}
                </CardContent>
              </Card>

              {/* Timeline / Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Order Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                          <Check className="h-5 w-5" />
                        </div>
                        <div className="w-0.5 h-16 bg-gray-300 mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">Order Placed</p>
                        <p className="text-sm text-gray-600">Your order has been received</p>
                        <p className="text-xs text-gray-500 mt-1">Just now</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="w-0.5 h-16 bg-gray-300 mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-500">Design Review</p>
                        <p className="text-sm text-gray-500">Our team will review your files</p>
                        <p className="text-xs text-gray-500 mt-1">Within 24 hours</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <Printer className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="w-0.5 h-16 bg-gray-300 mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-500">Production</p>
                        <p className="text-sm text-gray-500">Your order will be printed</p>
                        <p className="text-xs text-gray-500 mt-1">2-3 business days</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <Truck className="h-5 w-5 text-gray-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-500">Shipped</p>
                        <p className="text-sm text-gray-500">On the way to you</p>
                        <p className="text-xs text-gray-500 mt-1">Estimated delivery in 3-5 days</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {orderInfo?.customerInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium">
                        {orderInfo.customerInfo.firstName} {orderInfo.customerInfo.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {orderInfo.customerInfo.email}
                      </p>
                      {orderInfo.customerInfo.phone && (
                        <p className="text-sm text-muted-foreground">
                          {orderInfo.customerInfo.phone}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {orderInfo?.shippingAddress && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <p>{orderInfo.shippingAddress.street}</p>
                      <p>
                        {orderInfo.shippingAddress.city}, {orderInfo.shippingAddress.state}{' '}
                        {orderInfo.shippingAddress.zipCode}
                      </p>
                      <p>{orderInfo.shippingAddress.country}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Next Steps Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Order Confirmation</p>
                        <p className="text-xs text-gray-500">
                          Sent to {orderInfo?.customerInfo?.email || 'your email'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Design Review Update</p>
                        <p className="text-xs text-gray-500">Within 24 hours</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Production Started</p>
                        <p className="text-xs text-gray-500">When printing begins</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Tracking Information</p>
                        <p className="text-xs text-gray-500">When order ships</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full justify-start"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (orderInfo?.orderNumber) {
                        window.open(`/api/orders/${orderInfo.orderNumber}/receipt`, '_blank')
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Receipt
                  </Button>
                  <Button className="w-full justify-start" size="sm" variant="outline">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Order Details
                  </Button>
                  <Button className="w-full justify-start" size="sm" variant="outline">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Order
                  </Button>
                  <Button className="w-full justify-start" size="sm" variant="outline">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="font-semibold mb-2">What would you like to do next?</h3>
                <p className="text-sm text-gray-600">
                  Track your order status or continue browsing our products
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/track">
                  <Button className="min-w-[160px]" size="lg">
                    <Truck className="mr-2 h-5 w-5" />
                    Track Order
                  </Button>
                </Link>
                <Link href="/products">
                  <Button className="min-w-[160px]" size="lg" variant="outline">
                    <Package className="mr-2 h-5 w-5" />
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <div className="mt-8 text-center py-8 border-t">
            <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
            <p className="text-gray-600 mb-4">
              Our support team is here to assist you with any questions about your order
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a
                className="flex items-center gap-2 text-primary hover:underline"
                href="mailto:support@gangrunprinting.com"
              >
                <Mail className="h-4 w-4" />
                support@gangrunprinting.com
              </a>
              <a
                className="flex items-center gap-2 text-primary hover:underline"
                href="tel:1-800-PRINTING"
              >
                <Phone className="h-4 w-4" />
                1-800-PRINTING
              </a>
              <button className="flex items-center gap-2 text-primary hover:underline">
                <MessageSquare className="h-4 w-4" />
                Live Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
