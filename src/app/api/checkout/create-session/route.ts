import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Payment mode: 'test', 'stripe', or 'square'
const PAYMENT_MODE = (process.env.PAYMENT_MODE || 'test') as 'test' | 'stripe' | 'square';

// Initialize Stripe only if in Stripe mode
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
};

// Validation schema for cart items
const CartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  name: z.string(),
  price: z.number().positive(),
  imageUrl: z.string(),
});

const CheckoutRequestSchema = z.object({
  cartItems: z.array(CartItemSchema).min(1, 'Cart cannot be empty'),
});

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Authenticate with Clerk
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // STEP 2: Validate request body
    const body = await request.json();
    const validationResult = CheckoutRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { cartItems } = validationResult.data;

    // STEP 3: Fetch products from database (source of truth for prices)
    const productIds = cartItems.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    });

    // STEP 4: Validate all products exist and are active
    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));

      return NextResponse.json(
        {
          error: 'Some products are not available',
          missingProducts: missingIds,
        },
        { status: 400 }
      );
    }

    // STEP 5: Create price map from database (CRITICAL: Server-side validation)
    const priceMap = new Map(products.map((p) => [p.id, { price: Number(p.price), name: p.name }]));

    // STEP 6: Validate client-submitted prices match database prices (AC24)
    const priceMismatches: string[] = [];

    for (const item of cartItems) {
      const dbProduct = priceMap.get(item.productId);
      if (!dbProduct) {
        priceMismatches.push(`${item.name}: Product not found in database`);
        continue;
      }

      // Compare prices (allow 0.01 difference for floating point precision)
      const priceDiff = Math.abs(item.price - dbProduct.price);
      if (priceDiff > 0.01) {
        priceMismatches.push(
          `${item.name}: Client price $${item.price} != Database price $${dbProduct.price}`
        );
      }
    }

    if (priceMismatches.length > 0) {
      logger.error('❌ Price tampering detected:', priceMismatches);
      return NextResponse.json(
        {
          error: 'Price validation failed',
          details: priceMismatches,
        },
        { status: 400 }
      );
    }

    // Calculate total from database prices
    const total = cartItems.reduce((sum, item) => {
      const dbProduct = priceMap.get(item.productId)!;
      return sum + dbProduct.price * item.quantity;
    }, 0);

    logger.info(`💳 Payment mode: ${PAYMENT_MODE}`);

    // STEP 7: Handle different payment modes
    if (PAYMENT_MODE === 'test') {
      // TEST MODE: Create order immediately, skip payment processor
      logger.info('🧪 TEST MODE: Creating test order without payment');

      const testSessionId = `test_session_${Date.now()}_${userId}`;

      const order = await prisma.order.create({
        data: {
          userId,
          stripeSessionId: testSessionId,
          items: cartItems,
          total,
          status: 'COMPLETED',
          email: 'test@example.com',
        },
      });

      logger.info(`✅ Test order created: ${order.id}`);

      // Redirect to success page with test session ID
      const successUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3005'}/store/success?session_id=${testSessionId}`;

      return NextResponse.json({
        url: successUrl,
        mode: 'test',
        orderId: order.id,
      });
    } else if (PAYMENT_MODE === 'stripe') {
      // STRIPE MODE: Create Stripe Checkout Session
      logger.info('💳 STRIPE MODE: Creating Stripe checkout session');

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cartItems.map((item) => {
        const dbProduct = priceMap.get(item.productId)!;

        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: dbProduct.name,
              images: [item.imageUrl],
            },
            unit_amount: Math.round(dbProduct.price * 100), // Convert to cents
          },
          quantity: item.quantity,
        };
      });

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3005'}/store/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3005'}/store/cart`,
        metadata: {
          userId,
          cartItems: JSON.stringify(cartItems),
        },
        customer_email: undefined,
        billing_address_collection: 'auto',
        shipping_address_collection: {
          allowed_countries: ['US'],
        },
      });

      logger.info(`✅ Stripe session created: ${session.id}`);

      return NextResponse.json({ url: session.url, mode: 'stripe' });
    } else if (PAYMENT_MODE === 'square') {
      // SQUARE MODE: Placeholder for Square integration
      logger.info('🟦 SQUARE MODE: Square integration not yet implemented');

      return NextResponse.json(
        {
          error: 'Square integration coming soon',
          message: 'Switch to PAYMENT_MODE=test or PAYMENT_MODE=stripe',
        },
        { status: 501 }
      );
    } else {
      return NextResponse.json({ error: 'Invalid payment mode configured' }, { status: 500 });
    }
  } catch (error) {
    logger.error('❌ Checkout session creation failed:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
