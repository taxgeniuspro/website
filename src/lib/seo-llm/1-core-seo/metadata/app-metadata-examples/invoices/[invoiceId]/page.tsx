import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  FileText,
  Calendar,
  DollarSign,
  Package,
  MapPin,
  Mail,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
} from 'lucide-react'
import { PayInvoiceButton } from '@/components/invoices/pay-invoice-button'

// Force dynamic rendering for real-time invoice status
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface InvoicePageProps {
  params: Promise<{ invoiceId: string }>
}

async function getInvoice(invoiceId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'
    const response = await fetch(`${baseUrl}/api/invoices/${invoiceId}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.invoice
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return null
  }
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { invoiceId } = await params
  const invoice = await getInvoice(invoiceId)

  if (!invoice) {
    notFound()
  }

  const dueDate = new Date(invoice.paymentDueDate)
  const isOverdue = dueDate < new Date() && invoice.status !== 'paid'
  const isPaid = invoice.status === 'paid'

  const statusConfig = {
    pending: {
      label: 'Payment Pending',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      icon: Clock,
    },
    viewed: {
      label: 'Viewed',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      icon: CheckCircle,
    },
    paid: {
      label: 'Paid',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      icon: CheckCircle,
    },
    overdue: {
      label: 'Overdue',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      icon: AlertCircle,
    },
  }

  const currentStatus = isOverdue ? 'overdue' : invoice.status
  const status = statusConfig[currentStatus as keyof typeof statusConfig]
  const StatusIcon = status.icon

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">GangRun Printing</h1>
          </div>
          <p className="text-xl text-muted-foreground">Invoice</p>
        </div>

        {/* Status Alert */}
        {isOverdue && !isPaid && (
          <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-400">
              This invoice is overdue. Please pay as soon as possible to avoid late fees.
            </AlertDescription>
          </Alert>
        )}

        {isPaid && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-400">
              This invoice has been paid. Thank you for your business!
            </AlertDescription>
          </Alert>
        )}

        {/* Invoice Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Invoice {invoice.invoiceNumber}</CardTitle>
                <CardDescription className="mt-1">
                  Order #{invoice.order.orderNumber}
                </CardDescription>
              </div>
              <Badge className={`${status.color} gap-1 px-3 py-1`}>
                <StatusIcon className="h-4 w-4" />
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer and Due Date */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  Bill To
                </p>
                <div className="space-y-1">
                  <p className="font-semibold text-lg">{invoice.customer.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {invoice.customer.email}
                  </p>
                </div>
              </div>
              <div className="text-right md:text-right">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Payment Due
                </p>
                <p
                  className={`font-semibold text-lg ${
                    isOverdue ? 'text-red-600 dark:text-red-400' : ''
                  }`}
                >
                  {dueDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                {isOverdue && !isPaid && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">Past due</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Shipping Address */}
            {invoice.order.shippingAddress && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Shipping Address
                </p>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>{invoice.order.shippingAddress.name}</p>
                  {invoice.order.shippingAddress.company && (
                    <p>{invoice.order.shippingAddress.company}</p>
                  )}
                  <p>{invoice.order.shippingAddress.street}</p>
                  {invoice.order.shippingAddress.street2 && (
                    <p>{invoice.order.shippingAddress.street2}</p>
                  )}
                  <p>
                    {invoice.order.shippingAddress.city}, {invoice.order.shippingAddress.state}{' '}
                    {invoice.order.shippingAddress.zipCode}
                  </p>
                  <p>{invoice.order.shippingAddress.country}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Order Items */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">
                <Package className="inline h-4 w-4 mr-1" />
                Order Items
              </p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.order.items.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            {item.options && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {Object.entries(item.options)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(', ')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${(item.price / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${(invoice.order.subtotal / 100).toFixed(2)}</span>
              </div>
              {invoice.order.shipping > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>${(invoice.order.shipping / 100).toFixed(2)}</span>
                </div>
              )}
              {invoice.order.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>${(invoice.order.tax / 100).toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium text-xl pt-2">
                <span>Total Due</span>
                <span className="text-primary">${(invoice.order.total / 100).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Button */}
            {!isPaid && (
              <>
                <Separator />
                <div className="text-center space-y-4 pt-4">
                  <PayInvoiceButton amount={invoice.order.total} invoiceId={invoiceId} />
                  <p className="text-xs text-muted-foreground">Secure payment powered by Square</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Questions? Contact us at{' '}
            <a className="text-primary hover:underline" href="mailto:billing@gangrunprinting.com">
              billing@gangrunprinting.com
            </a>
          </p>
          <p>© {new Date().getFullYear()} GangRun Printing. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
