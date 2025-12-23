import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { ContactFormNotification } from '../../../../../emails/contact-form-notification';
import { apiRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import { getEmailRecipients } from '@/config/email-routing';
import { generateContactFormPDF } from '@/lib/services/pdf-form-generator.service';

/**
 * POST /api/contact/submit - Handle contact form submissions
 *
 * This endpoint:
 * 1. Validates the form data
 * 2. Saves submission to CRMContact database
 * 3. If ref parameter is provided, sends email to assigned tax preparer + CC to Owliver
 * 4. Otherwise, sends to language-based recipient (Ray/Ale) + CC to Owliver
 * 5. Returns success/error response
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting check
    const ip = getClientIdentifier(req);
    const rateLimitResult = await apiRateLimit.limit(`contact_${ip}`);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for contact form', { ip });
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
    const { name, email, phone, service, message, locale, ref } = body;

    // Validate required fields
    if (!name || !email || !service || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, service, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate service field (prevent injection attacks)
    const allowedServices = [
      'individual',
      'business',
      'real-estate',
      'audit-defense',
      'tax-planning',
      'other',
      // Also allow the display values
      'Individual Tax Return',
      'Business Tax Return',
      'Real Estate Tax Services',
      'Audit Defense',
      'Tax Planning',
      'Other Services',
    ];
    if (!allowedServices.includes(service)) {
      logger.warn('Invalid service value submitted', { service, ip });
      return NextResponse.json(
        { error: 'Invalid service selection. Please select a valid service type.' },
        { status: 400 }
      );
    }

    // Validate phone number format (if provided)
    if (phone) {
      // Accept common US phone formats:
      // (123) 456-7890, 123-456-7890, 1234567890, +1 123-456-7890
      const phoneRegex = /^(\+1\s?)?((\(\d{3}\)|\d{3})[\s.-]?)?\d{3}[\s.-]?\d{4}$/;
      const cleanPhone = phone.replace(/\s/g, '');
      if (!phoneRegex.test(cleanPhone) && cleanPhone.length > 0) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Please use format: (123) 456-7890 or 123-456-7890' },
          { status: 400 }
        );
      }
    }

    // Validate message length
    if (message.length < 10 || message.length > 1000) {
      return NextResponse.json(
        { error: 'Message must be between 10 and 1000 characters' },
        { status: 400 }
      );
    }

    // Parse name into firstName and lastName
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // ========================================
    // PREPARER ATTRIBUTION: Look up preparer from ref parameter
    // ========================================
    let assignedPreparerId: string | null = null;
    let preparerProfile: { id: string; role: string; userId: string } | null = null;

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
        },
      });

      if (preparerProfile) {
        // Use Profile.id (not User.id) to match dashboard queries
        assignedPreparerId = preparerProfile.id;
        logger.info('Contact form attributed to preparer', {
          ref,
          preparerId: assignedPreparerId,
          profileId: preparerProfile.id,
        });
      } else {
        logger.warn('Contact form ref parameter did not match any preparer', { ref });
      }
    }

    // Check if CRMContact already exists
    let crmContact = await prisma.cRMContact.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (crmContact) {
      // Update existing contact
      crmContact = await prisma.cRMContact.update({
        where: { email: email.toLowerCase() },
        data: {
          firstName,
          lastName,
          phone: phone || crmContact.phone,
          lastContactedAt: new Date(),
          // Update preparer assignment if ref was provided
          ...(assignedPreparerId && { assignedPreparerId }),
          ...(ref && { referrerUsername: ref, referrerType: 'tax_preparer', attributionMethod: 'ref_param' }),
        },
      });

      logger.info('Updated existing CRM contact', { contactId: crmContact.id, email, assignedPreparerId });
    } else {
      // Create new CRM contact
      crmContact = await prisma.cRMContact.create({
        data: {
          contactType: 'LEAD',
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone: phone || null,
          source: 'contact_form',
          stage: 'NEW',
          lastContactedAt: new Date(),
          // Set preparer assignment if ref was provided
          assignedPreparerId,
          referrerUsername: ref || null,
          referrerType: ref ? 'tax_preparer' : null,
          attributionMethod: ref ? 'ref_param' : null,
        },
      });

      logger.info('Created new CRM contact', { contactId: crmContact.id, email, assignedPreparerId });
    }

    // ========================================
    // CRM INTEGRATION: Create interaction to log contact form submission
    // ========================================
    try {
      await prisma.cRMInteraction.create({
        data: {
          contactId: crmContact.id,
          type: 'OTHER',
          direction: 'INBOUND',
          subject: `📧 Contact Form: ${service}`,
          body: `**Service Inquiry:** ${service}

**Message:**
${message}

**Contact Details:**
- Name: ${name}
- Email: ${email}
- Phone: ${phone || 'Not provided'}

**Attribution:**
- Source: Contact form submission
${ref ? `- Referrer: ${ref} (tax_preparer)` : '- Direct (no referral)'}`,
          occurredAt: new Date(),
        },
      });

      logger.info('CRM interaction created for contact form submission', {
        contactId: crmContact.id,
        service,
      });
    } catch (interactionError) {
      // Log error but don't fail the request
      logger.error('Failed to create CRM interaction', {
        error: interactionError,
        contactId: crmContact.id,
      });
    }

    // ========================================
    // EMAIL NOTIFICATION ROUTING
    // If preparer is assigned (ref parameter), send to preparer + CC Owliver
    // Otherwise, use language-based routing (Ray/Ale) + CC Owliver
    // ========================================
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';
    const recipients = getEmailRecipients((locale as 'en' | 'es') || 'en');

    // Determine email recipient based on preparer assignment
    let primaryRecipient: string;
    let recipientName: string;

    if (assignedPreparerId && preparerProfile) {
      // Get preparer's email address - use preparerProfile.userId (not assignedPreparerId which is Profile.id)
      const preparer = await prisma.user.findUnique({
        where: { id: preparerProfile.userId },
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

      // Use professional email if available, otherwise use signup email
      primaryRecipient = preparer?.profile?.professionalEmails?.[0]?.emailAddress || preparer?.email || recipients.primary;
      recipientName = preparer?.profile?.firstName || 'Tax Preparer';

      logger.info('Contact form routed to assigned preparer', {
        ref,
        preparerId: assignedPreparerId,
        preparerEmail: primaryRecipient,
        preparerName: recipientName,
      });
    } else {
      // No preparer assigned - use language-based routing
      primaryRecipient = recipients.primary;
      recipientName = recipients.recipientName;

      logger.info('Contact form using language-based routing', {
        locale: locale || 'en',
        primary: primaryRecipient,
        cc: recipients.cc,
      });
    }

    try {
      // Generate professional PDF form for email attachment
      let pdfAttachment: { filename: string; content: Buffer } | undefined;
      try {
        const pdfBuffer = await generateContactFormPDF({
          id: crmContact.id,
          firstName,
          lastName,
          email,
          phone: phone || null,
          service,
          message,
          referrerUsername: ref || null,
          referrerType: ref ? 'tax_preparer' : null,
          createdAt: new Date(),
        });
        pdfAttachment = {
          filename: `ContactForm_${lastName}_${crmContact.id.slice(-6).toUpperCase()}.pdf`,
          content: pdfBuffer,
        };
        logger.info('PDF form generated for contact form', {
          contactId: crmContact.id,
          filename: pdfAttachment.filename,
          size: pdfBuffer.length,
        });
      } catch (pdfError) {
        // Log error but don't fail - email will be sent without attachment
        logger.error('Failed to generate PDF form for contact form', {
          contactId: crmContact.id,
          error: pdfError,
        });
      }

      if (process.env.NODE_ENV === 'development') {
        logger.info('Contact form email (Dev Mode)', {
          to: primaryRecipient,
          cc: recipients.cc,
          from: fromEmail,
          name,
          email,
          phone,
          service,
          message,
          assignedPreparer: assignedPreparerId ? 'Yes' : 'No',
          hasPdfAttachment: !!pdfAttachment,
        });
      } else {
        // Build referral code for email - if ref provided, use it as the code
        const referralCode = ref ? `${ref}-lead` : undefined;
        const referralSource = ref ? `taxgeniuspro.tax/go/${ref}-lead` : undefined;

        const { data, error } = await getResendClient().emails.send({
          from: fromEmail,
          to: [primaryRecipient],
          cc: [recipients.cc],
          bcc: ['taxgenius.tax@gmail.com'], // MANDATORY: Always BCC the main office on all form submissions
          subject: `🌐 New Contact Form: ${service} - ${name}`,
          react: ContactFormNotification({
            name,
            email,
            phone,
            service,
            message,
            submittedAt: new Date(),
            locale: (locale as 'en' | 'es') || 'en',
            recipientName: recipientName,
            referralCode: referralCode,
            referralSource: referralSource,
          }),
          // PDF attachment for professional print-ready form
          ...(pdfAttachment && {
            attachments: [pdfAttachment],
          }),
        });

        if (error) {
          logger.error('Failed to send contact form email', error);
          // Don't fail the request if email fails - we still saved to database
        } else {
          logger.info('Contact form email sent with PDF attachment', {
            emailId: data?.id,
            to: primaryRecipient,
            cc: recipients.cc,
            assignedPreparer: assignedPreparerId ? 'Yes' : 'No',
            hasPdfAttachment: !!pdfAttachment,
          });
        }
      }
    } catch (emailError) {
      logger.error('Error sending contact form email', emailError);
      // Continue - database save succeeded
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you shortly.',
      contactId: crmContact.id,
    });
  } catch (error) {
    logger.error('Error processing contact form submission', error);
    return NextResponse.json(
      {
        error: 'Failed to submit contact form. Please try again or call us at +1 404-627-1015',
      },
      { status: 500 }
    );
  }
}
