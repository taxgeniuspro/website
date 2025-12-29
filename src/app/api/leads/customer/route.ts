import { NextRequest } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { z } from 'zod';

// TypeScript interfaces (replaces @prisma/client types)
interface Lead {
  id: string;
  type: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  taxSituation?: string | null;
  estimatedIncome?: string | null;
  source?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  commissionRate?: number | null;
  commissionRateLockedAt?: Date | null;
  attributionMethod?: string | null;
  attributionConfidence?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CRMContact {
  id: string;
  contactType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  stage: string;
  source?: string | null;
  lastContactedAt?: Date | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  commissionRate?: number | null;
  commissionRateLockedAt?: Date | null;
  attributionMethod?: string | null;
  attributionConfidence?: number | null;
}
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

    // Convert camelCase to snake_case for Supabase
    const supabaseLeadData = {
      type: leadDataWithFraud.type,
      status: leadDataWithFraud.status,
      first_name: leadDataWithFraud.firstName,
      last_name: leadDataWithFraud.lastName,
      email: leadDataWithFraud.email,
      phone: leadDataWithFraud.phone,
      tax_situation: leadDataWithFraud.taxSituation,
      estimated_income: leadDataWithFraud.estimatedIncome,
      source: leadDataWithFraud.source,
      utm_source: leadDataWithFraud.utmSource,
      utm_medium: leadDataWithFraud.utmMedium,
      utm_campaign: leadDataWithFraud.utmCampaign,
      ip_address: leadDataWithFraud.ipAddress,
      user_agent: leadDataWithFraud.userAgent,
      referrer_username: leadDataWithFraud.referrerUsername,
      referrer_type: leadDataWithFraud.referrerType,
      commission_rate: leadDataWithFraud.commissionRate,
      commission_rate_locked_at: leadDataWithFraud.commissionRateLockedAt?.toISOString?.() || leadDataWithFraud.commissionRateLockedAt || null,
      attribution_method: leadDataWithFraud.attributionMethod,
      attribution_confidence: leadDataWithFraud.attributionConfidence,
      // Fraud check fields (if they exist)
      ...(leadDataWithFraud.fraudScore !== undefined && { fraud_score: leadDataWithFraud.fraudScore }),
      ...(leadDataWithFraud.fraudFlags !== undefined && { fraud_flags: leadDataWithFraud.fraudFlags }),
      ...(leadDataWithFraud.fraudCheckPassed !== undefined && { fraud_check_passed: leadDataWithFraud.fraudCheckPassed }),
    };

    const { data: createdLeadData, error: leadError } = await db.from('leads')
      .insert(supabaseLeadData)
      .select()
      .single();

    if (leadError) {
      throw new Error(`Failed to create lead: ${leadError.message}`);
    }

    // Map snake_case to camelCase for downstream usage
    const lead = {
      id: createdLeadData.id,
      type: createdLeadData.type,
      status: createdLeadData.status,
      firstName: createdLeadData.first_name,
      lastName: createdLeadData.last_name,
      email: createdLeadData.email,
      phone: createdLeadData.phone,
      taxSituation: createdLeadData.tax_situation,
      estimatedIncome: createdLeadData.estimated_income,
      source: createdLeadData.source,
      utmSource: createdLeadData.utm_source,
      utmMedium: createdLeadData.utm_medium,
      utmCampaign: createdLeadData.utm_campaign,
      ipAddress: createdLeadData.ip_address,
      userAgent: createdLeadData.user_agent,
      referrerUsername: createdLeadData.referrer_username,
      referrerType: createdLeadData.referrer_type,
      commissionRate: createdLeadData.commission_rate,
      commissionRateLockedAt: createdLeadData.commission_rate_locked_at ? new Date(createdLeadData.commission_rate_locked_at) : null,
      attributionMethod: createdLeadData.attribution_method,
      attributionConfidence: createdLeadData.attribution_confidence,
      createdAt: new Date(createdLeadData.created_at),
      updatedAt: new Date(createdLeadData.updated_at),
    };

    // ========================================
    // CRM INTEGRATION: Create CRM contact and interaction
    // ========================================
    try {
      // Try to find existing CRM contact by email
      const { data: existingContacts } = await db.from('crm_contacts')
        .select('*')
        .eq('email', lead.email.toLowerCase())
        .limit(1);

      const existingContact = firstOrNull(existingContacts);
      let crmContact: CRMContact;

      if (existingContact) {
        // Update existing contact
        const { data: updatedContact, error: updateError } = await db.from('crm_contacts')
          .update({
            first_name: lead.firstName,
            last_name: lead.lastName,
            phone: lead.phone,
            last_contacted_at: new Date().toISOString(),
            referrer_username: lead.referrerUsername,
            referrer_type: lead.referrerType,
            attribution_method: lead.attributionMethod,
          })
          .eq('id', existingContact.id)
          .select()
          .single();

        if (updateError) throw updateError;
        crmContact = {
          id: updatedContact.id,
          contactType: updatedContact.contact_type,
          firstName: updatedContact.first_name,
          lastName: updatedContact.last_name,
          email: updatedContact.email,
          phone: updatedContact.phone,
          stage: updatedContact.stage,
          source: updatedContact.source,
          lastContactedAt: updatedContact.last_contacted_at,
          referrerUsername: updatedContact.referrer_username,
          referrerType: updatedContact.referrer_type,
          commissionRate: updatedContact.commission_rate,
          commissionRateLockedAt: updatedContact.commission_rate_locked_at,
          attributionMethod: updatedContact.attribution_method,
          attributionConfidence: updatedContact.attribution_confidence,
        };
      } else {
        // Create new contact
        const { data: newContact, error: createError } = await db.from('crm_contacts')
          .insert({
            contact_type: 'LEAD',
            first_name: lead.firstName,
            last_name: lead.lastName,
            email: lead.email.toLowerCase(),
            phone: lead.phone,
            stage: 'NEW',
            source: lead.source || 'customer_lead_form',
            last_contacted_at: new Date().toISOString(),
            referrer_username: lead.referrerUsername,
            referrer_type: lead.referrerType,
            commission_rate: lead.commissionRate,
            commission_rate_locked_at: lead.commissionRateLockedAt?.toISOString() || null,
            attribution_method: lead.attributionMethod,
            attribution_confidence: lead.attributionConfidence,
          })
          .select()
          .single();

        if (createError) throw createError;
        crmContact = {
          id: newContact.id,
          contactType: newContact.contact_type,
          firstName: newContact.first_name,
          lastName: newContact.last_name,
          email: newContact.email,
          phone: newContact.phone,
          stage: newContact.stage,
          source: newContact.source,
          lastContactedAt: newContact.last_contacted_at,
          referrerUsername: newContact.referrer_username,
          referrerType: newContact.referrer_type,
          commissionRate: newContact.commission_rate,
          commissionRateLockedAt: newContact.commission_rate_locked_at,
          attributionMethod: newContact.attribution_method,
          attributionConfidence: newContact.attribution_confidence,
        };
      }

      logger.info('CRM contact created/updated from customer lead', {
        contactId: crmContact.id,
        leadId: lead.id,
        email: lead.email,
      });

      // Create CRMInteraction to log the lead submission
      const { error: interactionError } = await db.from('crm_interactions').insert({
        contact_id: crmContact.id,
        type: 'NOTE',
        direction: 'INBOUND',
        subject: 'Customer Lead Inquiry',
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
        occurred_at: new Date().toISOString(),
      });

      if (interactionError) throw interactionError;

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
