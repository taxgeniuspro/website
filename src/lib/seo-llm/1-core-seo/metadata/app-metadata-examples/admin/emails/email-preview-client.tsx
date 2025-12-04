'use client'

/**
 * Email Preview Client Component
 *
 * Interactive UI for previewing all email templates
 */

import { useState } from 'react'
import { render } from '@react-email/render'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Import all email templates
import { OrderConfirmationEmail } from '@/lib/email/templates/order-confirmation'
import { OrderInProductionEmail } from '@/lib/email/templates/order-in-production'
import { PaymentDeclinedEmail } from '@/lib/email/templates/payment-declined'
import { PaymentFailedEmail } from '@/lib/email/templates/payment-failed'
import { OrderShippedEmail } from '@/lib/email/templates/order-shipped'
import { OrderDeliveredEmail } from '@/lib/email/templates/order-delivered'
import { OrderCancelledEmail } from '@/lib/email/templates/order-cancelled'
import { OrderRefundedEmail } from '@/lib/email/templates/order-refunded'
import { OrderOnHoldEmail } from '@/lib/email/templates/order-on-hold'
import { InvoiceSentEmail } from '@/lib/email/templates/invoice-sent'

interface EmailTemplate {
  id: string
  name: string
  description: string
  category: 'payment' | 'order' | 'issues' | 'admin'
  component: any
  sampleData: any
}

const emailTemplates: EmailTemplate[] = [
  // Payment Templates
  {
    id: 'order-confirmation',
    name: 'Order Confirmation',
    description: 'Sent after successful payment',
    category: 'payment',
    component: OrderConfirmationEmail,
    sampleData: {
      orderNumber: 'ORD-2025-001234',
      customerName: 'John Smith',
      items: [
        {
          productName: 'Business Cards - Premium',
          quantity: 500,
          price: 7500,
          options: { paper: '16pt Cardstock', finish: 'Gloss UV' },
        },
        {
          productName: 'Flyers - Full Color',
          quantity: 1000,
          price: 15000,
        },
      ],
      subtotal: 22500,
      tax: 1969,
      shipping: 1500,
      total: 25969,
      shippingAddress: {
        name: 'John Smith',
        street: '123 Main Street',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75201',
      },
      estimatedDelivery: 'Friday, December 20, 2025',
      trackingUrl: 'https://gangrunprinting.com/track/ORD-2025-001234',
    },
  },
  {
    id: 'payment-declined',
    name: 'Payment Declined',
    description: 'Credit card declined by processor',
    category: 'payment',
    component: PaymentDeclinedEmail,
    sampleData: {
      orderNumber: 'ORD-2025-001235',
      customerName: 'Sarah Johnson',
      total: 15000,
      declineReason: 'Insufficient funds',
      retryPaymentUrl: 'https://gangrunprinting.com/checkout/retry/ORD-2025-001235',
    },
  },
  {
    id: 'payment-failed',
    name: 'Payment Failed',
    description: 'Technical payment processing error',
    category: 'payment',
    component: PaymentFailedEmail,
    sampleData: {
      orderNumber: 'ORD-2025-001236',
      customerName: 'Mike Chen',
      total: 28500,
      errorMessage: 'Gateway timeout - please try again',
      retryPaymentUrl: 'https://gangrunprinting.com/checkout/retry/ORD-2025-001236',
      supportUrl: 'https://gangrunprinting.com/support',
    },
  },
  // Order Progress Templates
  {
    id: 'order-in-production',
    name: 'Order In Production',
    description: 'Order entered production queue',
    category: 'order',
    component: OrderInProductionEmail,
    sampleData: {
      orderNumber: 'ORD-2025-001237',
      customerName: 'Emily Davis',
      estimatedCompletion: 'Monday, December 16, 2025',
      shippingMethod: 'Standard Shipping',
      trackingUrl: 'https://gangrunprinting.com/track/ORD-2025-001237',
    },
  },
  {
    id: 'order-shipped',
    name: 'Order Shipped',
    description: 'Order shipped with tracking',
    category: 'order',
    component: OrderShippedEmail,
    sampleData: {
      orderNumber: 'ORD-2025-001238',
      customerName: 'David Rodriguez',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'UPS',
      estimatedDelivery: 'Wednesday, December 18, 2025',
      shippingAddress: {
        name: 'David Rodriguez',
        street: '456 Oak Avenue',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
      },
      trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
    },
  },
  {
    id: 'order-delivered',
    name: 'Order Delivered',
    description: 'Successful delivery confirmation',
    category: 'order',
    component: OrderDeliveredEmail,
    sampleData: {
      orderNumber: 'ORD-2025-001239',
      customerName: 'Lisa Martinez',
      deliveredAt: 'Thursday, December 19, 2025 at 2:45 PM',
      trackingNumber: '1Z999AA10123456785',
      reviewUrl: 'https://gangrunprinting.com/review/ORD-2025-001239',
      reorderUrl: 'https://gangrunprinting.com/reorder/ORD-2025-001239',
    },
  },
  // Issue Templates
  {
    id: 'order-on-hold',
    name: 'Order On Hold',
    description: 'Action required from customer',
    category: 'issues',
    component: OrderOnHoldEmail,
    sampleData: {
      orderNumber: 'ORD-2025-001240',
      customerName: 'Robert Taylor',
      holdReason:
        'Your uploaded files are in RGB color mode instead of CMYK, which may cause color shifts in printing.',
      actionRequired:
        'Please upload new files in CMYK color mode, or reply to this email to approve printing with current files (colors may vary slightly).',
      actionUrl: 'https://gangrunprinting.com/orders/ORD-2025-001240/upload',
      urgency: 'high',
      deadline: 'Friday, December 13, 2025 at 5:00 PM CST',
      contactMethod: 'Email preferred for file uploads',
    },
  },
  {
    id: 'order-cancelled',
    name: 'Order Cancelled',
    description: 'Order cancellation confirmation',
    category: 'issues',
    component: OrderCancelledEmail,
    sampleData: {
      orderNumber: 'ORD-2025-001241',
      customerName: 'Jennifer Wilson',
      cancelledBy: 'customer',
      cancelReason: 'Customer requested cancellation before production started',
      refundAmount: 12500,
      refundMethod: 'Original payment method (Visa ending in 1234)',
      refundEta: 'Monday, December 16, 2025',
      browseProductsUrl: 'https://gangrunprinting.com/products',
    },
  },
  {
    id: 'order-refunded',
    name: 'Order Refunded',
    description: 'Refund processed confirmation',
    category: 'issues',
    component: OrderRefundedEmail,
    sampleData: {
      orderNumber: 'ORD-2025-001242',
      customerName: 'Christopher Lee',
      refundAmount: 18750,
      refundReason: 'Print quality did not meet customer expectations',
      refundMethod: 'Visa ending in 5678',
      originalPaymentMethod: 'Visa ending in 5678',
      refundDate: 'December 12, 2025',
      refundEta: 'December 17-22, 2025',
      transactionId: 'REF-2025-456789',
      browseProductsUrl: 'https://gangrunprinting.com/products',
    },
  },
  // Admin Templates
  {
    id: 'invoice-sent',
    name: 'Invoice Sent',
    description: 'Admin-created order with payment link',
    category: 'admin',
    component: InvoiceSentEmail,
    sampleData: {
      invoiceNumber: 'INV-2025-789',
      orderNumber: 'ORD-2025-001243',
      customerName: 'Corporate Client ABC',
      invoiceDate: 'December 12, 2025',
      dueDate: 'December 26, 2025',
      subtotal: 85000,
      tax: 7438,
      shipping: 2500,
      total: 94938,
      items: [
        {
          description: 'Custom Brochures - 8.5x11, Full Color, Tri-Fold',
          quantity: 5000,
          unitPrice: 12,
          total: 60000,
        },
        {
          description: 'Business Cards - 16pt, Gloss UV Coating',
          quantity: 2500,
          unitPrice: 10,
          total: 25000,
        },
      ],
      paymentUrl: 'https://gangrunprinting.com/pay/INV-2025-789',
      notes:
        'Bulk discount applied for large order volume. Rush production available upon request.',
      paymentTerms: 'Net 14 days. Late payments subject to 1.5% monthly interest.',
    },
  },
]

export default function EmailPreviewClient() {
  const [selectedEmail, setSelectedEmail] = useState<EmailTemplate | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const handlePreview = async (template: EmailTemplate) => {
    setSelectedEmail(template)
    try {
      const html = render(template.component(template.sampleData))
      setPreviewHtml(html)
    } catch (error) {
      console.error('Error rendering email:', error)
      setPreviewHtml('<p>Error rendering email template</p>')
    }
  }

  const categories = [
    { value: 'all', label: 'All Templates', count: emailTemplates.length },
    {
      value: 'payment',
      label: 'Payment Status',
      count: emailTemplates.filter((t) => t.category === 'payment').length,
    },
    {
      value: 'order',
      label: 'Order Progress',
      count: emailTemplates.filter((t) => t.category === 'order').length,
    },
    {
      value: 'issues',
      label: 'Order Issues',
      count: emailTemplates.filter((t) => t.category === 'issues').length,
    },
    {
      value: 'admin',
      label: 'Admin',
      count: emailTemplates.filter((t) => t.category === 'admin').length,
    },
  ]

  const filteredTemplates =
    selectedCategory === 'all'
      ? emailTemplates
      : emailTemplates.filter((t) => t.category === selectedCategory)

  const categoryColors: Record<string, string> = {
    payment: 'bg-green-100 text-green-800',
    order: 'bg-blue-100 text-blue-800',
    issues: 'bg-red-100 text-red-800',
    admin: 'bg-purple-100 text-purple-800',
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email Templates</h1>
        <p className="text-gray-600">Preview all transactional email templates with sample data</p>
      </div>

      {/* Category Tabs */}
      <Tabs className="mb-8" value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-5">
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} className="flex items-center gap-2" value={cat.value}>
              {cat.label}
              <Badge className="ml-1" variant="secondary">
                {cat.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Email Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge className={categoryColors[template.category]}>
                  {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                </Badge>
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => handlePreview(template)}>
                Preview Email
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmail?.name}</DialogTitle>
            <DialogDescription>{selectedEmail?.description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 border rounded-lg overflow-hidden">
            <iframe
              className="w-full min-h-[600px]"
              srcDoc={previewHtml}
              style={{ border: 'none' }}
              title="Email Preview"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Footer */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Email Template Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-3xl font-bold text-blue-600">{emailTemplates.length}</div>
            <div className="text-sm text-gray-600">Total Templates</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">
              {emailTemplates.filter((t) => t.category === 'payment').length}
            </div>
            <div className="text-sm text-gray-600">Payment Emails</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600">
              {emailTemplates.filter((t) => t.category === 'order').length}
            </div>
            <div className="text-sm text-gray-600">Order Updates</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-600">
              {emailTemplates.filter((t) => t.category === 'issues').length}
            </div>
            <div className="text-sm text-gray-600">Issue Alerts</div>
          </div>
        </div>
      </div>
    </div>
  )
}
