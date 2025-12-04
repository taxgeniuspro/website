/**
 * Professional Email Purchase API
 * POST /api/store/professional-email/purchase
 *
 * Creates a professional email alias subscription
 * and returns a checkout URL for payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Professional email pricing
 */
const PRICING = {
  FIRST_ALIAS: 36.0, // $36/year for first alias
  ADDITIONAL_ALIAS: 24.0, // $24/year for additional aliases
};

/**
 * POST /api/store/professional-email/purchase
 *
 * Body:
 * {
 *   username: string,           // Desired username (e.g., "ira")
 *   forwardToEmail: string,     // Email to forward to (e.g., "ira.johnson@gmail.com")
 *   displayName: string,        // Display name (e.g., "Ira Johnson")
 *   quantity?: number           // Number of aliases (default: 1)
 * }
 *
 * Response:
 * {
 *   aliasId: string,
 *   email: string,
 *   checkoutUrl: string,  // Square/Stripe checkout URL
 *   amount: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { clerkId: userId },
      include: {
        professionalEmails: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers can purchase professional emails
    if (profile.role !== 'TAX_PREPARER' && profile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only tax preparers can purchase professional email addresses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, forwardToEmail, displayName, quantity = 1 } = body;

    // Validate input
    if (!username || !forwardToEmail || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields: username, forwardToEmail, displayName' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9._-]+$/i;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Invalid username format. Use only letters, numbers, dots, hyphens, and underscores.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forwardToEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    const normalizedUsername = username.toLowerCase();
    const emailAddress = `${normalizedUsername}@taxgeniuspro.tax`;

    // Check if email is already taken
    const existing = await prisma.professionalEmailAlias.findUnique({
      where: { emailAddress },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This email address is already taken', available: false },
        { status: 409 }
      );
    }

    // Calculate price based on existing aliases
    const existingAliasesCount = profile.professionalEmails.filter(
      (alias) => alias.status === 'ACTIVE' || alias.status === 'PROVISIONING'
    ).length;

    const isFirstAlias = existingAliasesCount === 0;
    const annualPrice = isFirstAlias ? PRICING.FIRST_ALIAS : PRICING.ADDITIONAL_ALIAS;

    logger.info('Creating professional email alias', {
      profileId: profile.id,
      emailAddress,
      forwardToEmail,
      isFirstAlias,
      annualPrice,
    });

    // Create professional email alias with PENDING_PAYMENT status
    const alias = await prisma.professionalEmailAlias.create({
      data: {
        profileId: profile.id,
        emailAddress,
        forwardToEmail,
        displayName,
        status: 'PENDING_PAYMENT',
        annualPrice,
        isPrimary: isFirstAlias, // First alias is primary by default
        gmailSendAsConfigured: false,
        smtpEnabled: true,
        dnsConfigured: false,
        forwardingActive: false,
      },
    });

    logger.info('Professional email alias created', {
      aliasId: alias.id,
      emailAddress: alias.emailAddress,
      status: alias.status,
    });

    // TODO: Create Stripe/Square subscription
    // For now, return a placeholder checkout URL
    const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/store/professional-email/checkout/${alias.id}`;

    // TODO: Implement actual payment integration
    // This would create a Stripe subscription or Square recurring payment
    // Example:
    // const subscription = await stripe.subscriptions.create({
    //   customer: profile.stripeCustomerId,
    //   items: [{ price: PROFESSIONAL_EMAIL_PRICE_ID }],
    //   metadata: {
    //     aliasId: alias.id,
    //     emailAddress: alias.emailAddress,
    //   },
    // });

    return NextResponse.json({
      success: true,
      aliasId: alias.id,
      email: alias.emailAddress,
      checkoutUrl,
      amount: annualPrice,
      message: 'Professional email alias created. Complete payment to activate.',
    });
  } catch (error) {
    logger.error('Error purchasing professional email', { error });
    return NextResponse.json(
      { error: 'Failed to create professional email alias' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/store/professional-email/purchase
 *
 * Get pricing information
 *
 * Response:
 * {
 *   firstAlias: number,
 *   additionalAlias: number,
 *   currency: string
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's existing aliases count
    const profile = await prisma.profile.findUnique({
      where: { clerkId: userId },
      include: {
        professionalEmails: {
          where: {
            OR: [{ status: 'ACTIVE' }, { status: 'PROVISIONING' }],
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const existingAliasesCount = profile.professionalEmails.length;
    const nextAliasPrice = existingAliasesCount === 0 ? PRICING.FIRST_ALIAS : PRICING.ADDITIONAL_ALIAS;

    return NextResponse.json({
      firstAlias: PRICING.FIRST_ALIAS,
      additionalAlias: PRICING.ADDITIONAL_ALIAS,
      nextAliasPrice,
      existingAliasesCount,
      currency: 'USD',
    });
  } catch (error) {
    logger.error('Error getting pricing information', { error });
    return NextResponse.json(
      { error: 'Failed to get pricing information' },
      { status: 500 }
    );
  }
}
