import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { CashAdvanceLeadNotification } from '../../../../../emails/cash-advance-lead-notification';
import { apiRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import { getEmailRecipients } from '@/config/email-routing';
import { generateCashAdvancePDF } from '@/lib/services/pdf-form-generator.service';
import { sendLeadToTelegram } from '@/lib/services/telegram-lead-notifier.service';

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

    const body = await req.json();
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
    // PREPARER ATTRIBUTION: Look up preparer from ref parameter
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

    if (ref) {
      // Look up the preparer by tracking code
      const { data: preparerProfileData } = await db
        .from('profiles')
        .select('id, role, userId, firstName, lastName, phone')
        .or(`trackingCode.eq.${ref},customTrackingCode.eq.${ref},shortLinkUsername.eq.${ref}`)
        .eq('role', 'tax_preparer')
        .limit(1);

      preparerProfile = firstOrNull(preparerProfileData) as Profile | null;

      if (preparerProfile) {
        // Use Profile.id (not User.id) to match dashboard queries
        assignedPreparerId = preparerProfile.id;
        logger.info('Cash advance lead attributed to preparer', {
          ref,
          preparerId: assignedPreparerId,
          profileId: preparerProfile.id,
        });
      } else {
        // Ref didn't match a tax_preparer - check if it's an affiliate/admin
        const { data: anyProfileData } = await db
          .from('profiles')
          .select('id, role')
          .or(`trackingCode.eq.${ref},customTrackingCode.eq.${ref},shortLinkUsername.eq.${ref}`)
          .limit(1);

        const anyProfile = firstOrNull(anyProfileData);

        if (anyProfile?.role === 'admin') {
          assignedPreparerId = anyProfile.id;
          logger.info('Cash advance lead attributed to admin', { ref, preparerId: assignedPreparerId });
        } else {
          // Affiliate or unknown code → assign to Owliver
          assignedPreparerId = await getDefaultPreparerId();
          logger.info('Cash advance lead assigned to default preparer (Owliver)', {
            ref,
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

    // ========================================
    // CRM INTEGRATION: Create or update contact
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
          // Update referrer info if not already set
          referrerUsername: existingContact.referrerUsername || ref || null,
          referrerType: existingContact.referrerType || (ref ? 'tax_preparer' : null),
          attributionMethod: existingContact.attributionMethod || (ref ? 'ref_param' : null),
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
      });
    } else {
      // Create new CRM contact
      const { data: newContact, error: createError } = await db
        .from('crm_contacts')
        .insert({
          contactType: 'LEAD',
          firstName,
          lastName: '', // Not collected in this form
          email: contactEmail,
          phone: phoneDigits,
          source: 'preseason_cash_advance',
          stage: 'NEW',
          leadScore: 80, // High intent - they want a cash advance
          lastContactedAt: new Date().toISOString(),
          // Set preparer assignment if ref was provided
          assignedPreparerId,
          referrerUsername: ref || null,
          referrerType: ref ? 'tax_preparer' : null,
          attributionMethod: ref ? 'ref_param' : null,
        })
        .select()
        .single();

      if (createError) throw createError;
      crmContact = newContact as CRMContact;

      logger.info('Created new CRM contact for cash advance', {
        contactId: crmContact.id,
        phone: phoneDigits,
        assignedPreparerId,
      });
    }

    // ========================================
    // CRM INTERACTION: Log the form submission
    // ========================================
    try {
      const { error: interactionError } = await db.from('crm_interactions').insert({
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
${ref ? `- Referrer: ${ref} (tax_preparer)` : '- Direct (no referral)'}
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

    // ========================================
    // EMAIL NOTIFICATION ROUTING
    // ========================================
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';
    const recipients = getEmailRecipients((locale as 'en' | 'es') || 'en');

    let primaryRecipient: string;
    let recipientName: string;

    if (assignedPreparerId && preparerProfile) {
      // Get preparer's email address using preparerProfile.userId (NOT assignedPreparerId which is Profile.id)
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

      logger.info('Cash advance lead routed to assigned preparer', {
        ref,
        preparerId: assignedPreparerId,
        preparerEmail: primaryRecipient,
      });
    } else {
      // No preparer assigned - use language-based routing
      primaryRecipient = recipients.primary;
      recipientName = recipients.recipientName;

      logger.info('Cash advance lead using language-based routing', {
        locale: locale || 'en',
        primary: primaryRecipient,
      });
    }

    try {
      if (process.env.NODE_ENV === 'development') {
        logger.info('Cash advance email (Dev Mode)', {
          to: primaryRecipient,
          cc: recipients.cc,
          from: fromEmail,
          firstName,
          phone,
          email,
          zipCode,
          preferredFiling,
          bestTimeToContact,
        });
      } else {
        // Generate PDF attachment with all form data
        let pdfAttachment: { filename: string; content: Buffer } | undefined;
        try {
          const pdfBuffer = await generateCashAdvancePDF({
            id: crmContact.id,
            firstName,
            phone: phoneDigits,
            email: email || undefined,
            zipCode,
            preferredFiling,
            bestTimeToContact,
            referrerUsername: ref || undefined,
            referrerType: ref ? 'tax_preparer' : undefined,
            createdAt: new Date(),
          });
          pdfAttachment = {
            filename: `CashAdvanceLead_${firstName}_${crmContact.id.slice(-6).toUpperCase()}.pdf`,
            content: pdfBuffer,
          };
          logger.info('PDF generated for cash advance lead', {
            contactId: crmContact.id,
            filename: pdfAttachment.filename,
            size: pdfBuffer.length,
          });
        } catch (pdfError) {
          // Log error but don't fail - email still sends without attachment
          logger.error('Failed to generate PDF for cash advance lead', {
            error: pdfError,
            contactId: crmContact.id,
          });
        }

        const { data, error } = await getResendClient().emails.send({
          from: fromEmail,
          to: [primaryRecipient],
          cc: [recipients.cc],
          bcc: ['taxgenius.tax@gmail.com'], // MANDATORY: Always BCC the main office on all form submissions
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
            referralCode: ref || undefined,
            preparerName: preparerProfile
              ? `${preparerProfile.firstName} ${preparerProfile.lastName}`
              : undefined,
          }),
          // Attach PDF with all form data
          ...(pdfAttachment && { attachments: [pdfAttachment] }),
        });

        if (error) {
          logger.error('Failed to send cash advance email', error);
        } else {
          logger.info('Cash advance email sent', {
            emailId: data?.id,
            to: primaryRecipient,
            cc: recipients.cc,
            hasPdf: !!pdfAttachment,
          });
        }
      }
    } catch (emailError) {
      logger.error('Error sending cash advance email', emailError);
    }

    // Send Telegram notification (non-blocking)
    sendLeadToTelegram({
      formType: '💰 CASH ADVANCE LEAD',
      firstName,
      email,
      phone,
      zipCode,
      locale: (locale as 'en' | 'es') || 'en',
      refCode: ref,
      assignedPreparer: preparerProfile
        ? `${preparerProfile.firstName} ${preparerProfile.lastName}`
        : 'Owliver Owl',
      additionalFields: {
        'Preferred Filing': preferredFiling === 'in-person' ? 'In-Person' : 'Remote',
        'Best Time': bestTimeToContact,
      },
    }).catch(err => logger.error('Telegram notification failed', { error: err }));

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
