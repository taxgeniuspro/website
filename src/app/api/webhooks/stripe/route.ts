import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces for database entities
interface Profile {
  id: string;
  fullName: string | null;
  email: string;
  [key: string]: unknown;
}

interface ProfessionalEmailAlias {
  id: string;
  emailAddress: string;
  forwardToEmail: string;
  displayName: string | null;
  status: string;
  cloudflareRuleId: string | null;
  stripeSubscriptionId: string | null;
  profileId: string;
  profile?: Profile;
  [key: string]: unknown;
}

interface Order {
  id: string;
  userId: string;
  stripeSessionId: string;
  items: unknown;
  total: number;
  status: string;
  email: string;
  [key: string]: unknown;
}
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

  // Get alias details with profile
  const { data: aliasData, error: aliasError } = await db
    .from('professional_email_aliases')
    .select('*, profiles(*)')
    .eq('id', aliasId)
    .single();

  if (aliasError || !aliasData) {
    throw new Error(`Professional email alias not found: ${aliasId}`);
  }

  const alias = aliasData as ProfessionalEmailAlias & { profiles: Profile };
  alias.profile = alias.profiles;

  if (alias.status === 'ACTIVE') {
    logger.info('Professional email already active', { aliasId });
    return;
  }

  // Step 1: Update status to PROVISIONING
  const { error: updateError } = await db
    .from('professional_email_aliases')
    .update({ status: 'PROVISIONING' })
    .eq('id', aliasId);

  if (updateError) {
    throw new Error(`Failed to update status: ${updateError.message}`);
  }

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
    const { error: activeError } = await db
      .from('professional_email_aliases')
      .update({
        status: 'ACTIVE',
        cloudflare_rule_id: forwardingResult.ruleId,
        dns_configured: true,
        forwarding_active: true,
        provisioned_at: new Date().toISOString(),
        subscription_start_date: new Date().toISOString(),
      })
      .eq('id', aliasId);

    if (activeError) {
      throw new Error(`Failed to activate alias: ${activeError.message}`);
    }

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

    await db
      .from('professional_email_aliases')
      .update({ status: 'PROVISIONING_FAILED' })
      .eq('id', aliasId);

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
      const { data: existingOrders } = await db
        .from('orders')
        .select('*')
        .eq('stripe_session_id', session.id)
        .limit(1);

      const existingOrder = firstOrNull(existingOrders) as Order | null;

      if (existingOrder) {
        logger.info(`Warning: Order already exists for session ${session.id}`);
        return NextResponse.json({ received: true, orderId: existingOrder.id });
      }

      // Create order in database
      const { data: newOrder, error: createError } = await db
        .from('orders')
        .insert({
          user_id: userId,
          stripe_session_id: session.id,
          items: cartItems,
          total,
          status: 'COMPLETED',
          email: session.customer_email ?? session.customer_details?.email ?? '',
        })
        .select()
        .single();

      if (createError || !newOrder) {
        logger.error('Failed to create order:', createError);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
      }

      const order = newOrder as Order;
      logger.info(`Order created: ${order.id} for user ${userId}`);

      // TODO: Send order confirmation email via Resend
      // await sendOrderConfirmationEmail(order);

      return NextResponse.json({ received: true, orderId: order.id });
    }

    // Handle checkout.session.expired event
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;

      logger.info('Checkout session expired:', session.id);

      // Check if order exists
      const { data: expiredOrders } = await db
        .from('orders')
        .select('*')
        .eq('stripe_session_id', session.id)
        .limit(1);

      const existingOrder = firstOrNull(expiredOrders) as Order | null;

      if (existingOrder && existingOrder.status === 'PENDING') {
        // Update order status to FAILED
        await db
          .from('orders')
          .update({ status: 'FAILED' })
          .eq('id', existingOrder.id);

        logger.info(`Order marked as FAILED: ${existingOrder.id}`);
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

      logger.info('Invoice payment failed:', invoice.id);

      // Check if this invoice is for a professional email subscription
      const aliasId = invoice.metadata?.professionalEmailAliasId;

      if (aliasId) {
        logger.info('Suspending professional email alias:', aliasId);

        try {
          await db
            .from('professional_email_aliases')
            .update({ status: 'SUSPENDED' })
            .eq('id', aliasId);

          logger.info('Professional email suspended:', aliasId);
        } catch (error) {
          logger.error('Failed to suspend professional email:', { aliasId, error });
        }
      }

      return NextResponse.json({ received: true });
    }

    // Handle customer.subscription.deleted event
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;

      logger.info('Subscription deleted:', subscription.id);

      // Find professional email alias by subscription ID
      const { data: aliases } = await db
        .from('professional_email_aliases')
        .select('*')
        .eq('stripe_subscription_id', subscription.id)
        .limit(1);

      const alias = firstOrNull(aliases) as ProfessionalEmailAlias | null;

      if (alias) {
        logger.info('Cancelling professional email alias:', alias.id);

        try {
          // Delete Cloudflare forwarding rule
          if (alias.cloudflareRuleId) {
            await cloudflareEmailService.deleteForwardingRule(alias.cloudflareRuleId);
          }

          // Update alias status
          await db
            .from('professional_email_aliases')
            .update({
              status: 'CANCELLED',
              forwarding_active: false,
            })
            .eq('id', alias.id);

          logger.info('Professional email cancelled:', alias.id);
        } catch (error) {
          logger.error('Failed to cancel professional email:', { aliasId: alias.id, error });
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
