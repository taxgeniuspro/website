import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { CashAdvanceLeadNotification } from '../../../../../emails/cash-advance-lead-notification';
import { apiRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import { getEmailRecipients } from '@/config/email-routing';
import { generateCashAdvancePDF } from '@/lib/services/pdf-form-generator.service';
import { sendLeadToTelegram } from '@/lib/services/telegram-lead-notifier.service';
import { sendLeadToDiscord } from '@/lib/services/discord-notifier.service';
import { getAttribution } from '@/lib/services/attribution.service';

// TypeScript interfaces for database records
interface Profile {
  id: string;
  role: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

interface CRMContact {
  id: string;
  contactType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  stage: string;
  leadScore: number | null;
  lastContactedAt: Date | null;
  assignedPreparerId: string | null;
  referrerUsername: string | null;
  referrerType: string | null;
  attributionMethod: string | null;
}

interface User {
  id: string;
  email: string;
}

interface UserWithProfile extends User {
  profiles?: Array<{
    firstName: string | null;
    professional_emails?: Array<{
      emailAddress: string;
    }>;
  }>;
}

/**
 * Get Owliver Owl's Profile.id as the default preparer assignment.
 * All leads MUST be assigned to a preparer - Owliver is the fallback.
 */
async function getDefaultPreparerId(): Promise<string | null> {
  try {
    // First try to find by tracking code
    const { data: owliverByCode } = await db
      .from('profiles')
      .select('id')
      .or('customTrackingCode.eq.ow,trackingCode.eq.ow')
      .in('role', ['admin', 'tax_preparer'])
      .limit(1);

    let owliver = firstOrNull(owliverByCode);

    // If not found by code, try by email via users table
    if (!owliver) {
      const { data: owliverByEmail } = await db
        .from('profiles')
        .select('id, users!inner(email)')
        .eq('users.email', 'taxgenius.tax@gmail.com')
        .in('role', ['admin', 'tax_preparer'])
        .limit(1);

      owliver = firstOrNull(owliverByEmail);
    }

    if (owliver) {
      return owliver.id;
    }

    // Fallback: find any admin with booking enabled
    const { data: fallbackAdminData } = await db
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('bookingEnabled', true)
      .order('createdAt', { ascending: true })
      .limit(1);

    const fallbackAdmin = firstOrNull(fallbackAdminData);
    return fallbackAdmin?.id || null;
  } catch (error) {
    logger.error('Failed to get default preparer ID', { error });
    return null;
  }
}

/**
 * POST /api/cash-advance/submit - Handle preseason cash advance lead form submissions
 *
 * This endpoint:
 * 1. Validates the form data
 * 2. Saves lead to CRMContact database with source='preseason_cash_advance'
 * 3. If ref parameter is provided, sends email to assigned tax preparer + CC to Owliver
 * 4. Otherwise, sends to language-based recipient (Ray/Ale) + CC to Owliver
 * 5. Returns success/error response
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting check
    const ip = getClientIdentifier(req);
    const rateLimitResult = await apiRateLimit.limit(`cash_advance_${ip}`);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for cash advance form', { ip });
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const {
      firstName,
      phone,
      email,
      zipCode,
      preferredFiling,
      bestTimeToContact,
      consent,
      locale,
      ref,
    } = body;

    // Validate required fields
    if (!firstName || !phone || !zipCode) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, phone, and zipCode are required' },
        { status: 400 }
      );
    }

    // Validate phone format (basic check)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Validate zip code
    if (!/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({ error: 'Invalid zip code format' }, { status: 400 });
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    // Validate consent
    if (!consent) {
      return NextResponse.json(
        { error: 'You must agree to be contacted to submit this form' },
        { status: 400 }
      );
    }

    // ========================================
    // PREPARER ATTRIBUTION: Use getAttribution service for full tracking
    // Supports: URL ref param, cookie-based tracking, email/phone cross-device matching
    // ========================================
    let assignedPreparerId: string | null = null;
    let preparerProfile: {
      id: string;
      role: string;
      userId: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
    } | null = null;

    // Get attribution from service (checks cookies, email/phone matching)
    const attributionResult = await getAttribution(email || undefined, phoneDigits);

    // Determine the referrer username - prefer URL ref, fallback to cookie/matching
    const effectiveRef = ref || attributionResult.attribution.referrerUsername;

    if (effectiveRef) {
      // Look up the preparer by tracking code
      const { data: preparerProfileData } = await db
        .from('profiles')
        .select('id, role, userId, firstName, lastName, phone')
        .or(`trackingCode.eq.${effectiveRef},customTrackingCode.eq.${effectiveRef},shortLinkUsername.eq.${effectiveRef}`)
        .eq('role', 'tax_preparer')
        .limit(1);

      preparerProfile = firstOrNull(preparerProfileData) as Profile | null;

      if (preparerProfile) {
        // Use Profile.id (not User.id) to match dashboard queries
        assignedPreparerId = preparerProfile.id;
        logger.info('Cash advance lead attributed to preparer', {
          ref: effectiveRef,
          attributionMethod: ref ? 'ref_param' : attributionResult.attribution.attributionMethod,
          preparerId: assignedPreparerId,
          profileId: preparerProfile.id,
        });
      } else {
        // Ref didn't match a tax_preparer - check if it's an affiliate/admin
        const { data: anyProfileData } = await db
          .from('profiles')
          .select('id, role')
          .or(`trackingCode.eq.${effectiveRef},customTrackingCode.eq.${effectiveRef},shortLinkUsername.eq.${effectiveRef}`)
          .limit(1);

        const anyProfile = firstOrNull(anyProfileData);

        if (anyProfile?.role === 'admin') {
          assignedPreparerId = anyProfile.id;
          logger.info('Cash advance lead attributed to admin', { ref: effectiveRef, preparerId: assignedPreparerId });
        } else {
          // Affiliate or unknown code → assign to Owliver
          assignedPreparerId = await getDefaultPreparerId();
          logger.info('Cash advance lead assigned to default preparer (Owliver)', {
            ref: effectiveRef,
            preparerId: assignedPreparerId,
            reason: anyProfile ? 'affiliate_referral' : 'unknown_ref',
          });
        }
      }
    }

    // If no ref code at all → assign to Owliver (default preparer)
    if (!assignedPreparerId) {
      assignedPreparerId = await getDefaultPreparerId();
      logger.info('Cash advance lead assigned to default preparer (no ref)', {
        preparerId: assignedPreparerId,
      });
    }

    // Determine final attribution fields
    const finalReferrerUsername = effectiveRef || null;
    const finalReferrerType = effectiveRef
      ? (attributionResult.attribution.referrerType || 'tax_preparer')
      : null;
    const finalAttributionMethod = ref
      ? 'ref_param'
      : (attributionResult.attribution.attributionMethod || null);
    const finalAttributionConfidence = attributionResult.attribution.attributionConfidence || (ref ? 100 : null);

    // Prepare preparer info for notifications
    const preparerName = preparerProfile
      ? `${preparerProfile.firstName} ${preparerProfile.lastName}`
      : 'Owliver Owl';

    // ========================================
    // NOTIFICATIONS FIRST - Ensure we have a copy before CRM
    // Discord, Telegram, and Email are sent BEFORE saving to CRM
    // This ensures we always have lead data even if CRM fails
    // ========================================

    // Get preparer email for notifications
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';
    const recipients = getEmailRecipients((locale as 'en' | 'es') || 'en');
    let primaryRecipient: string;
    let recipientName: string;

    if (assignedPreparerId && preparerProfile) {
      const { data: preparerData } = await db
        .from('users')
        .select(`
          email,
          profiles!inner (
            firstName,
            professional_emails (
              emailAddress
            )
          )
        `)
        .eq('id', preparerProfile.userId)
        .eq('profiles.professional_emails.isPrimary', true)
        .eq('profiles.professional_emails.status', 'ACTIVE')
        .limit(1);

      const preparer = firstOrNull(preparerData) as UserWithProfile | null;
      primaryRecipient =
        preparer?.profiles?.[0]?.professional_emails?.[0]?.emailAddress ||
        preparer?.email ||
        recipients.primary;
      recipientName = preparerProfile.firstName || preparer?.profiles?.[0]?.firstName || 'Tax Preparer';
    } else {
      primaryRecipient = recipients.primary;
      recipientName = recipients.recipientName;
    }

    // Temporary ID for PDF (will be replaced with CRM ID after save)
    const tempLeadId = `LEAD-${Date.now().toString(36).toUpperCase()}`;

    // 1. Send Discord notification
    try {
      await sendLeadToDiscord({
        leadType: 'advance',
        firstName,
        lastName: '',
        email: email || '',
        phone: phoneDigits,
        zipCode,
        preferredFiling,
        preparerName,
        preparerCode: finalReferrerUsername || 'ow',
        source: 'Landing Page - Cash Advance',
      });
      logger.info('Discord notification sent for cash advance lead');
    } catch (discordError) {
      logger.error('Discord notification failed', { error: discordError });
    }

    // 2. Send Telegram notification
    try {
      await sendLeadToTelegram({
        formType: '💰 CASH ADVANCE LEAD',
        firstName,
        email,
        phone,
        zipCode,
        locale: (locale as 'en' | 'es') || 'en',
        refCode: finalReferrerUsername || undefined,
        assignedPreparer: preparerName,
        source: 'Landing Page',
        additionalFields: {
          'Preferred Filing': preferredFiling === 'in-person' ? 'In-Person' : 'Remote',
          'Best Time': bestTimeToContact,
          'Attribution': finalAttributionMethod || 'direct',
        },
      });
      logger.info('Telegram notification sent for cash advance lead');
    } catch (telegramError) {
      logger.error('Telegram notification failed', { error: telegramError });
    }

    // 3. Send Email notification with PDF
    try {
      if (process.env.NODE_ENV !== 'development') {
        // Generate PDF attachment with all form data
        let pdfAttachment: { filename: string; content: Buffer } | undefined;
        try {
          const pdfBuffer = await generateCashAdvancePDF({
            id: tempLeadId,
            firstName,
            phone: phoneDigits,
            email: email || undefined,
            zipCode,
            preferredFiling,
            bestTimeToContact,
            referrerUsername: finalReferrerUsername || undefined,
            referrerType: finalReferrerType || undefined,
            createdAt: new Date(),
          });
          pdfAttachment = {
            filename: `CashAdvanceLead_${firstName}_${tempLeadId}.pdf`,
            content: pdfBuffer,
          };
          logger.info('PDF generated for cash advance lead', {
            tempLeadId,
            filename: pdfAttachment.filename,
          });
        } catch (pdfError) {
          logger.error('Failed to generate PDF for cash advance lead', { error: pdfError });
        }

        const { data, error } = await getResendClient().emails.send({
          from: fromEmail,
          to: [primaryRecipient],
          cc: [recipients.cc],
          bcc: ['taxgenius.tax@gmail.com'],
          subject: `💰 URGENT: Preseason Cash Advance Lead - ${firstName}`,
          react: CashAdvanceLeadNotification({
            firstName,
            phone,
            email,
            zipCode,
            preferredFiling,
            bestTimeToContact,
            submittedAt: new Date(),
            recipientName,
            referralCode: finalReferrerUsername || undefined,
            preparerName: preparerProfile
              ? `${preparerProfile.firstName} ${preparerProfile.lastName}`
              : undefined,
          }),
          ...(pdfAttachment && { attachments: [pdfAttachment] }),
        });

        if (error) {
          logger.error('Failed to send cash advance email', error);
        } else {
          logger.info('Email notification sent for cash advance lead', {
            emailId: data?.id,
            to: primaryRecipient,
          });
        }
      } else {
        logger.info('Email notification skipped (dev mode)', { to: primaryRecipient });
      }
    } catch (emailError) {
      logger.error('Email notification failed', { error: emailError });
    }

    logger.info('All notifications sent for cash advance lead', {
      discord: true,
      telegram: true,
      email: true,
      tempLeadId,
    });

    // ========================================
    // CRM INTEGRATION: Create or update contact
    // (After notifications are sent)
    // ========================================
    let crmContact: CRMContact;
    const contactEmail = email?.toLowerCase() || `${phoneDigits}@phone.lead`;

    // Check if CRMContact already exists by email or phone
    let existingContact: CRMContact | null = null;
    if (email) {
      const { data: existingByEmail } = await db
        .from('crm_contacts')
        .select('*')
        .eq('email', contactEmail)
        .limit(1);
      existingContact = firstOrNull(existingByEmail) as CRMContact | null;
    } else {
      const { data: existingByPhone } = await db
        .from('crm_contacts')
        .select('*')
        .eq('phone', phoneDigits)
        .limit(1);
      existingContact = firstOrNull(existingByPhone) as CRMContact | null;
    }

    if (existingContact) {
      // Update existing contact
      const { data: updatedContact, error: updateError } = await db
        .from('crm_contacts')
        .update({
          firstName,
          phone: phoneDigits,
          email: email?.toLowerCase() || existingContact.email,
          lastContactedAt: new Date().toISOString(),
          // Update preparer assignment if not already assigned
          assignedPreparerId: existingContact.assignedPreparerId || assignedPreparerId,
          // Update referrer info if not already set (preserve original attribution)
          referrerUsername: existingContact.referrerUsername || finalReferrerUsername,
          referrerType: existingContact.referrerType || finalReferrerType,
          attributionMethod: existingContact.attributionMethod || finalAttributionMethod,
        })
        .eq('id', existingContact.id)
        .select()
        .single();

      if (updateError) throw updateError;
      crmContact = updatedContact as CRMContact;

      logger.info('Updated existing CRM contact for cash advance', {
        contactId: crmContact.id,
        phone: phoneDigits,
        assignedPreparerId,
        attributionMethod: finalAttributionMethod,
      });
    } else {
      // Create new CRM contact
      const { data: newContact, error: createError } = await db
        .from('crm_contacts')
        .insert({
          id: nanoid(), // Generate unique ID
          contactType: 'LEAD',
          firstName,
          lastName: '', // Not collected in this form
          email: contactEmail,
          phone: phoneDigits,
          source: 'preseason_cash_advance',
          stage: 'NEW',
          leadScore: 80, // High intent - they want a cash advance
          lastContactedAt: new Date().toISOString(),
          // Set preparer assignment and attribution
          assignedPreparerId,
          referrerUsername: finalReferrerUsername,
          referrerType: finalReferrerType,
          attributionMethod: finalAttributionMethod,
        })
        .select()
        .single();

      if (createError) throw createError;
      crmContact = newContact as CRMContact;

      logger.info('Created new CRM contact for cash advance', {
        contactId: crmContact.id,
        phone: phoneDigits,
        assignedPreparerId,
        referrerUsername: finalReferrerUsername,
        attributionMethod: finalAttributionMethod,
        attributionConfidence: finalAttributionConfidence,
      });
    }

    // ========================================
    // CRM INTERACTION: Log the form submission
    // ========================================
    try {
      const { error: interactionError } = await db.from('crm_interactions').insert({
        id: nanoid(), // Generate unique ID
        contactId: crmContact.id,
        type: 'OTHER',
        direction: 'INBOUND',
        subject: '💰 Preseason Cash Advance Lead',
        body: `**Lead Type:** Preseason Cash Advance (Up to $7,000)

**Contact Details:**
- Name: ${firstName}
- Phone: ${phone}
- Email: ${email || 'Not provided'}
- Zip Code: ${zipCode}

**Preferences:**
- Filing Method: ${preferredFiling === 'in-person' ? 'In-Person' : 'Remote / Virtual'}
- Best Time to Contact: ${bestTimeToContact}

**Attribution:**
${finalReferrerUsername ? `- Referrer: ${finalReferrerUsername} (${finalReferrerType})` : '- Direct (no referral)'}
- Method: ${finalAttributionMethod || 'direct'}${finalAttributionConfidence ? ` (${finalAttributionConfidence}% confidence)` : ''}
${preparerProfile ? `- Assigned to: ${preparerProfile.firstName} ${preparerProfile.lastName}` : ''}

**Priority:** HIGH - Preseason Cash Advance Request
**Action Required:** Contact within same day`,
        occurredAt: new Date().toISOString(),
      });

      if (interactionError) {
        throw interactionError;
      }

      logger.info('CRM interaction created for cash advance lead', {
        contactId: crmContact.id,
      });
    } catch (interactionError) {
      logger.error('Failed to create CRM interaction', {
        error: interactionError,
        contactId: crmContact.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "You're in! We'll contact you shortly.",
      contactId: crmContact.id,
    });
  } catch (error) {
    logger.error('Error processing cash advance form submission', error);
    return NextResponse.json(
      {
        error: 'Failed to submit form. Please try again or call us at +1 404-627-1015',
      },
      { status: 500 }
    );
  }
}
