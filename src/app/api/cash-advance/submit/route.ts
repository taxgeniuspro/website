import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { CashAdvanceLeadNotification } from '../../../../../emails/cash-advance-lead-notification';
import { apiRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import { getEmailRecipients } from '@/config/email-routing';

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
      preparerProfile = await prisma.profile.findFirst({
        where: {
          OR: [
            { trackingCode: ref },
            { customTrackingCode: ref },
            { shortLinkUsername: ref },
          ],
          role: 'tax_preparer',
        },
        select: {
          id: true,
          role: true,
          userId: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      });

      if (preparerProfile) {
        // Use Profile.id (not User.id) to match dashboard queries
        assignedPreparerId = preparerProfile.id;
        logger.info('Cash advance lead attributed to preparer', {
          ref,
          preparerId: assignedPreparerId,
          profileId: preparerProfile.id,
        });
      } else {
        logger.warn('Cash advance form ref parameter did not match any preparer', { ref });
      }
    }

    // ========================================
    // CRM INTEGRATION: Create or update contact
    // ========================================
    let crmContact;
    const contactEmail = email?.toLowerCase() || `${phoneDigits}@phone.lead`;

    // Check if CRMContact already exists by email or phone
    const existingContact = email
      ? await prisma.cRMContact.findUnique({ where: { email: contactEmail } })
      : await prisma.cRMContact.findFirst({ where: { phone: phoneDigits } });

    if (existingContact) {
      // Update existing contact
      crmContact = await prisma.cRMContact.update({
        where: { id: existingContact.id },
        data: {
          firstName,
          phone: phoneDigits,
          email: email?.toLowerCase() || existingContact.email,
          lastContactedAt: new Date(),
          // Update preparer assignment if ref was provided
          ...(assignedPreparerId && { assignedPreparerId }),
          ...(ref && {
            referrerUsername: ref,
            referrerType: 'tax_preparer',
            attributionMethod: 'ref_param',
          }),
        },
      });

      logger.info('Updated existing CRM contact for cash advance', {
        contactId: crmContact.id,
        phone: phoneDigits,
        assignedPreparerId,
      });
    } else {
      // Create new CRM contact
      crmContact = await prisma.cRMContact.create({
        data: {
          contactType: 'LEAD',
          firstName,
          lastName: '', // Not collected in this form
          email: contactEmail,
          phone: phoneDigits,
          source: 'preseason_cash_advance',
          stage: 'NEW',
          leadScore: 80, // High intent - they want a cash advance
          lastContactedAt: new Date(),
          // Set preparer assignment if ref was provided
          assignedPreparerId,
          referrerUsername: ref || null,
          referrerType: ref ? 'tax_preparer' : null,
          attributionMethod: ref ? 'ref_param' : null,
        },
      });

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
      await prisma.cRMInteraction.create({
        data: {
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
          occurredAt: new Date(),
        },
      });

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

    if (assignedPreparerId) {
      // Get preparer's email address
      const preparer = await prisma.user.findUnique({
        where: { id: assignedPreparerId },
        select: {
          email: true,
          profile: {
            select: {
              firstName: true,
              professionalEmails: {
                where: { isPrimary: true, status: 'ACTIVE' },
                select: { emailAddress: true },
                take: 1,
              },
            },
          },
        },
      });

      primaryRecipient =
        preparer?.profile?.professionalEmails?.[0]?.emailAddress ||
        preparer?.email ||
        recipients.primary;
      recipientName = preparer?.profile?.firstName || 'Tax Preparer';

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
        });

        if (error) {
          logger.error('Failed to send cash advance email', error);
        } else {
          logger.info('Cash advance email sent', {
            emailId: data?.id,
            to: primaryRecipient,
            cc: recipients.cc,
          });
        }
      }
    } catch (emailError) {
      logger.error('Error sending cash advance email', emailError);
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
