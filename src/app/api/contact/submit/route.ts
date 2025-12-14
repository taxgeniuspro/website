import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { ContactFormNotification } from '../../../../../emails/contact-form-notification';
import { apiRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import { getEmailRecipients } from '@/config/email-routing';

/**
 * POST /api/contact/submit - Handle contact form submissions
 *
 * This endpoint:
 * 1. Validates the form data
 * 2. Saves submission to CRMContact database
 * 3. Sends email notification to taxgenius.taxes@gmail.com (Ray) with CC to taxgenius.tax@gmail.com (Owliver)
 * 4. Returns success/error response
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
    const { name, email, phone, service, message, locale } = body;

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
        },
      });

      logger.info('Updated existing CRM contact', { contactId: crmContact.id, email });
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
        },
      });

      logger.info('Created new CRM contact', { contactId: crmContact.id, email });
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

**Source:** Contact form submission`,
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

    // Send email notification to business
    // Language-based routing using centralized config:
    // Spanish → Goldenprotaxes@gmail.com (Ale Hamilton) + CC to taxgenius.tax@gmail.com (Owliver Owl)
    // English → taxgenius.taxes@gmail.com (Ray Hamilton) + CC to taxgenius.tax@gmail.com (Owliver Owl)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';
    const recipients = getEmailRecipients((locale as 'en' | 'es') || 'en');

    logger.info('Contact form language-based routing', {
      locale: locale || 'en',
      primary: recipients.primary,
      cc: recipients.cc,
    });

    try {
      if (process.env.NODE_ENV === 'development') {
        logger.info('Contact form email (Dev Mode)', {
          to: recipients.primary,
          cc: recipients.cc,
          from: fromEmail,
          name,
          email,
          phone,
          service,
          message,
        });
      } else {
        const { data, error } = await getResendClient().emails.send({
          from: fromEmail,
          to: [recipients.primary],
          cc: [recipients.cc],
          subject: `🌐 New Contact Form: ${service} - ${name}`,
          react: ContactFormNotification({
            name,
            email,
            phone,
            service,
            message,
            submittedAt: new Date(),
            locale: (locale as 'en' | 'es') || 'en', // Pass locale for email translations
            recipientName: recipients.recipientName, // Pass recipient name for personalized greeting
          }),
        });

        if (error) {
          logger.error('Failed to send contact form email', error);
          // Don't fail the request if email fails - we still saved to database
        } else {
          logger.info('Contact form email sent', { emailId: data?.id, to: recipients.primary, cc: recipients.cc });
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
