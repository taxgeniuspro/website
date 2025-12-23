import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  extractRequestMetadata,
  extractUtmParams,
  handleApiError,
  createLeadSuccessResponse,
  getLeadSuccessMessage,
  commonLeadFields,
} from '@/lib/api-helpers/lead-helpers';
import { getAttribution, saveLeadAttribution } from '@/lib/services/attribution.service';
import { checkLeadFraud, addFraudMetadata } from '@/lib/middleware/fraud-check.middleware';
import { trackLeadSubmission } from '@/lib/analytics/ga4';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { getEmailRecipients } from '@/config/email-routing';
import { generateCustomerLeadPDF } from '@/lib/services/pdf-form-generator.service';
import { sendLeadToTelegram } from '@/lib/services/telegram-lead-notifier.service';

// Validation schema
const customerLeadSchema = z.object({
  ...commonLeadFields,
  taxSituation: z.string().optional(),
  estimatedIncome: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = customerLeadSchema.parse(body);

    // EPIC 6 STORY 8: Fraud prevention check
    const fraudCheck = await checkLeadFraud(request, {
      email: validatedData.email,
      phone: validatedData.phone,
      referrerUsername: validatedData.referrerUsername,
    });

    if (!fraudCheck.passed) {
      return fraudCheck.response;
    }

    // Use sanitized data from fraud check
    const sanitizedEmail = fraudCheck.sanitizedData.email;
    const sanitizedPhone = fraudCheck.sanitizedData.phone;

    // Extract metadata and UTM parameters
    const { ipAddress, userAgent, referer } = extractRequestMetadata(request);
    const { utmSource, utmMedium, utmCampaign } = extractUtmParams(body);

    // EPIC 6: Get attribution (cookie → email → phone → direct)
    const attributionResult = await getAttribution(sanitizedEmail, sanitizedPhone);

    // Create lead in database with fraud metadata
    const leadData = {
      type: 'CUSTOMER',
      status: 'NEW',
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      taxSituation: validatedData.taxSituation || null,
      estimatedIncome: validatedData.estimatedIncome || null,
      source: referer,
      utmSource,
      utmMedium,
      utmCampaign,
      ipAddress,
      userAgent,
      // EPIC 6: Attribution fields
      referrerUsername: attributionResult.attribution.referrerUsername,
      referrerType: attributionResult.attribution.referrerType,
      commissionRate: attributionResult.attribution.commissionRate,
      commissionRateLockedAt: attributionResult.attribution.commissionRate ? new Date() : null,
      attributionMethod: attributionResult.attribution.attributionMethod,
      attributionConfidence: attributionResult.attribution.attributionConfidence,
    };

    // Add fraud check metadata
    const leadDataWithFraud = addFraudMetadata(leadData, fraudCheck.result);

    const lead = await prisma.lead.create({
      data: leadDataWithFraud,
    });

    // ========================================
    // CRM INTEGRATION: Create CRM contact and interaction
    // ========================================
    try {
      const crmContact = await prisma.cRMContact.upsert({
        where: { email: lead.email.toLowerCase() },
        create: {
          contactType: 'LEAD',
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email.toLowerCase(),
          phone: lead.phone,
          stage: 'NEW',
          source: lead.source || 'customer_lead_form',
          lastContactedAt: new Date(),
          // Epic 6 Attribution Integration
          referrerUsername: lead.referrerUsername,
          referrerType: lead.referrerType,
          commissionRate: lead.commissionRate,
          commissionRateLockedAt: lead.commissionRateLockedAt,
          attributionMethod: lead.attributionMethod,
          attributionConfidence: lead.attributionConfidence,
        },
        update: {
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          lastContactedAt: new Date(),
          // Update attribution if changed
          referrerUsername: lead.referrerUsername,
          referrerType: lead.referrerType,
          attributionMethod: lead.attributionMethod,
        },
      });

      logger.info('CRM contact created/updated from customer lead', {
        contactId: crmContact.id,
        leadId: lead.id,
        email: lead.email,
      });

      // Create CRMInteraction to log the lead submission
      await prisma.cRMInteraction.create({
        data: {
          contactId: crmContact.id,
          type: 'NOTE',
          direction: 'INBOUND',
          subject: '💼 Customer Lead Inquiry',
          body: `**Customer Lead Submitted**

**Contact Information:**
- Name: ${lead.firstName} ${lead.lastName}
- Email: ${lead.email}
- Phone: ${lead.phone}

**Tax Information:**
- Tax Situation: ${validatedData.taxSituation || 'Not specified'}
- Estimated Income: ${validatedData.estimatedIncome || 'Not specified'}

**Attribution:**
- Method: ${attributionResult.attribution.attributionMethod || 'Direct'}
${attributionResult.attribution.referrerUsername ? `- Referrer: ${attributionResult.attribution.referrerUsername} (${attributionResult.attribution.referrerType})` : ''}
- Source: ${lead.source || 'Unknown'}

**UTM Parameters:**
${utmSource ? `- Source: ${utmSource}` : ''}
${utmMedium ? `- Medium: ${utmMedium}` : ''}
${utmCampaign ? `- Campaign: ${utmCampaign}` : ''}

**Lead ID:** ${lead.id}`,
          occurredAt: new Date(),
        },
      });

      logger.info('CRM interaction created for customer lead', {
        contactId: crmContact.id,
        leadId: lead.id,
      });
    } catch (error: any) {
      // Log error but don't fail lead creation - CRM is supplementary
      logger.error('[Lead API] Failed to create CRM contact/interaction', {
        leadId: lead.id,
        error: error.message,
      });
    }

    // EPIC 6 STORY 7: Track lead submission in GA4
    trackLeadSubmission({
      leadId: lead.id,
      leadType: 'CUSTOMER',
      referrerUsername: attributionResult.attribution.referrerUsername,
      attributionMethod: attributionResult.attribution.attributionMethod || 'direct',
      source: referer,
    });

    // ========================================
    // EMAIL NOTIFICATION: Send admin notification with PDF
    // ========================================
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';
    const recipients = getEmailRecipients('en'); // Customer leads default to English

    try {
      if (process.env.NODE_ENV !== 'development') {
        // Generate PDF attachment with all lead data
        let pdfAttachment: { filename: string; content: Buffer } | undefined;
        try {
          const pdfBuffer = await generateCustomerLeadPDF({
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            taxSituation: validatedData.taxSituation,
            estimatedIncome: validatedData.estimatedIncome,
            source: lead.source,
            referrerUsername: lead.referrerUsername,
            referrerType: lead.referrerType,
            createdAt: lead.createdAt,
          });
          pdfAttachment = {
            filename: `CustomerLead_${lead.lastName}_${lead.id.slice(-6).toUpperCase()}.pdf`,
            content: pdfBuffer,
          };
          logger.info('PDF generated for customer lead', {
            leadId: lead.id,
            filename: pdfAttachment.filename,
            size: pdfBuffer.length,
          });
        } catch (pdfError) {
          // Log error but don't fail - email still sends without attachment
          logger.error('Failed to generate PDF for customer lead', {
            error: pdfError,
            leadId: lead.id,
          });
        }

        // Send admin notification email
        const { data, error } = await getResendClient().emails.send({
          from: fromEmail,
          to: [recipients.primary],
          cc: [recipients.cc],
          bcc: ['taxgenius.tax@gmail.com'], // MANDATORY: Always BCC the main office on all form submissions
          subject: `💼 New Customer Lead: ${lead.firstName} ${lead.lastName}`,
          html: `
            <h2>New Customer Lead</h2>

            <h3>Contact Information:</h3>
            <ul>
              <li><strong>Name:</strong> ${lead.firstName} ${lead.lastName}</li>
              <li><strong>Email:</strong> ${lead.email}</li>
              <li><strong>Phone:</strong> ${lead.phone}</li>
            </ul>

            <h3>Tax Information:</h3>
            <ul>
              <li><strong>Tax Situation:</strong> ${validatedData.taxSituation || 'Not specified'}</li>
              <li><strong>Estimated Income:</strong> ${validatedData.estimatedIncome || 'Not specified'}</li>
            </ul>

            <h3>Attribution:</h3>
            <ul>
              <li><strong>Method:</strong> ${attributionResult.attribution.attributionMethod || 'Direct'}</li>
              ${attributionResult.attribution.referrerUsername ? `<li><strong>Referrer:</strong> ${attributionResult.attribution.referrerUsername} (${attributionResult.attribution.referrerType})</li>` : ''}
              <li><strong>Source:</strong> ${lead.source || 'Unknown'}</li>
            </ul>

            <p><strong>Lead ID:</strong> ${lead.id}</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'}/admin/database?search=${lead.email}">View in Admin Dashboard</a></p>

            <hr />
            <p style="color: #666; font-size: 12px;">This is an automated notification from Tax Genius Pro</p>
          `,
          // Attach PDF with all lead data
          ...(pdfAttachment && { attachments: [pdfAttachment] }),
        });

        if (error) {
          logger.error('Failed to send customer lead notification email', error);
        } else {
          logger.info('Customer lead notification email sent', {
            emailId: data?.id,
            to: recipients.primary,
            cc: recipients.cc,
            hasPdf: !!pdfAttachment,
          });
        }
      } else {
        logger.info('Customer lead email (Dev Mode)', {
          to: recipients.primary,
          cc: recipients.cc,
          from: fromEmail,
          leadId: lead.id,
        });
      }
    } catch (emailError) {
      logger.error('Error sending customer lead email', emailError);
      // Continue - database save succeeded
    }

    // Send Telegram notification (non-blocking)
    sendLeadToTelegram({
      formType: '💼 Customer Lead',
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      refCode: attributionResult.attribution.referrerUsername || undefined,
      source: lead.source || 'customer_lead_form',
      additionalFields: {
        'Tax Situation': validatedData.taxSituation || 'Not specified',
        'Est. Income': validatedData.estimatedIncome || 'Not specified',
      },
    }).catch(err => logger.error('Telegram notification failed', { error: err }));

    return createLeadSuccessResponse(lead.id, getLeadSuccessMessage('CUSTOMER'));
  } catch (error) {
    return handleApiError(error, 'creating customer lead');
  }
}
