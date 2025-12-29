import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendLeadToDiscord } from '@/lib/services/discord-notifier.service';
import { sendLeadToTelegram } from '@/lib/services/telegram-lead-notifier.service';
import { EmailService } from '@/lib/services/email.service';

/**
 * POST /api/tax-season/submit
 *
 * Handles tax season form submissions:
 * 1. Validates required fields
 * 2. Looks up preparer info from ref code
 * 3. Saves lead to CRM
 * 4. Sends email notification to preparer (CC: taxgenius.tax@gmail.com)
 * 5. Sends Discord alert
 * 6. Returns redirect URL with all data pre-filled
 */

interface TaxSeasonSubmitRequest {
  mode: 'advance' | 'filing';
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  zipCode: string;
  preferredFiling?: 'remote' | 'in-person';
  ref?: string;
}

interface PreparerInfo {
  id: string | null;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  trackingCode: string;
}

// Static preparer lookup table (fallback when database lookup fails)
// Data from CLAUDE.md Tax Preparer Reference Table
const KNOWN_PREPARERS: Record<string, PreparerInfo> = {
  ow: {
    id: null,
    firstName: 'Owliver',
    lastName: 'Owl',
    email: 'taxgenius.tax@gmail.com',
    phone: '1 (404) 627-1015',
    trackingCode: 'ow',
  },
  rh: {
    id: null,
    firstName: 'Ray',
    lastName: 'Hamilton',
    email: 'rhamiltonfirm@gmail.com',
    phone: '(404) 555-0101',
    trackingCode: 'rh',
  },
  gw: {
    id: null,
    firstName: 'Gelisa',
    lastName: 'White',
    email: 'whitegelisa@gmail.com',
    phone: '(404) 555-0102',
    trackingCode: 'gw',
  },
  ah: {
    id: null,
    firstName: 'Ale',
    lastName: 'Hamilton',
    email: 'goldenprotaxes@gmail.com',
    trackingCode: 'ah',
  },
  ge: {
    id: null,
    firstName: 'Gregory',
    lastName: 'Edwards',
    email: 'gregthetaxgenius@gmail.com',
    trackingCode: 'ge',
  },
  iw: {
    id: null,
    firstName: 'Ira',
    lastName: 'Watkins',
    email: 'iradwatkins@gmail.com',
    trackingCode: 'iw',
  },
};

// Default preparer (Owliver Owl)
const DEFAULT_PREPARER: PreparerInfo = KNOWN_PREPARERS['ow'];

export async function POST(req: NextRequest) {
  try {
    const body: TaxSeasonSubmitRequest = await req.json();

    // Validate required fields
    const requiredFields = ['mode', 'firstName', 'lastName', 'phone', 'email', 'zipCode'];
    for (const field of requiredFields) {
      if (!body[field as keyof TaxSeasonSubmitRequest]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate mode
    if (!['advance', 'filing'].includes(body.mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "advance" or "filing"' },
        { status: 400 }
      );
    }

    logger.info('Tax season form submission received', {
      mode: body.mode,
      ref: body.ref,
      email: body.email,
    });

    // Look up preparer by ref code
    const preparer = await lookupPreparer(body.ref);
    const preparerFullName = `${preparer.firstName} ${preparer.lastName}`;

    // Determine source based on mode
    const source = body.mode === 'advance' ? 'tax_season_advance' : 'tax_season_filing';

    // Save to CRM
    const crmContactId = await saveToCRM({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      zipCode: body.zipCode,
      source,
      preparerId: preparer.id,
      refCode: preparer.trackingCode,
    });

    logger.info('Lead saved to CRM', { crmContactId, source });

    // Send notifications in parallel (non-blocking)
    const notificationPromises = [
      // Send Discord notification
      sendLeadToDiscord({
        leadType: body.mode,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        zipCode: body.zipCode,
        preferredFiling: body.preferredFiling,
        preparerName: preparerFullName,
        preparerCode: preparer.trackingCode,
        source: 'Tax Season 2026 Page',
      }),

      // Send Telegram notification
      sendLeadToTelegram({
        formType: body.mode === 'advance' ? 'Tax Season - Advance' : 'Tax Season - Filing',
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        zipCode: body.zipCode,
        service: body.mode === 'advance' ? 'Cash Advance' : 'Tax Filing',
        refCode: preparer.trackingCode,
        assignedPreparer: preparerFullName,
        source: 'Tax Season 2026 Page',
        additionalFields: body.preferredFiling
          ? { 'Filing Preference': body.preferredFiling === 'remote' ? 'Remote' : 'In-Person' }
          : undefined,
      }),

      // Send email notification to preparer
      sendEmailNotification({
        mode: body.mode,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        zipCode: body.zipCode,
        preferredFiling: body.preferredFiling,
        preparerEmail: preparer.email,
        preparerName: preparer.firstName,
        crmContactId,
      }),
    ];

    // Don't wait for notifications to complete - they're non-blocking
    Promise.all(notificationPromises).catch((error) => {
      logger.error('Error sending notifications', { error });
    });

    // Build redirect URL
    const redirectUrl = buildRedirectUrl({
      mode: body.mode,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      zipCode: body.zipCode,
      preferredFiling: body.preferredFiling,
      refCode: preparer.trackingCode,
      preparerName: preparerFullName,
    });

    return NextResponse.json({
      success: true,
      redirectUrl,
      preparerName: preparerFullName,
      crmContactId,
    });
  } catch (error) {
    logger.error('Error processing tax season form submission', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to process form submission' },
      { status: 500 }
    );
  }
}

/**
 * Look up preparer by ref code
 */
async function lookupPreparer(refCode?: string): Promise<PreparerInfo> {
  if (!refCode) {
    return DEFAULT_PREPARER;
  }

  // Check static lookup table first (fallback for when DB is empty/unavailable)
  const knownPreparer = KNOWN_PREPARERS[refCode.toLowerCase()];

  try {
    // Find tax preparer or admin by tracking code
    const { data: preparerData } = await db
      .from('profiles')
      .select('id, firstName, lastName, trackingCode, customTrackingCode, userId')
      .or(`trackingCode.eq.${refCode},customTrackingCode.eq.${refCode},shortLinkUsername.eq.${refCode}`)
      .in('role', ['tax_preparer', 'admin'])
      .limit(1);

    const preparer = firstOrNull(preparerData);

    if (!preparer || !preparer.firstName || !preparer.lastName) {
      // Use static lookup if available, otherwise default
      if (knownPreparer) {
        logger.info('Using static preparer lookup', { refCode });
        return knownPreparer;
      }
      logger.info('Preparer not found for ref code, using default', { refCode });
      return DEFAULT_PREPARER;
    }

    // Get preparer's email
    let preparerEmail: string | undefined;
    if (preparer.userId) {
      const { data: userData } = await db
        .from('users')
        .select('email')
        .eq('id', preparer.userId)
        .limit(1);
      preparerEmail = userData?.[0]?.email;
    }

    return {
      id: preparer.id,
      firstName: preparer.firstName,
      lastName: preparer.lastName,
      email: preparerEmail,
      trackingCode: preparer.customTrackingCode || preparer.trackingCode || refCode,
    };
  } catch (error) {
    logger.error('Error looking up preparer', { refCode, error });
    // Use static lookup if available, otherwise default
    if (knownPreparer) {
      logger.info('Database error, using static preparer lookup', { refCode });
      return knownPreparer;
    }
    return DEFAULT_PREPARER;
  }
}

/**
 * Save lead to CRM
 */
async function saveToCRM(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipCode: string;
  source: string;
  preparerId: string | null;
  refCode: string;
}): Promise<string> {
  try {
    const { data: insertedData, error } = await db
      .from('crm_contacts')
      .insert({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        contactType: 'LEAD',
        stage: 'NEW_LEAD',
        stageEnteredAt: new Date().toISOString(),
        source: data.source,
        assignedPreparerId: data.preparerId,
        notes: `Zip: ${data.zipCode}, Ref: ${data.refCode}`,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return insertedData.id;
  } catch (error) {
    logger.error('Error saving to CRM', { error });
    // Generate a temporary ID if CRM save fails - don't block the flow
    return `temp-${Date.now()}`;
  }
}

/**
 * Send email notification to preparer
 */
async function sendEmailNotification(data: {
  mode: 'advance' | 'filing';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipCode: string;
  preferredFiling?: 'remote' | 'in-person';
  preparerEmail?: string;
  preparerName: string;
  crmContactId: string;
}): Promise<void> {
  try {
    const ccEmail = 'taxgenius.tax@gmail.com';
    const toEmail = data.preparerEmail || ccEmail;

    const typeLabel = data.mode === 'advance' ? 'Cash Advance Request' : 'Tax Filing Request';
    const filingLabel =
      data.preferredFiling === 'remote'
        ? 'Remote'
        : data.preferredFiling === 'in-person'
          ? 'In-Person'
          : 'Not specified';

    await EmailService.sendNewLeadNotificationEmail(
      toEmail,
      {
        leadId: data.crmContactId,
        leadName: `${data.firstName} ${data.lastName}`,
        leadEmail: data.email,
        leadPhone: data.phone,
        service: typeLabel,
        message: `Zip Code: ${data.zipCode}\nFiling Preference: ${filingLabel}`,
        source: 'Tax Season 2026 Page',
      },
      toEmail !== ccEmail ? ccEmail : undefined // Only CC if not already sending to default
    );

    logger.info('Email notification sent', { toEmail, ccEmail });
  } catch (error) {
    logger.error('Error sending email notification', { error });
    // Don't rethrow - email failure shouldn't block the flow
  }
}

/**
 * Build redirect URL with all form data
 */
function buildRedirectUrl(data: {
  mode: 'advance' | 'filing';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipCode: string;
  preferredFiling?: 'remote' | 'in-person';
  refCode: string;
  preparerName: string;
}): string {
  // Base URLs
  const baseUrl =
    data.mode === 'advance'
      ? 'https://taxgenius.tax/lead/'
      : 'https://taxgenius.tax/tax/';

  // Build query parameters
  const params = new URLSearchParams({
    ref: data.refCode,
    tp: data.preparerName,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone.replace(/\D/g, ''), // Clean phone number
    email: data.email,
    zipCode: data.zipCode,
  });

  if (data.preferredFiling) {
    params.append('preferredFiling', data.preferredFiling);
  }

  return `${baseUrl}?${params.toString()}`;
}
