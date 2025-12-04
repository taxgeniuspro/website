/**
 * Public Invoice View API
 *
 * GET /api/invoices/[invoiceId]
 *
 * Allows customers to view invoice details without authentication
 * Tracks first view timestamp
 */

import { type NextRequest, NextResponse } from 'next/server'
import { getInvoiceByInvoiceId, trackInvoiceView } from '@/lib/services/invoice-service'

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params

    // Validate invoice ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!uuidRegex.test(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 })
    }

    // Get invoice details
    const invoice = await getInvoiceByInvoiceId(invoiceId)

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Track invoice view (only records first view)
    await trackInvoiceView(invoiceId)

    // Return invoice details
    return NextResponse.json({
      success: true,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice.invoiceId,
        status: invoice.status,
        order: {
          orderNumber: invoice.order.orderNumber,
          items: invoice.order.items,
          subtotal: invoice.order.subtotal,
          tax: invoice.order.tax,
          shipping: invoice.order.shipping,
          total: invoice.order.total,
          shippingAddress: invoice.order.shippingAddress,
        },
        customer: {
          name: invoice.order.customer.name,
          email: invoice.order.customer.email,
        },
        paymentDueDate: invoice.paymentDueDate,
        paymentLink: invoice.paymentLink,
      },
    })
  } catch (error) {
    console.error('Error retrieving invoice:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve invoice',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
