import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Package,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Truck,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Printer,
  Download,
  MessageSquare,
  XCircle,
  RefreshCw,
  CreditCard,
  Edit,
  ChevronRight,
  Eye,
  Factory,
  UserCheck,
} from 'lucide-react'
import { VendorAssignment } from '@/components/admin/vendor-assignment'
import { OrderFilesManager } from '@/components/admin/files/order-files-manager'
import { CollapsibleSection } from '@/components/admin/collapsible-section'
import { EditableTracking } from '@/components/admin/orders/editable-tracking'
import { EditableOrderStatus } from '@/components/admin/orders/editable-order-status'
import { CustomerUploadsGallery } from '@/components/admin/orders/customer-uploads-gallery'
import { PrintOrderButton } from '@/components/admin/orders/print-order-button'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      User: true,
      Vendor: true,
      OrderItem: {
        include: {
          PaperStock: true,
          OrderItemAddOn: {
            include: {
              AddOn: true,
            },
          },
        },
      },
    },
  })

  // Fetch airport if selectedAirportId exists
  let airport = null
  if (order?.selectedAirportId) {
    airport = await prisma.airport.findUnique({
      where: { id: order.selectedAirportId },
    })
  }

  // Attach airport to order
  ;(order as any).Airport = airport

  // Get product category vendors for automatic assignment
  if (order && order.OrderItem.length > 0) {
    const productSkus = order.OrderItem.map((item) => item.productSku)
    const products = await prisma.product.findMany({
      where: {
        sku: { in: productSkus },
      },
      select: {
        sku: true,
        ProductCategory: {
          select: {
            vendorId: true,
            Vendor: {
              select: {
                id: true,
                name: true,
                contactEmail: true,
                phone: true,
                turnaroundDays: true,
                supportedCarriers: true,
              },
            },
          },
        },
      },
    })

    // Attach category vendor info to order
    ;(order as any).categoryVendors = products
      .filter((p) => p.ProductCategory?.Vendor)
      .map((p) => p.ProductCategory?.Vendor)
  }

  return order
}

async function getVendors() {
  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
  return vendors
}

const statusConfig: Record<string, { label: string; color: string; icon: any; next?: string[] }> = {
  PENDING_PAYMENT: {
    label: 'Pending Payment',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    icon: Clock,
    next: ['PAID', 'CANCELLED'],
  },
  PAID: {
    label: 'Paid',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    icon: DollarSign,
    next: ['PROCESSING', 'REFUNDED'],
  },
  PROCESSING: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    icon: Package,
    next: ['PRINTING', 'CANCELLED'],
  },
  PRINTING: {
    label: 'Printing',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    icon: Printer,
    next: ['QUALITY_CHECK', 'PROCESSING'],
  },
  QUALITY_CHECK: {
    label: 'Quality Check',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    icon: CheckCircle,
    next: ['PACKAGING', 'PRINTING'],
  },
  PACKAGING: {
    label: 'Packaging',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    icon: Package,
    next: ['SHIPPED'],
  },
  SHIPPED: {
    label: 'Shipped',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
    icon: Truck,
    next: ['DELIVERED'],
  },
  DELIVERED: {
    label: 'Delivered',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    icon: CheckCircle,
    next: [],
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    icon: XCircle,
    next: [],
  },
  REFUNDED: {
    label: 'Refunded',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    icon: AlertCircle,
    next: [],
  },
}

// Generate order timeline based on order status
function getOrderTimeline(order: any) {
  const timeline: any[] = []
  const currentStatus = order.status

  // Always show order placed
  timeline.push({
    status: 'Order Placed',
    date: order.createdAt,
    description: `Order ${order.orderNumber} was placed`,
    icon: Package,
    completed: true,
  })

  // Payment status
  if (order.status !== 'PENDING_PAYMENT') {
    timeline.push({
      status: 'Payment Received',
      date: order.createdAt, // In real app, would have separate payment date
      description: 'Payment was successfully processed',
      icon: DollarSign,
      completed: true,
    })
  }

  // Add current status if beyond payment
  const statusFlow = [
    'PROCESSING',
    'PRINTING',
    'QUALITY_CHECK',
    'PACKAGING',
    'SHIPPED',
    'DELIVERED',
  ]
  const currentIndex = statusFlow.indexOf(currentStatus)

  if (currentIndex >= 0) {
    statusFlow.slice(0, currentIndex + 1).forEach((status, index) => {
      const config = statusConfig[status]
      timeline.push({
        status: config.label,
        date: order.updatedAt, // In real app, would track each status change
        description: `Order is ${config.label.toLowerCase()}`,
        icon: config.icon,
        completed: index < currentIndex || status === currentStatus,
      })
    })
  }

  // Handle cancelled/refunded
  if (currentStatus === 'CANCELLED' || currentStatus === 'REFUNDED') {
    const config = statusConfig[currentStatus]
    timeline.push({
      status: config.label,
      date: order.updatedAt,
      description: `Order was ${config.label.toLowerCase()}`,
      icon: config.icon,
      completed: true,
    })
  }

  return timeline
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [order, vendors] = await Promise.all([getOrder(id), getVendors()])

  if (!order) {
    notFound()
  }

  const status = statusConfig[order.status] || statusConfig.PENDING_PAYMENT
  const StatusIcon = status.icon
  const timeline = getOrderTimeline(order)
  const shippingAddress = order.shippingAddress as any
  const billingAddress = order.billingAddress as any

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            href="/admin/orders"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order {order.orderNumber}</h1>
            <p className="text-muted-foreground">
              Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <a
              href={`/api/admin/orders/${order.id}/invoice`}
              download
              title="Download order invoice"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </a>
          </Button>
          <PrintOrderButton />
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/orders/${order.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Order
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {order.status === 'PENDING_PAYMENT' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This order is awaiting payment. The customer has been notified to complete payment.
          </AlertDescription>
        </Alert>
      )}

      {/* Customer Uploaded Files - Prominent Display */}
      <CustomerUploadsGallery orderId={order.id} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <CollapsibleSection
            defaultOpen={true}
            description="Products in this order"
            icon={<Package className="h-5 w-5" />}
            title="Order Items"
          >
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Configuration</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.OrderItem.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName || 'Product Deleted'}</p>
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.productSku || 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.options ? (
                          <div className="text-sm">
                            {Object.entries(item.options as any).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </span>{' '}
                                {String(value)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Standard</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${(item.price / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${((item.price * item.quantity) / 100).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Order Totals */}
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${(order.subtotal / 100).toFixed(2)}</span>
                </div>
                {order.shipping > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>${(order.shipping / 100).toFixed(2)}</span>
                  </div>
                )}
                {order.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${(order.tax / 100).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>${(order.total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Customer Information */}
          <CollapsibleSection
            defaultOpen={true}
            icon={<User className="h-5 w-5" />}
            title="Customer Information"
          >
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Customer</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{order.User?.name || 'Guest Customer'}</span>
                  </div>
                  {order.User && (
                    <Link
                      className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors mt-2"
                      href={`/admin/customers/${order.User.id}`}
                    >
                      View Profile
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Link>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Contact & Payment
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{order.User?.email || 'No email'}</span>
                    </div>
                    {shippingAddress?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{shippingAddress.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Payment: Credit Card
                        {order.status === 'PENDING_PAYMENT' ? (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="default" className="ml-2 text-xs">
                            Paid
                          </Badge>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Shipping Address
                  </p>
                  {shippingAddress ? (
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{shippingAddress.name}</p>
                      <p>{shippingAddress.street}</p>
                      <p>
                        {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
                      </p>
                      <p>{shippingAddress.country}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No shipping address</p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    <CreditCard className="inline h-4 w-4 mr-1" />
                    Billing Address
                  </p>
                  {billingAddress ? (
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{billingAddress.name}</p>
                      <p>{billingAddress.street}</p>
                      <p>
                        {billingAddress.city}, {billingAddress.state} {billingAddress.zipCode}
                      </p>
                      <p>{billingAddress.country}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Same as shipping address</p>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Order Files */}
          <OrderFilesManager orderId={order.id} />

          {/* Order Notes */}
          {order.adminNotes && (
            <CollapsibleSection
              defaultOpen={true}
              icon={<MessageSquare className="h-5 w-5" />}
              title="Admin Notes"
            >
              <p className="text-sm">{order.adminNotes}</p>
            </CollapsibleSection>
          )}
        </div>

        {/* Right Column - Status and Timeline */}
        <div className="space-y-6">
          {/* Order Status & Timeline */}
          <CollapsibleSection
            defaultOpen={true}
            icon={<CheckCircle className="h-5 w-5" />}
            title="Order Status & Timeline"
          >
            <div className="space-y-6">
              {/* Editable Status */}
              <EditableOrderStatus orderId={order.id} currentStatus={order.status} />

              {/* Timeline */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Order Timeline</h4>
                {timeline.map((event, index) => {
                  const EventIcon = event.icon
                  return (
                    <div key={index} className="flex gap-3">
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`rounded-full p-2 ${
                            event.completed
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <EventIcon className="h-4 w-4" />
                        </div>
                        {index < timeline.length - 1 && (
                          <div
                            className={`w-0.5 h-16 mt-2 ${
                              event.completed ? 'bg-primary' : 'bg-muted'
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-medium text-sm">{event.status}</p>
                        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(event.date).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CollapsibleSection>

          {/* Vendor Assignment */}
          <CollapsibleSection
            defaultOpen={true}
            icon={<Factory className="h-5 w-5" />}
            title="Vendor Assignment"
          >
            <VendorAssignment order={order} vendors={vendors} />
          </CollapsibleSection>

          {/* Shipping & Tracking Information */}
          <CollapsibleSection
            defaultOpen={true}
            icon={<Truck className="h-5 w-5" />}
            title="Shipping & Tracking"
          >
            <div className="space-y-4">
              {/* Shipping Method - Prominent Display */}
              {order.shippingMethod && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Shipping Method</p>
                  <p className="text-base font-semibold text-primary">{order.shippingMethod}</p>
                </div>
              )}

              {/* Carrier */}
              {order.carrier && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Carrier</span>
                  <span className="text-sm font-medium">{order.carrier}</span>
                </div>
              )}

              {/* Airport Pickup Location */}
              {(order as any).Airport && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Airport Pickup Location</span>
                    </div>
                    <div className="pl-6 space-y-1">
                      <p className="text-sm font-medium">
                        {(order as any).Airport.name} ({(order as any).Airport.code})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(order as any).Airport.city}, {(order as any).Airport.state}
                      </p>
                      {(order as any).Airport.address && (
                        <p className="text-xs text-muted-foreground">
                          {(order as any).Airport.address}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Editable Tracking Number */}
              <EditableTracking
                carrier={order.carrier}
                initialTrackingNumber={order.trackingNumber}
                orderId={order.id}
              />
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  )
}
