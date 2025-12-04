import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CustomerProofApproval } from '@/components/customer/proofs/customer-proof-approval'
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Printer,
  AlertCircle,
  MapPin,
  Calendar,
  FileText,
} from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface OrderTrackingPageProps {
  params: Promise<{
    orderNumber: string
  }>
}

const statusSteps = [
  { key: 'PENDING_PAYMENT', label: 'Payment Pending', icon: Clock },
  { key: 'PAID', label: 'Payment Received', icon: CheckCircle },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'PRINTING', label: 'In Production', icon: Printer },
  { key: 'READY_FOR_PICKUP', label: 'Ready', icon: CheckCircle },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
]

const statusConfig: Record<string, { color: string; bgColor: string }> = {
  PENDING_PAYMENT: { color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  PAID: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  PROCESSING: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  PRINTING: { color: 'text-purple-600', bgColor: 'bg-purple-100' },
  READY_FOR_PICKUP: { color: 'text-green-600', bgColor: 'bg-green-100' },
  SHIPPED: { color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  DELIVERED: { color: 'text-green-600', bgColor: 'bg-green-100' },
  CANCELLED: { color: 'text-red-600', bgColor: 'bg-red-100' },
  REFUNDED: { color: 'text-gray-600', bgColor: 'bg-gray-100' },
}

async function getOrderDetails(orderNumber: string) {
  const order = await prisma.order.findFirst({
    where: {
      orderNumber: orderNumber.toUpperCase(),
    },
    include: {
      OrderItem: true,
      StatusHistory: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      OrderFile: {
        where: {
          fileType: 'ADMIN_PROOF',
          isVisible: true,
        },
      },
    },
  })

  return order
}

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { orderNumber } = await params
  const order = await getOrderDetails(orderNumber)

  if (!order) {
    notFound()
  }

  const currentStepIndex = statusSteps.findIndex((step) => step.key === order.status)
  const config = statusConfig[order.status] || { color: 'text-gray-600', bgColor: 'bg-gray-100' }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
        <p className="text-muted-foreground">Order #{order.orderNumber}</p>
      </div>

      {/* Current Status Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Status</CardTitle>
              <CardDescription>
                Last updated: {new Date(order.updatedAt).toLocaleString()}
              </CardDescription>
            </div>
            <Badge className={`${config.bgColor} ${config.color} border-0`}>
              {order.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Steps */}
          <div className="relative">
            <div className="absolute left-0 top-5 w-full h-0.5 bg-gray-200">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
              />
            </div>

            <div className="relative flex justify-between">
              {statusSteps.map((step, index) => {
                const Icon = step.icon
                const isActive = index <= currentStepIndex
                const isCurrent = step.key === order.status

                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isActive ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-400'}
                      ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                      transition-all duration-300
                    `}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`
                      mt-2 text-xs text-center max-w-[80px]
                      ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}
                    `}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tracking Information */}
          {order.trackingNumber && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4" />
                <span className="font-medium">Tracking Number:</span>
              </div>
              <p className="font-mono text-sm">{order.trackingNumber}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proof Approval Section */}
      <CustomerProofApproval orderId={order.id} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Date:</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items:</span>
              <span>{order.OrderItem.length} product(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-semibold">${(order.total / 100).toFixed(2)}</span>
            </div>
            {(order as any).estimatedDelivery && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. Delivery:</span>
                <span>{new Date((order as any).estimatedDelivery).toLocaleDateString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.shippingAddress ? (
              <div className="space-y-1">
                <p>{(order.shippingAddress as any).name || order.email}</p>
                <p className="text-muted-foreground">
                  {(order.shippingAddress as any).street}
                  <br />
                  {(order.shippingAddress as any).city}, {(order.shippingAddress as any).state}{' '}
                  {(order.shippingAddress as any).zip}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No shipping address available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.OrderItem.map((item, index) => (
              <div key={item.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    {item.options && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {Object.entries(item.options as Record<string, string | number>)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(' • ')}
                      </p>
                    )}
                    <p className="text-sm mt-1">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ${((item.price * item.quantity) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Order Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${(order.subtotal / 100).toFixed(2)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>${(order.tax / 100).toFixed(2)}</span>
              </div>
            )}
            {order.shipping > 0 && (
              <div className="flex justify-between text-sm">
                <span>Shipping:</span>
                <span>${(order.shipping / 100).toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span>${(order.total / 100).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status History */}
      {order.StatusHistory.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Status History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.StatusHistory.map((history, index) => (
                <div key={history.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  <div className="flex-1">
                    <p className="font-medium">{history.toStatus.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(history.createdAt).toLocaleString()}
                    </p>
                    {history.notes && <p className="text-sm mt-1">{history.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="mt-6 bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If you have any questions about your order, please don't hesitate to contact us.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Email:</strong> support@gangrunprinting.com
            </p>
            <p>
              <strong>Phone:</strong> (123) 456-7890
            </p>
            <p>
              <strong>Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM CST
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
