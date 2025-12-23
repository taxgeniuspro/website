import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';
import { addMonths } from 'date-fns';
import { sendLeadToTelegram } from '@/lib/services/telegram-lead-notifier.service';

/**
 * Get Owliver Owl's Profile.id as the default preparer assignment.
 * All leads MUST be assigned to a preparer - Owliver is the fallback.
 */
async function getDefaultPreparerId(): Promise<string | null> {
  try {
    const owliver = await prisma.profile.findFirst({
      where: {
        OR: [
          { customTrackingCode: 'ow' },
          { trackingCode: 'ow' },
          { user: { email: 'taxgenius.tax@gmail.com' } },
        ],
        role: { in: ['admin', 'tax_preparer'] },
      },
      select: { id: true },
    });

    if (owliver) {
      return owliver.id;
    }

    // Fallback: find any admin with booking enabled
    const fallbackAdmin = await prisma.profile.findFirst({
      where: {
        role: 'admin',
        bookingEnabled: true,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    return fallbackAdmin?.id || null;
  } catch (error) {
    logger.error('Failed to get default preparer ID', { error });
    return null;
  }
}

/**
 * Get Owliver Owl's Profile.id as the default preparer assignment.
 * All leads MUST be assigned to a preparer - Owliver is the fallback.
 */
async function getDefaultPreparerId(): Promise<string | null> {
  try {
    const owliver = await prisma.profile.findFirst({
      where: {
        OR: [
          { customTrackingCode: 'ow' },
          { trackingCode: 'ow' },
          { user: { email: 'taxgenius.tax@gmail.com' } },
        ],
        role: { in: ['admin', 'tax_preparer'] },
      },
      select: { id: true },
    });

    if (owliver) {
      return owliver.id;
    }

    // Fallback: find any admin with booking enabled
    const fallbackAdmin = await prisma.profile.findFirst({
      where: {
        role: 'admin',
        bookingEnabled: true,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    return fallbackAdmin?.id || null;
  } catch (error) {
    logger.error('Failed to get default preparer ID', { error });
    return null;
  }
}

/**
 * POST /api/lead/capture
 *
 * Early lead capture endpoint - saves partial contact info as soon as user
 * starts filling out a form. This allows us to follow up with leads who
 * abandon the form before completing it.
 *
 * Minimal required fields: firstName + (phone OR email)
 *
 * This is a "fire and forget" endpoint - it should never block the user
 * or show errors. Leads are silently captured in the background.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      firstName,
      lastName,
      phone,
      email,
      zipCode,
      source, // 'landing_advance' | 'landing_filing' | 'contact' | 'cash_advance'
      ref, // Referral tracking code
    } = body;

    // Must have firstName and either phone or email
    if (!firstName || (!phone && !email)) {
      return NextResponse.json({ success: false }, { status: 200 }); // Silent fail
    }

    const tax_year = getCurrentFilingTaxYear();

    // Determine attribution from ref code
    let referrerUsername: string | null = null;
    let referrerType: string | null = null;
    let assignedPreparerId: string | null = null;

    if (ref) {
      const referrerProfile = await prisma.profile.findFirst({
        where: {
          OR: [
            { trackingCode: ref },
            { customTrackingCode: ref },
            { shortLinkUsername: ref },
          ],
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (referrerProfile) {
        referrerUsername = ref;
        referrerType = referrerProfile.role;

        // Assign lead based on referrer role
        if (referrerProfile.role === 'tax_preparer' || referrerProfile.role === 'admin') {
          assignedPreparerId = referrerProfile.id;
        } else {
          // Affiliates and clients → assign to Owliver (default preparer)
          assignedPreparerId = await getDefaultPreparerId();
        }
      } else {
        // Ref code didn't match any profile → assign to Owliver
        assignedPreparerId = await getDefaultPreparerId();
      }
    }

    // If no ref code at all → assign to Owliver (default preparer)
    if (!ref) {
      assignedPreparerId = await getDefaultPreparerId();
    }

    // If we have email, try to upsert to TaxIntakeLead
    if (email) {
      const expiresAt = addMonths(new Date(), 6);

      await prisma.taxIntakeLead.upsert({
        where: {
          email_tax_year: {
            email: email.toLowerCase(),
            tax_year,
          },
        },
        create: {
          first_name: firstName,
          last_name: lastName || null,
          email: email.toLowerCase(),
          phone: phone || null,
          zip_code: zipCode || null,
          tax_year,
          completed: false,
          referrerUsername,
          referrerType,
          assignedPreparerId,
          expiresAt,
          leadScore: 30, // Low score for early capture
          leadSource: source || 'early_capture',
        },
        update: {
          // Only update if fields are provided and record is incomplete
          first_name: firstName,
          last_name: lastName || undefined,
          phone: phone || undefined,
          zip_code: zipCode || undefined,
          // Don't overwrite attribution if already set
          referrerUsername: referrerUsername || undefined,
          referrerType: referrerType || undefined,
          assignedPreparerId: assignedPreparerId || undefined,
        },
      });

      logger.info('Early lead captured (email)', {
        email: email.toLowerCase(),
        source,
        ref,
        hasPhone: !!phone,
      });
    }

    // Also create/update CRMContact for unified tracking
    if (email) {
      try {
        await prisma.cRMContact.upsert({
          where: { email: email.toLowerCase() },
          create: {
            contactType: 'LEAD',
            firstName,
            lastName: lastName || null,
            email: email.toLowerCase(),
            phone: phone || null,
            stage: 'NEW',
            source: source || 'early_capture',
            assignedPreparerId,
            referrerUsername,
            referrerType,
            leadScore: 30,
          },
          update: {
            // Only update name if provided
            firstName,
            lastName: lastName || undefined,
            phone: phone || undefined,
          },
        });
      } catch (crmError) {
        // Silent fail - CRM is secondary
        logger.error('Failed to create CRM contact for early lead', {
          email,
          error: crmError,
        });
      }
    } else if (phone) {
      // If no email but have phone, try to find/create by phone
      try {
        const existingContact = await prisma.cRMContact.findFirst({
          where: { phone },
        });

        if (existingContact) {
          // Update existing
          await prisma.cRMContact.update({
            where: { id: existingContact.id },
            data: {
              firstName,
              lastName: lastName || undefined,
            },
          });
        } else {
          // Create new with phone only
          await prisma.cRMContact.create({
            data: {
              contactType: 'LEAD',
              firstName,
              lastName: lastName || null,
              phone,
              stage: 'NEW',
              source: source || 'early_capture',
              assignedPreparerId,
              referrerUsername,
              referrerType,
              leadScore: 20, // Even lower score without email
            },
          });
        }

        logger.info('Early lead captured (phone only)', {
          phone,
          source,
          ref,
        });
      } catch (phoneError) {
        // Silent fail
        logger.error('Failed to create phone-only lead', {
          phone,
          error: phoneError,
        });
      }
    }

    // Send Telegram notification (non-blocking)
    sendLeadToTelegram({
      formType: 'Early Lead Capture',
      firstName,
      lastName,
      email,
      phone,
      zipCode,
      source,
      refCode: ref,
    }).catch(err => logger.error('Telegram notification failed', { error: err }));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // Never fail publicly - early lead capture should be invisible
    logger.error('Error in early lead capture:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
