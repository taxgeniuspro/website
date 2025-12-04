import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  createSquarePayment,
  createSquareOrder,
  getOrCreateSquareCustomer,
  getSquareLocationId,
} from '@/lib/services/square-payment.service';

/**
 * POST /api/checkout/create-payment
 * Process payment with Square or other providers
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      items, // Array of { productId, quantity, customerImageUrl? }
      paymentMethod, // 'SQUARE' | 'STRIPE' | 'CASHAPP'
      paymentToken, // Payment token from client SDK
      shippingAddress,
      shippingMethod,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    if (!paymentMethod || !paymentToken) {
      return NextResponse.json({ error: 'Payment method and token required' }, { status: 400 });
    }

    // Fetch products to validate and calculate total
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'Some products are not available' }, { status: 400 });
    }

    // Calculate total and build order items
    let total = 0;
    const orderItems = items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const quantity = parseInt(item.quantity) || 1;
      const itemTotal = Number(product.price) * quantity;
      total += itemTotal;

      return {
        productId: product.id,
        name: product.name,
        quantity,
        price: Number(product.price),
        customerImageUrl: item.customerImageUrl || null,
      };
    });

    // Check stock availability
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (product && product.stock !== null) {
        const quantity = parseInt(item.quantity) || 1;
        if (product.stock < quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product.name}` },
            { status: 400 }
          );
        }
      }
    }

    // Process payment based on method
    let paymentResult;
    let paymentSessionId = '';
    let squareOrderId: string | null = null;

    if (paymentMethod === 'SQUARE') {
      // Create Square customer
      const customerResult = await getOrCreateSquareCustomer({
        emailAddress: profile.email || undefined,
        givenName: profile.firstName || undefined,
        familyName: profile.lastName || undefined,
        phoneNumber: profile.phone || undefined,
        referenceId: profile.id,
      });

      if (!customerResult.success) {
        return NextResponse.json({ error: 'Failed to create customer record' }, { status: 500 });
      }

      // Create Square order
      const locationId = getSquareLocationId();
      const orderResult = await createSquareOrder({
        locationId,
        lineItems: orderItems.map((item) => ({
          name: item.name,
          quantity: item.quantity.toString(),
          basePriceMoney: {
            amount: BigInt(Math.round(item.price * 100)), // Convert to cents
            currency: 'USD',
          },
        })),
        customerId: customerResult.customer?.id,
        metadata: {
          profileId: profile.id,
          userId: userId,
        },
      });

      if (!orderResult.success || !orderResult.order) {
        return NextResponse.json(
          { error: orderResult.error || 'Failed to create order' },
          { status: 500 }
        );
      }

      squareOrderId = orderResult.order.id || null;

      // Create Square payment
      const totalInCents = Math.round(total * 100);
      paymentResult = await createSquarePayment({
        amount: totalInCents,
        currency: 'USD',
        sourceId: paymentToken,
        orderId: squareOrderId || undefined,
        customerId: customerResult.customer?.id,
        note: `Order for ${profile.firstName} ${profile.lastName}`,
        metadata: {
          profileId: profile.id,
        },
      });

      if (!paymentResult.success) {
        return NextResponse.json(
          { error: paymentResult.error || 'Payment failed' },
          { status: 400 }
        );
      }

      paymentSessionId = paymentResult.payment?.id || '';
    } else if (paymentMethod === 'STRIPE') {
      // TODO: Implement Stripe payment
      return NextResponse.json({ error: 'Stripe payment not yet implemented' }, { status: 501 });
    } else if (paymentMethod === 'CASHAPP') {
      // TODO: Implement CashApp payment
      return NextResponse.json({ error: 'CashApp payment not yet implemented' }, { status: 501 });
    } else {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    // Create order in database
    const order = await prisma.order.create({
      data: {
        userId: userId,
        paymentSessionId,
        paymentMethod,
        squareOrderId,
        items: orderItems,
        total,
        status: 'COMPLETED',
        email: profile.email || '',
        shippingAddress: shippingAddress || null,
        shippingMethod: shippingMethod || null,
      },
    });

    // Update product stock
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (product && product.stock !== null) {
        const quantity = parseInt(item.quantity) || 1;
        await prisma.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: quantity,
            },
          },
        });
      }
    }

    logger.info('Order created successfully', {
      orderId: order.id,
      userId: profile.id,
      total,
      paymentMethod,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      total,
      message: 'Payment processed successfully',
    });
  } catch (error) {
    logger.error('Checkout error', error);
    return NextResponse.json({ error: 'An error occurred during checkout' }, { status: 500 });
  }
}
