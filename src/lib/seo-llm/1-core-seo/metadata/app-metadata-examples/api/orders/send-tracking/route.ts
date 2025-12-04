import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { getTrackingInfo, formatTrackingNumber, getCarrierName } from '@/lib/tracking'

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()

    // Get order details from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        OrderItem: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.trackingNumber || !order.carrier) {
      return NextResponse.json({ error: 'No tracking information available' }, { status: 400 })
    }

    const trackingInfo = getTrackingInfo(order.carrier, order.trackingNumber)
    const formattedTrackingNumber = formatTrackingNumber(order.carrier, order.trackingNumber)

    // Prepare email content
    const itemsList = order.OrderItem.map(
      (item: Record<string, unknown>) => `<li>${item.productName} - Qty: ${item.quantity}</li>`
    ).join('')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Order Has Shipped - GangRun Printing</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .logo { max-width: 200px; }
          .content { padding: 20px; }
          .tracking-info { background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
          .tracking-number { font-size: 24px; font-weight: bold; color: #1976d2; margin: 10px 0; }
          .items-list { list-style-type: none; padding: 0; }
          .items-list li { padding: 10px; border-bottom: 1px solid #eee; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #007bff;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 10px 0;
          }
          .button:hover { background-color: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚚 Your Order Has Shipped!</h1>
            <p>Great news! Your order is on its way.</p>
          </div>

          <div class="content">
            <p>Hi Valued Customer,</p>

            <p>Your order <strong>${order.referenceNumber || order.orderNumber}</strong> has been shipped and is on its way to you!</p>

            <div class="tracking-info">
              <p>Carrier: <strong>${getCarrierName(order.carrier)}</strong></p>
              <div class="tracking-number">${formattedTrackingNumber}</div>
              <a href="${trackingInfo.trackingUrl}" class="button">
                Track Your Package
              </a>
              <p style="font-size: 12px; color: #666; margin-top: 10px;">
                Click the button above to see real-time tracking updates
              </p>
            </div>

            <h3>Order Details:</h3>
            <ul class="items-list">
              ${itemsList}
            </ul>

            <h3>Shipping Address:</h3>
            <p>
              ${
                order.shippingAddress && typeof order.shippingAddress === 'object'
                  ? `
                ${(order.shippingAddress as any).street}<br>
                ${(order.shippingAddress as any).city}, ${(order.shippingAddress as any).state} ${(order.shippingAddress as any).zipCode}
              `
                  : 'Address on file'
              }
            </p>

            <h3>What to Expect:</h3>
            <ul>
              <li>You can track your package anytime using the tracking button above</li>
              <li>Estimated delivery time is based on your selected shipping method</li>
              <li>You'll receive another email once your package is delivered</li>
            </ul>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/account/orders" class="button">
                View Order Details
              </a>
            </p>

            <p>If you have any questions about your shipment, please don't hesitate to contact us at support@gangrunprinting.com or call 1-800-PRINTING.</p>

            <p>Thank you for choosing GangRun Printing!</p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} GangRun Printing. All rights reserved.</p>
            <p>
              Tracking Link: <a href="${trackingInfo.trackingUrl}">${trackingInfo.trackingUrl}</a>
            </p>
            <p>This is an automated email. Please do not reply directly to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `

    await sendEmail({
      to: order.email,
      subject: `Your Order Has Shipped - ${order.referenceNumber || order.orderNumber}`,
      text: `Your order ${order.referenceNumber || order.orderNumber} has shipped! Track your package with ${getCarrierName(order.carrier)}: ${formattedTrackingNumber}. Track at: ${trackingInfo.trackingUrl}`,
      html: emailHtml,
    })

    // Update order notification
    await prisma.notification.create({
      data: {
        id: `${orderId}-shipped-${Date.now()}`,
        orderId: order.id,
        type: 'ORDER_SHIPPED',
        sent: true,
        sentAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, message: 'Tracking email sent' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send tracking email' }, { status: 500 })
  }
}
