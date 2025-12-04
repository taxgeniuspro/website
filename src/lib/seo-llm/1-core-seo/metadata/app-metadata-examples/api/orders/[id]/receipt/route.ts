import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Find order by ID or order number
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        OrderItem: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Generate receipt HTML
    const receiptHtml = generateReceiptHtml(order)

    return new NextResponse(receiptHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="receipt-${order.orderNumber}.html"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate receipt' }, { status: 500 })
  }
}

function generateReceiptHtml(order: Record<string, any>): string {
  const itemsList =
    (order.OrderItem as any[])
      ?.map(
        (item: Record<string, unknown>) =>
          `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price as number).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${((item.price as number) * (item.quantity as number)).toFixed(2)}</td>
      </tr>`
      )
      ?.join('') || ''

  const shippingAddress =
    typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress)
      : order.shippingAddress

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt - ${order.orderNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .company-info {
          margin-bottom: 20px;
        }
        .order-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        .order-info div {
          flex: 1;
          min-width: 200px;
          margin-bottom: 20px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items-table th {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
        }
        .items-table td {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        .totals {
          margin-left: auto;
          width: 300px;
        }
        .totals table {
          width: 100%;
        }
        .totals td {
          padding: 5px 0;
          border-bottom: 1px solid #eee;
        }
        .total-row {
          font-weight: bold;
          font-size: 18px;
          border-top: 2px solid #333 !important;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>GangRun Printing</h1>
        <p>Professional Printing Services</p>
        <h2>Receipt</h2>
      </div>

      <div class="company-info">
        <strong>GangRun Printing</strong><br>
        Email: support@gangrunprinting.com<br>
        Phone: 1-800-PRINTING<br>
        Website: gangrunprinting.com
      </div>

      <div class="order-info">
        <div>
          <h3>Order Information</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>Payment Date:</strong> ${order.paidAt ? new Date(order.paidAt).toLocaleDateString() : 'Pending'}</p>
          <p><strong>Status:</strong> ${order.status}</p>
        </div>

        <div>
          <h3>Customer Information</h3>
          <p><strong>Email:</strong> ${order.email}</p>
          ${order.phone ? `<p><strong>Phone:</strong> ${order.phone}</p>` : ''}
        </div>

        <div>
          <h3>Shipping Address</h3>
          ${
            shippingAddress
              ? `
            <p>${shippingAddress.street || ''}</p>
            <p>${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.zipCode || ''}</p>
            <p>${shippingAddress.country || ''}</p>
          `
              : '<p>Not available</p>'
          }
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">$${(order.subtotal as number).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Tax:</td>
            <td style="text-align: right;">$${(order.tax as number).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Shipping:</td>
            <td style="text-align: right;">$${(order.shipping as number).toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td>Total:</td>
            <td style="text-align: right;">$${(order.total as number).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>This receipt was generated on ${new Date().toLocaleDateString()}</p>
        <p>For questions about this order, please contact us at support@gangrunprinting.com</p>
      </div>
    </body>
    </html>
  `
}
