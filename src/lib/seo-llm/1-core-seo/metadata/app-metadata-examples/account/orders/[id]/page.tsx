'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Package,
  Download,
  Mail,
  Printer,
  Copy,
  Share2,
  Plane,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { format } from '@/lib/date'
import { TrackingButton, TrackingLink } from '@/components/tracking/tracking-button'
import { formatTrackingNumber, getCarrierName } from '@/lib/tracking'
import toast from '@/lib/toast'
import { CustomerOrderFiles } from '@/components/customer/order-files'

interface OrderDetail {
  id: string
  orderNumber: string
  referenceNumber?: string
  status: string
  total: number
  subtotal: number
  tax: number
  shipping: number
  shippingMethod?: string
  shippingRate?: Record<string, unknown>
  selectedAirportId?: string
  selectedAirport?: {
    id: string
    code: string
    name: string
    address: string
    city: string
    state: string
    zip: string
    hours: Record<string, unknown>
    operator?: string
  }
  trackingNumber?: string
  carrier?: Record<string, unknown>
  createdAt: string
  paidAt?: string
  shippingAddress: Record<string, unknown>
  billingAddress?: Record<string, unknown>
  OrderItem: Array<{
    id: string
    productName: string
    productSku: string
    quantity: number
    price: number
    options?: Record<string, unknown>
  }>
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrderDetails()
  }, [resolvedParams.id])

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`/api/orders/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      } else {
        toast.error('Failed to load order details')
        router.push('/account/orders')
      }
    } catch (error) {
      toast.error('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const handleShareTracking = () => {
    if (order?.trackingNumber && order?.carrier) {
      const trackingUrl = `${window.location.origin}/track?carrier=${order.carrier}&tracking=${order.trackingNumber}`
      navigator.clipboard.writeText(trackingUrl)
      toast.success('Tracking link copied to clipboard!')
    }
  }

  const handleCopyTrackingNumber = () => {
    if (order?.trackingNumber && order?.carrier) {
      const formattedNumber = formatTrackingNumber(order.carrier, order.trackingNumber)
      navigator.clipboard.writeText(formattedNumber)
      toast.success('Tracking number copied!')
    }
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      PRODUCTION: 'bg-indigo-100 text-indigo-800',
      SHIPPED: 'bg-green-100 text-green-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-48 mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Order not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6"
        href="/account/orders"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Orders
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Order {order.referenceNumber || order.orderNumber}
          </h1>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(order.status)}>
              {order.status.replace(/_/g, ' ')}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Placed on {format(new Date(order.createdAt), 'MMMM dd, yyyy')}
            </span>
          </div>
        </div>
        <div className="space-x-2">
          <Button size="sm" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Invoice
          </Button>
          <Button size="sm" variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Tracking Information */}
      {order.trackingNumber && order.carrier && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Tracking Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Carrier</p>
                <p className="font-semibold">{getCarrierName(order.carrier)}</p>
                <p className="text-sm text-muted-foreground mt-2 mb-1">Tracking Number</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-semibold">
                    {formatTrackingNumber(order.carrier, order.trackingNumber)}
                  </p>
                  <Button
                    className="h-8 w-8"
                    size="icon"
                    variant="ghost"
                    onClick={handleCopyTrackingNumber}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <TrackingButton
                  carrier={order.carrier}
                  size="lg"
                  trackingNumber={order.trackingNumber}
                />
                <Button
                  className="w-full"
                  size="sm"
                  variant="outline"
                  onClick={handleShareTracking}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Tracking
                </Button>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="text-sm text-muted-foreground">
              <p>You can also track your package directly at:</p>
              <TrackingLink
                carrier={order.carrier}
                className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                showNumber={false}
                trackingNumber={order.trackingNumber}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Airport Pickup Information */}
      {order.selectedAirport && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Airport Pickup Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg">
                  {order.selectedAirport.name} ({order.selectedAirport.code})
                </h4>
                {order.selectedAirport.operator && (
                  <p className="text-sm text-muted-foreground">
                    Operated by: {order.selectedAirport.operator}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Pickup Address</p>
                  <div className="text-sm text-muted-foreground">
                    <p>{order.selectedAirport.address}</p>
                    <p>
                      {order.selectedAirport.city}, {order.selectedAirport.state}{' '}
                      {order.selectedAirport.zip}
                    </p>
                  </div>
                </div>
              </div>

              {order.selectedAirport.hours && (
                <div>
                  <p className="font-medium mb-2">Operating Hours</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {Object.entries(order.selectedAirport.hours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between">
                        <span className="capitalize">{day}:</span>
                        <span>{typeof hours === 'string' ? hours : 'Closed'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">Important Pickup Information</p>
                <ul className="text-xs text-blue-800 mt-1 space-y-1">
                  <li>• Please bring a valid photo ID for pickup</li>
                  <li>• Packages must be picked up within 5 business days</li>
                  <li>• Contact the location directly for specific pickup instructions</li>
                  <li>• Additional storage fees may apply for extended storage</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files & Artwork */}
      <CustomerOrderFiles orderId={resolvedParams.id} />

      {/* Order Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.OrderItem.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-start pb-4 border-b last:border-0"
              >
                <div className="flex-1">
                  <h4 className="font-semibold">{item.productName}</h4>
                  <p className="text-sm text-muted-foreground">SKU: {item.productSku}</p>
                  {item.options && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {(item.options.size && <p>Size: {String(item.options.size)}</p>) as any}
                      {item.options.paperStock && <p>Paper: {String(item.options.paperStock)}</p>}
                      {item.options.coating && <p>Coating: {String(item.options.coating)}</p>}
                      {item.options.fileName && <p>File: {String(item.options.fileName)}</p>}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    ${item.price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping ({order.shippingMethod || 'Standard'})</span>
              <span>${order.shipping.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addresses */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
          </CardHeader>
          <CardContent>
            {order.shippingAddress && typeof order.shippingAddress === 'object' && (
              <div className="text-sm">
                <p>{(order.shippingAddress as any).street}</p>
                <p>
                  {(order.shippingAddress as any).city}, {(order.shippingAddress as any).state}{' '}
                  {(order.shippingAddress as any).zipCode}
                </p>
                <p>{(order.shippingAddress as any).country || 'United States'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Address</CardTitle>
          </CardHeader>
          <CardContent>
            {order.billingAddress && typeof order.billingAddress === 'object' ? (
              <div className="text-sm">
                <p>{(order.billingAddress as any).street}</p>
                <p>
                  {(order.billingAddress as any).city}, {(order.billingAddress as any).state}{' '}
                  {(order.billingAddress as any).zipCode}
                </p>
                <p>{(order.billingAddress as any).country || 'United States'}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Same as shipping address</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-between">
        <Button variant="outline">
          <Mail className="mr-2 h-4 w-4" />
          Contact Support
        </Button>
        <Button>Reorder Items</Button>
      </div>
    </div>
  )
}
