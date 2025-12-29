/**
 * Professional Email Purchase API
 * POST /api/store/professional-email/purchase
 *
 * Creates a professional email alias subscription
 * and returns a checkout URL for payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces (replaces @prisma/client imports)
interface Profile {
  id: string;
  user_id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfessionalEmailAlias {
  id: string;
  profile_id: string;
  email_address: string;
  forward_to_email: string;
  display_name: string;
  status: string;
  annual_price: number;
  is_primary: boolean;
  gmail_send_as_configured: boolean;
  smtp_enabled: boolean;
  dns_configured: boolean;
  forwarding_active: boolean;
  created_at: string;
  updated_at: string;
}

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
 *   checkoutUrl: string,  // Stripe checkout URL
 *   amount: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile with professional emails
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile', { error: profileError });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers can purchase professional emails
    if (profile.role !== 'tax_preparer' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only tax preparers can purchase professional email addresses' },
        { status: 403 }
      );
    }

    // Get existing professional emails for this profile
    const { data: existingEmails, error: emailsError } = await db
      .from('professional_email_aliases')
      .select('*')
      .eq('profile_id', profile.id);

    if (emailsError) {
      logger.error('Error fetching professional emails', { error: emailsError });
      return NextResponse.json({ error: 'Failed to fetch email aliases' }, { status: 500 });
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
    const { data: existingData, error: existingError } = await db
      .from('professional_email_aliases')
      .select('id')
      .eq('email_address', emailAddress)
      .limit(1);

    if (existingError) {
      logger.error('Error checking email availability', { error: existingError });
      return NextResponse.json({ error: 'Failed to check email availability' }, { status: 500 });
    }

    const existing = firstOrNull(existingData);

    if (existing) {
      return NextResponse.json(
        { error: 'This email address is already taken', available: false },
        { status: 409 }
      );
    }

    // Calculate price based on existing aliases
    const existingAliasesCount = (existingEmails || []).filter(
      (alias: any) => alias.status === 'ACTIVE' || alias.status === 'PROVISIONING'
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
    const { data: aliasData, error: createError } = await db
      .from('professional_email_aliases')
      .insert({
        profile_id: profile.id,
        email_address: emailAddress,
        forward_to_email: forwardToEmail,
        display_name: displayName,
        status: 'PENDING_PAYMENT',
        annual_price: annualPrice,
        is_primary: isFirstAlias, // First alias is primary by default
        gmail_send_as_configured: false,
        smtp_enabled: true,
        dns_configured: false,
        forwarding_active: false,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating professional email alias', { error: createError });
      return NextResponse.json({ error: 'Failed to create email alias' }, { status: 500 });
    }

    const alias = aliasData;

    logger.info('Professional email alias created', {
      aliasId: alias.id,
      emailAddress: alias.email_address,
      status: alias.status,
    });

    // TODO: Create Stripe subscription
    // For now, return a placeholder checkout URL
    const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/store/professional-email/checkout/${alias.id}`;

    // TODO: Implement actual payment integration
    // This would create a Stripe subscription
    // Example:
    // const subscription = await stripe.subscriptions.create({
    //   customer: profile.stripeCustomerId,
    //   items: [{ price: PROFESSIONAL_EMAIL_PRICE_ID }],
    //   metadata: {
    //     aliasId: alias.id,
    //     emailAddress: alias.email_address,
    //   },
    // });

    return NextResponse.json({
      success: true,
      aliasId: alias.id,
      email: alias.email_address,
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

    // Get user's profile
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile', { error: profileError });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get user's existing active/provisioning aliases count
    const { data: existingEmails, error: emailsError } = await db
      .from('professional_email_aliases')
      .select('id')
      .eq('profile_id', profile.id)
      .in('status', ['ACTIVE', 'PROVISIONING']);

    if (emailsError) {
      logger.error('Error fetching professional emails', { error: emailsError });
      return NextResponse.json({ error: 'Failed to fetch email aliases' }, { status: 500 });
    }

    const existingAliasesCount = (existingEmails || []).length;
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
