import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      User: true,
      OrderItem: {
        include: {
          OrderItemAddOn: {
            include: {
              AddOn: true,
            },
          },
        },
      },
    },
  })

  return order
}

export default async function EditOrderPage({ params }: PageProps) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            href={`/admin/orders/${order.id}`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Order {order.orderNumber}</h1>
            <p className="text-muted-foreground">Modify order details and configuration</p>
          </div>
        </div>
      </div>

      {/* Feature Coming Soon Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Order Editing Feature Coming Soon!</strong>
          <br />
          This feature is currently in development. You'll be able to modify order details,
          add/remove items, update quantities, and change shipping information directly from this
          page.
          <br />
          <br />
          For now, please contact customer service to make changes to order {order.orderNumber}.
        </AlertDescription>
      </Alert>

      {/* Order Summary Card */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="font-medium">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{order.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{order.User?.name || 'Guest Customer'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-medium">${(order.total / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Items Count</p>
              <p className="font-medium">
                {order.OrderItem.length} item{order.OrderItem.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-medium">
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions Available Now</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              While the full editing interface is being developed, you can still:
            </p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Update order status from the main order page</li>
              <li>• Add or remove files in the Order Files section</li>
              <li>• Update tracking information</li>
              <li>• Assign vendors for production</li>
              <li>• Add admin notes and messages</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Back to Order Button */}
      <div className="flex justify-start">
        <Link
          href={`/admin/orders/${order.id}`}
          className="inline-flex items-center justify-center h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Order Details
        </Link>
      </div>
    </div>
  )
}
