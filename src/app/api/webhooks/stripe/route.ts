import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { cloudflareEmailService } from '@/lib/services/cloudflare-email.service';
import { gmailSendAsService } from '@/lib/services/gmail-sendas.service';
import { professionalEmailSMTPService } from '@/lib/services/professional-email-smtp.service';

// Initialize Stripe only if key is available (avoid build-time errors)
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
};

/**
 * Provision a professional email alias after payment
 *
 * Steps:
 * 1. Update status to PROVISIONING
 * 2. Create Cloudflare forwarding rule
 * 3. Send welcome email
 * 4. Update status to ACTIVE
 */
async function provisionProfessionalEmail(aliasId: string): Promise<void> {
  logger.info('Starting professional email provisioning', { aliasId });

  // Get alias details
  const alias = await prisma.professionalEmailAlias.findUnique({
    where: { id: aliasId },
    include: {
      profile: true,
    },
  });

  if (!alias) {
    throw new Error(`Professional email alias not found: ${aliasId}`);
  }

  if (alias.status === 'ACTIVE') {
    logger.info('Professional email already active', { aliasId });
    return;
  }

  // Step 1: Update status to PROVISIONING
  await prisma.professionalEmailAlias.update({
    where: { id: aliasId },
    data: { status: 'PROVISIONING' },
  });

  logger.info('Status updated to PROVISIONING', { aliasId });

  try {
    // Step 2: Create Cloudflare forwarding rule
    logger.info('Creating Cloudflare forwarding rule', {
      aliasId,
      emailAddress: alias.emailAddress,
      forwardToEmail: alias.forwardToEmail,
    });

    const forwardingResult = await cloudflareEmailService.createForwardingRule(
      alias.emailAddress,
      alias.forwardToEmail,
      alias.displayName || undefined
    );

    if (!forwardingResult.success) {
      throw new Error(`Failed to create forwarding rule: ${forwardingResult.message}`);
    }

    logger.info('Cloudflare forwarding rule created', {
      aliasId,
      ruleId: forwardingResult.ruleId,
    });

    // Step 3: Send welcome email
    logger.info('Sending welcome email', {
      aliasId,
      forwardToEmail: alias.forwardToEmail,
    });

    await professionalEmailSMTPService.sendWelcomeEmail(
      alias.emailAddress,
      alias.forwardToEmail,
      alias.displayName || alias.profile.fullName || 'Tax Preparer'
    );

    // Step 4: Update status to ACTIVE
    await prisma.professionalEmailAlias.update({
      where: { id: aliasId },
      data: {
        status: 'ACTIVE',
        cloudflareRuleId: forwardingResult.ruleId,
        dnsConfigured: true,
        forwardingActive: true,
        provisionedAt: new Date(),
        subscriptionStartDate: new Date(),
      },
    });

    logger.info('Professional email provisioned successfully', {
      aliasId,
      emailAddress: alias.emailAddress,
    });
  } catch (error) {
    // If provisioning fails, update status to PROVISIONING_FAILED
    logger.error('Professional email provisioning failed', {
      aliasId,
      error,
    });

    await prisma.professionalEmailAlias.update({
      where: { id: aliasId },
      data: { status: 'PROVISIONING_FAILED' },
    });

    throw error;
  }
}

// CRITICAL: This endpoint handles real money transactions
// Webhook signature verification is MANDATORY for security
export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text (required for signature verification)
    const body = await request.text();

    // Get the Stripe signature from headers
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      logger.error('❌ Webhook Error: No stripe-signature header');
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    // Verify webhook signature (CRITICAL SECURITY)
    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      const error = err as Error;
      logger.error('❌ Webhook signature verification failed:', error.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    logger.info(`✅ Webhook verified: ${event.type}`);

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      logger.info('💰 Processing completed checkout session:', session.id);

      // Extract metadata
      const userId = session.metadata?.userId;
      const cartItemsJson = session.metadata?.cartItems;

      if (!userId || !cartItemsJson) {
        logger.error('❌ Missing metadata in session:', session.id);
        return NextResponse.json({ error: 'Missing required metadata' }, { status: 400 });
      }

      const cartItems = JSON.parse(cartItemsJson);
      const total = (session.amount_total ?? 0) / 100; // Convert cents to dollars

      // Idempotency check - prevent duplicate order creation
      const existingOrder = await prisma.order.findUnique({
        where: { stripeSessionId: session.id },
      });

      if (existingOrder) {
        logger.info(`⚠️  Order already exists for session ${session.id}`);
        return NextResponse.json({ received: true, orderId: existingOrder.id });
      }

      // Create order in database
      const order = await prisma.order.create({
        data: {
          userId,
          stripeSessionId: session.id,
          items: cartItems,
          total,
          status: 'COMPLETED',
          email: session.customer_email ?? session.customer_details?.email ?? '',
        },
      });

      logger.info(`✅ Order created: ${order.id} for user ${userId}`);

      // TODO: Send order confirmation email via Resend
      // await sendOrderConfirmationEmail(order);

      return NextResponse.json({ received: true, orderId: order.id });
    }

    // Handle checkout.session.expired event
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;

      logger.info('⏱️  Checkout session expired:', session.id);

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { stripeSessionId: session.id },
      });

      if (existingOrder && existingOrder.status === 'PENDING') {
        // Update order status to FAILED
        await prisma.order.update({
          where: { id: existingOrder.id },
          data: { status: 'FAILED' },
        });

        logger.info(`❌ Order marked as FAILED: ${existingOrder.id}`);
      }

      return NextResponse.json({ received: true });
    }

    // Handle invoice.paid event (for professional email subscriptions)
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;

      logger.info('💳 Processing paid invoice:', invoice.id);

      // Check if this invoice is for a professional email subscription
      const aliasId = invoice.metadata?.professionalEmailAliasId;

      if (aliasId) {
        logger.info('📧 Provisioning professional email alias:', aliasId);

        try {
          await provisionProfessionalEmail(aliasId);
          logger.info('✅ Professional email provisioned successfully:', aliasId);
        } catch (error) {
          logger.error('❌ Failed to provision professional email:', { aliasId, error });
          // Don't fail the webhook - we can retry provisioning manually
        }
      }

      return NextResponse.json({ received: true });
    }

    // Handle invoice.payment_failed event
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;

      logger.info('❌ Invoice payment failed:', invoice.id);

      // Check if this invoice is for a professional email subscription
      const aliasId = invoice.metadata?.professionalEmailAliasId;

      if (aliasId) {
        logger.info('⚠️  Suspending professional email alias:', aliasId);

        try {
          await prisma.professionalEmailAlias.update({
            where: { id: aliasId },
            data: { status: 'SUSPENDED' },
          });

          logger.info('✅ Professional email suspended:', aliasId);
        } catch (error) {
          logger.error('❌ Failed to suspend professional email:', { aliasId, error });
        }
      }

      return NextResponse.json({ received: true });
    }

    // Handle customer.subscription.deleted event
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;

      logger.info('🗑️  Subscription deleted:', subscription.id);

      // Find professional email alias by subscription ID
      const alias = await prisma.professionalEmailAlias.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (alias) {
        logger.info('⚠️  Cancelling professional email alias:', alias.id);

        try {
          // Delete Cloudflare forwarding rule
          if (alias.cloudflareRuleId) {
            await cloudflareEmailService.deleteForwardingRule(alias.cloudflareRuleId);
          }

          // Update alias status
          await prisma.professionalEmailAlias.update({
            where: { id: alias.id },
            data: {
              status: 'CANCELLED',
              forwardingActive: false,
            },
          });

          logger.info('✅ Professional email cancelled:', alias.id);
        } catch (error) {
          logger.error('❌ Failed to cancel professional email:', { aliasId: alias.id, error });
        }
      }

      return NextResponse.json({ received: true });
    }

    // Acknowledge receipt of unhandled event types
    logger.info(`ℹ️  Unhandled event type: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('❌ Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Prevent Next.js from parsing the body (we need raw body for signature verification)
export const dynamic = 'force-dynamic';
