import { type NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { orderId, orderNumber } = await request.json()

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

    // Prepare email content
    const itemsList = order.OrderItem.map(
      (item: Record<string, unknown>) =>
        `<li>${item.productName} - Qty: ${item.quantity} - $${(item.price as number).toFixed(2)}</li>`
    ).join('')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation - GangRun Printing</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .logo { max-width: 200px; }
          .content { padding: 20px; }
          .order-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .items-list { list-style-type: none; padding: 0; }
          .items-list li { padding: 10px; border-bottom: 1px solid #eee; }
          .total { font-size: 18px; font-weight: bold; color: #28a745; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
            <p>Thank you for your order!</p>
          </div>

          <div class="content">
            <p>Hi Valued Customer,</p>

            <p>We've received your order and it's being processed. Here are your order details:</p>

            <div class="order-info">
              <h3>Order Number: ${orderNumber}</h3>
              <p>Order Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p>Status: Processing</p>
            </div>

            <h3>Order Items:</h3>
            <ul class="items-list">
              ${itemsList}
            </ul>

            <div class="order-info">
              <p>Subtotal: $${(order.subtotal as number).toFixed(2)}</p>
              <p>Tax: $${(order.tax as number).toFixed(2)}</p>
              <p>Shipping: $${(order.shipping as number).toFixed(2)}</p>
              <p class="total">Total: $${(order.total as number).toFixed(2)}</p>
            </div>

            <h3>Shipping Address:</h3>
            <p>${JSON.stringify(order.shippingAddress)}</p>

            <h3>What's Next?</h3>
            <ol>
              <li>Our design team will review your files within 24 hours</li>
              <li>Once approved, your order will enter production</li>
              <li>You'll receive tracking information when your order ships</li>
            </ol>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/account/orders" class="button">View Order Status</a>
            </p>

            <p>If you have any questions about your order, please don't hesitate to contact us at support@gangrunprinting.com or call 1-800-PRINTING.</p>

            <p>Thank you for choosing GangRun Printing!</p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} GangRun Printing. All rights reserved.</p>
            <p>This is an automated email. Please do not reply directly to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send email using Resend
    await sendEmail({
      to: order.email,
      subject: `Order Confirmation - ${orderNumber}`,
      html: emailHtml,
      text: `Thank you for your order! Your order number is ${orderNumber}. You can track your order at ${process.env.NEXTAUTH_URL}/account/orders`,
    })

    // Update order to mark notification as sent
    await prisma.notification.create({
      data: {
        id: `${orderId}-confirmation`,
        orderId: order.id,
        type: 'ORDER_CONFIRMED',
        sent: true,
        sentAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, message: 'Confirmation email sent' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }
}
