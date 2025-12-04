/**
 * Affiliate Application API
 *
 * POST /api/applications/affiliate
 * Handles affiliate applications with optional preparer bonding
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getAttribution } from '@/lib/services/attribution.service';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { AffiliateApplicationConfirmation } from '../../../../../emails/affiliate-application-confirmation';
import { AffiliateApplicationNotification } from '../../../../../emails/affiliate-application-notification';
import { getEmailRecipients } from '@/config/email-routing';

// Validation schema
const affiliateApplicationSchema = z.object({
  // Personal Info
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),

  // Affiliate-Specific Info
  experience: z.string().optional(),
  audience: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  website: z.string().url().optional().or(z.literal('')),
  socialMedia: z
    .object({
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      twitter: z.string().optional(),
      tiktok: z.string().optional(),
      youtube: z.string().optional(),
    })
    .optional(),

  // Bonding (Optional)
  bondToPreparerId: z.string().optional(),
  bondToPreparerUsername: z.string().optional(),

  // Additional
  message: z.string().optional(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

export async function POST(request: NextRequest) {
  let locale: string | undefined; // Declare locale in function scope for email routing

  try {
    const body = await request.json();
    locale = body.locale; // Extract locale for language-based routing

    // Validate input
    const validatedData = affiliateApplicationSchema.parse(body);

    // Get attribution
    const attributionResult = await getAttribution(validatedData.email, validatedData.phone);

    // Check if email already exists (skip in development/test mode to allow repeated testing)
    const allowDuplicates =
      process.env.NODE_ENV === 'development' ||
      process.env.ALLOW_DUPLICATE_TEST_LEADS === 'true' ||
      validatedData.email.endsWith('@example.com'); // Allow test emails

    if (!allowDuplicates) {
      const existingLead = await prisma.lead.findUnique({
        where: { email: validatedData.email },
      });

      if (existingLead) {
        return NextResponse.json(
          { error: 'An application with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Validate preparer bonding if provided
    let bondedPreparerId: string | null = null;
    if (validatedData.bondToPreparerUsername) {
      const preparer = await prisma.profile.findUnique({
        where: { shortLinkUsername: validatedData.bondToPreparerUsername },
        select: { id: true, role: true },
      });

      if (!preparer) {
        return NextResponse.json({ error: 'Invalid tax preparer username' }, { status: 400 });
      }

      if (preparer.role !== 'TAX_PREPARER') {
        return NextResponse.json(
          { error: 'The provided username is not a tax preparer' },
          { status: 400 }
        );
      }

      bondedPreparerId = preparer.id;
    }

    // Extract request metadata
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const referer = request.headers.get('referer') || undefined;

    // Create lead in database
    // Note: website, platforms, socialMedia stored in message field since Lead model only has marketingExperience and audience
    const additionalInfo = [];
    if (validatedData.website) additionalInfo.push(`Website: ${validatedData.website}`);
    if (validatedData.platforms && validatedData.platforms.length > 0) {
      additionalInfo.push(`Platforms: ${validatedData.platforms.join(', ')}`);
    }
    if (validatedData.socialMedia) {
      const socialLinks = Object.entries(validatedData.socialMedia)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (socialLinks) additionalInfo.push(`Social Media: ${socialLinks}`);
    }

    const fullMessage = [
      validatedData.message,
      bondedPreparerId ? `Bonding Request: Preparer ID ${bondedPreparerId}` : null,
      ...additionalInfo
    ].filter(Boolean).join('\n\n');

    const lead = await prisma.lead.create({
      data: {
        type: 'AFFILIATE',
        status: 'NEW',
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        marketingExperience: validatedData.experience,
        audience: validatedData.audience,
        message: fullMessage || null,
        source: referer,
        ipAddress,
        userAgent,

        // EPIC 6: Attribution fields
        referrerUsername: attributionResult.attribution.referrerUsername,
        referrerType: attributionResult.attribution.referrerType,
        commissionRate: attributionResult.attribution.commissionRate,
        commissionRateLockedAt: attributionResult.attribution.commissionRate ? new Date() : null,
        attributionMethod: attributionResult.attribution.attributionMethod,
        attributionConfidence: attributionResult.attribution.attributionConfidence,
      },
    });

    logger.info('Affiliate application created', {
      leadId: lead.id,
      email: validatedData.email,
      bondedToPreparerId: bondedPreparerId,
      attributionMethod: attributionResult.attribution.attributionMethod,
    });

    // ========================================
    // CRM INTEGRATION: Create CRM contact and interaction
    // ========================================
    try {
      const crmContact = await prisma.cRMContact.upsert({
        where: { email: validatedData.email.toLowerCase() },
        create: {
          contactType: 'AFFILIATE',
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email.toLowerCase(),
          phone: validatedData.phone,
          stage: 'NEW',
          source: 'affiliate_application',
          referrerUsername: attributionResult.attribution.referrerUsername,
          referrerType: attributionResult.attribution.referrerType,
          attributionMethod: attributionResult.attribution.attributionMethod,
          lastContactedAt: new Date(),
        },
        update: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          phone: validatedData.phone,
          referrerUsername: attributionResult.attribution.referrerUsername,
          referrerType: attributionResult.attribution.referrerType,
          attributionMethod: attributionResult.attribution.attributionMethod,
          lastContactedAt: new Date(),
        },
      });

      logger.info('CRM contact created/updated from affiliate application', {
        contactId: crmContact.id,
        leadId: lead.id,
        email: validatedData.email,
      });

      // Create CRMInteraction to log the application
      const platformsList = validatedData.platforms && validatedData.platforms.length > 0
        ? validatedData.platforms.join(', ')
        : 'Not specified';

      const interactionBody = `**Affiliate Application Submitted**

**Applicant Information:**
- Name: ${validatedData.firstName} ${validatedData.lastName}
- Email: ${validatedData.email}
- Phone: ${validatedData.phone}

**Marketing Experience:**
- Experience: ${validatedData.experience || 'Not specified'}
- Audience: ${validatedData.audience || 'Not specified'}
- Platforms: ${platformsList}
- Website: ${validatedData.website || 'Not provided'}

${bondedPreparerId ? `**Bonding Request:**\n- Bonded to Preparer ID: ${bondedPreparerId}\n- Status: Pending preparer approval\n` : ''}
**Message:**
${validatedData.message || 'No message provided'}

**Attribution:**
- Method: ${attributionResult.attribution.attributionMethod || 'Direct'}
${attributionResult.attribution.referrerUsername ? `- Referrer: ${attributionResult.attribution.referrerUsername} (${attributionResult.attribution.referrerType})` : ''}

**Lead ID:** ${lead.id}`;

      await prisma.cRMInteraction.create({
        data: {
          contactId: crmContact.id,
          type: 'NOTE',
          direction: 'INBOUND',
          subject: bondedPreparerId
            ? '🤝 Affiliate Application (Bonding Request)'
            : '🤝 Affiliate Application Submitted',
          body: interactionBody,
          occurredAt: new Date(),
        },
      });

      logger.info('CRM interaction created for affiliate application', {
        contactId: crmContact.id,
        leadId: lead.id,
        hasBonding: !!bondedPreparerId,
      });
    } catch (crmError) {
      // Log error but don't fail the request
      logger.error('Failed to create CRM contact/interaction', {
        error: crmError,
        leadId: lead.id,
        email: validatedData.email,
      });
    }

    // Queue notifications (async, non-blocking)
    await Promise.allSettled([
      queueAdminNotification(lead, bondedPreparerId, locale),
      queueConfirmationEmail(lead, locale),
      bondedPreparerId ? queuePreparerNotification(bondedPreparerId, lead) : Promise.resolve(),
    ]);

    return NextResponse.json(
      {
        success: true,
        leadId: lead.id,
        message: bondedPreparerId
          ? 'Your affiliate application has been submitted! The tax preparer will review your bonding request.'
          : "Your affiliate application has been submitted! We'll review it and get back to you soon.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error creating affiliate application', { error });
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    );
  }
}

// ============ Notification Functions ============

async function queueAdminNotification(lead: any, bondedPreparerId: string | null, locale?: string) {
  try {
    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, skipping admin notification');
      return;
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

    // Parse additional data from message field
    const platforms = lead.message
      ?.match(/Platforms: ([^\n]+)/)?.[1]
      ?.split(', ')
      .filter(Boolean);

    const website = lead.message?.match(/Website: ([^\n]+)/)?.[1];

    const socialMediaMatches = lead.message?.match(/Social Media: ([^\n]+)/)?.[1];
    let socialMedia: any = {};
    if (socialMediaMatches) {
      socialMediaMatches.split(', ').forEach((item: string) => {
        const [key, value] = item.split(': ');
        if (key && value) {
          socialMedia[key.toLowerCase()] = value;
        }
      });
    }

    // Extract original message (before additional info)
    const messageParts = lead.message?.split('\n\n') || [];
    const originalMessage = messageParts[0]?.startsWith('Website:')
      ? undefined
      : messageParts[0];

    // Send notification emails to hiring team
    // Language-based routing using centralized config:
    // Spanish → Goldenprotaxes@gmail.com (Ale Hamilton) + CC to taxgenius.tax@gmail.com (Owliver Owl)
    // English → taxgenius.taxes@gmail.com (Ray Hamilton) + CC to taxgenius.tax@gmail.com (Owliver Owl)
    const recipients = getEmailRecipients((locale as 'en' | 'es') || 'en');

    logger.info('Affiliate application language-based routing', {
      locale: locale || 'en',
      primaryRecipient: recipients.primary,
      ccRecipient: recipients.cc,
    });

    const hiringEmails = [recipients.primary, recipients.cc];

    for (let i = 0; i < hiringEmails.length; i++) {
      const hiringEmail = hiringEmails[i];

      // Add delay between emails to respect rate limits (2 emails/sec)
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 600)); // 600ms delay
      }

      const { data: notifyData, error: notifyError} = await getResendClient().emails.send({
        from: fromEmail,
        to: hiringEmail,
        subject: `🌐 New Affiliate Application: ${lead.firstName} ${lead.lastName}${bondedPreparerId ? ' (Bonding Request)' : ''}`,
        react: AffiliateApplicationNotification({
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          experience: lead.marketingExperience,
          audience: lead.audience,
          platforms,
          website,
          socialMedia,
          message: originalMessage,
          bondedPreparerId,
          leadId: lead.id,
          locale: (locale as 'en' | 'es') || 'en',
          recipientName: recipients.recipientName,
        }),
      });

      if (notifyError) {
        logger.error(`Failed to send hiring team notification to ${hiringEmail}`, {
          error: notifyError,
          message: notifyError.message,
          name: notifyError.name,
          leadId: lead.id,
        });
      } else {
        logger.info(`Hiring team notification sent to ${hiringEmail}`, {
          emailId: notifyData?.id,
          leadId: lead.id,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error sending admin notification', {
      error: error.message || String(error),
      stack: error.stack,
      name: error.name,
      leadId: lead.id,
    });
  }
}

async function queueConfirmationEmail(lead: any, locale?: string) {
  try {
    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, skipping confirmation email');
      return;
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

    // Parse additional data from message field
    const platforms = lead.message
      ?.match(/Platforms: ([^\n]+)/)?.[1]
      ?.split(', ')
      .filter(Boolean);

    const website = lead.message?.match(/Website: ([^\n]+)/)?.[1];

    const { data: confirmData, error: confirmError } = await getResendClient().emails.send({
      from: fromEmail,
      to: lead.email,
      subject: locale === 'es'
        ? 'Su Solicitud de Afiliado Ha Sido Recibida'
        : 'Your Affiliate Application Has Been Received',
      react: AffiliateApplicationConfirmation({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        experience: lead.marketingExperience,
        audience: lead.audience,
        platforms,
        website,
        locale: (locale as 'en' | 'es') || 'en',
      }),
    });

    if (confirmError) {
      logger.error('Failed to send applicant confirmation email', {
        error: confirmError,
        message: confirmError.message,
        name: confirmError.name,
        leadId: lead.id,
      });
    } else {
      logger.info('Applicant confirmation email sent', {
        emailId: confirmData?.id,
        leadId: lead.id,
      });
    }
  } catch (error: any) {
    logger.error('Error sending confirmation email', {
      error: error.message || String(error),
      stack: error.stack,
      name: error.name,
      leadId: lead.id,
    });
  }
}

async function queuePreparerNotification(preparerId: string, lead: any) {
  try {
    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, skipping preparer notification');
      return;
    }

    // Get preparer's email
    const preparer = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!preparer?.email) {
      logger.warn('Preparer email not found', { preparerId });
      return;
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

    const { data: notifyData, error: notifyError } = await getResendClient().emails.send({
      from: fromEmail,
      to: preparer.email,
      subject: `New Affiliate Bonding Request from ${lead.firstName} ${lead.lastName}`,
      html: `
        <h2>New Affiliate Bonding Request</h2>
        <p>Hello ${preparer.firstName},</p>
        <p>You have received a new affiliate bonding request from:</p>
        <ul>
          <li><strong>Name:</strong> ${lead.firstName} ${lead.lastName}</li>
          <li><strong>Email:</strong> ${lead.email}</li>
          <li><strong>Phone:</strong> ${lead.phone}</li>
          <li><strong>Marketing Experience:</strong> ${lead.marketingExperience || 'Not specified'}</li>
          <li><strong>Target Audience:</strong> ${lead.audience || 'Not specified'}</li>
        </ul>
        <p>This affiliate would like to work with you and earn commissions on referrals sent your way.</p>
        <p>Please review their profile and respond to coordinate the bonding arrangement.</p>
        <p>Contact them at: <a href="mailto:${lead.email}">${lead.email}</a> or ${lead.phone}</p>
        <br>
        <p>Best regards,<br>Tax Genius Pro Team</p>
      `,
    });

    if (notifyError) {
      logger.error('Failed to send preparer notification', notifyError);
    } else {
      logger.info('Preparer notification sent', {
        emailId: notifyData?.id,
        preparerId,
        leadId: lead.id,
      });
    }
  } catch (error) {
    logger.error('Error sending preparer notification', { error, preparerId, leadId: lead.id });
  }
}
