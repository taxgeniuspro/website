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
  marketingExperience?: string | null;
  audience?: string | null;
  message?: string | null;
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
import { getAttribution } from '@/lib/services/attribution.service';
import { logger } from '@/lib/logger';
import { getResendClient } from '@/lib/resend';
import { getEmailRecipients } from '@/config/email-routing';
import { generateAffiliateLeadPDF } from '@/lib/services/pdf-form-generator.service';
import { sendLeadToTelegram } from '@/lib/services/telegram-lead-notifier.service';

// Validation schema
const affiliateLeadSchema = z.object({
  ...commonLeadFields,
  experience: z.string().optional(),
  audience: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = affiliateLeadSchema.parse(body);

    // Extract metadata and UTM parameters
    const { ipAddress, userAgent, referer } = extractRequestMetadata(request);
    const { utmSource, utmMedium, utmCampaign } = extractUtmParams(body);

    // EPIC 6: Get attribution (cookie → email → phone → direct)
    const attributionResult = await getAttribution(validatedData.email, validatedData.phone);

    // Create lead in database using Supabase
    const { data: leadData, error: leadError } = await db.from('leads').insert({
      type: 'affiliate',
      status: 'NEW',
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      email: validatedData.email,
      phone: validatedData.phone,
      marketing_experience: validatedData.experience || null,
      audience: validatedData.audience || null,
      message: validatedData.message || null,
      source: referer,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      ip_address: ipAddress,
      user_agent: userAgent,
      // EPIC 6: Attribution fields
      referrer_username: attributionResult.attribution.referrerUsername,
      referrer_type: attributionResult.attribution.referrerType,
      commission_rate: attributionResult.attribution.commissionRate,
      commission_rate_locked_at: attributionResult.attribution.commissionRate ? new Date().toISOString() : null,
      attribution_method: attributionResult.attribution.attributionMethod,
      attribution_confidence: attributionResult.attribution.attributionConfidence,
    }).select().single();

    if (leadError) {
      throw new Error(`Failed to create lead: ${leadError.message}`);
    }

    // Map snake_case to camelCase for downstream usage
    const lead = {
      id: leadData.id,
      type: leadData.type,
      status: leadData.status,
      firstName: leadData.first_name,
      lastName: leadData.last_name,
      email: leadData.email,
      phone: leadData.phone,
      marketingExperience: leadData.marketing_experience,
      audience: leadData.audience,
      message: leadData.message,
      source: leadData.source,
      utmSource: leadData.utm_source,
      utmMedium: leadData.utm_medium,
      utmCampaign: leadData.utm_campaign,
      ipAddress: leadData.ip_address,
      userAgent: leadData.user_agent,
      referrerUsername: leadData.referrer_username,
      referrerType: leadData.referrer_type,
      commissionRate: leadData.commission_rate,
      commissionRateLockedAt: leadData.commission_rate_locked_at ? new Date(leadData.commission_rate_locked_at) : null,
      attributionMethod: leadData.attribution_method,
      attributionConfidence: leadData.attribution_confidence,
      createdAt: new Date(leadData.created_at),
      updatedAt: new Date(leadData.updated_at),
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
            contact_type: 'AFFILIATE',
            first_name: lead.firstName,
            last_name: lead.lastName,
            email: lead.email.toLowerCase(),
            phone: lead.phone,
            stage: 'NEW',
            source: lead.source || 'affiliate_lead_form',
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

      logger.info('CRM contact created/updated from affiliate lead', {
        contactId: crmContact.id,
        leadId: lead.id,
        email: lead.email,
      });

      // Create CRMInteraction to log the lead submission
      const { error: interactionError } = await db.from('crm_interactions').insert({
        contact_id: crmContact.id,
        type: 'NOTE',
        direction: 'INBOUND',
        subject: 'Affiliate Lead Inquiry',
        body: `**Affiliate Lead Submitted**

**Contact Information:**
- Name: ${lead.firstName} ${lead.lastName}
- Email: ${lead.email}
- Phone: ${lead.phone}

**Marketing Details:**
- Experience: ${validatedData.experience || 'Not specified'}
- Audience: ${validatedData.audience || 'Not specified'}

${validatedData.message ? `**Message:**\n${validatedData.message}\n\n` : ''}**Attribution:**
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

      logger.info('CRM interaction created for affiliate lead', {
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

    // ========================================
    // EMAIL NOTIFICATION: Send admin notification with PDF
    // ========================================
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';
    const recipients = getEmailRecipients('en'); // Affiliate leads default to English

    try {
      if (process.env.NODE_ENV !== 'development') {
        // Generate PDF attachment with all lead data
        let pdfAttachment: { filename: string; content: Buffer } | undefined;
        try {
          const pdfBuffer = await generateAffiliateLeadPDF({
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            experience: validatedData.experience,
            audience: validatedData.audience,
            message: validatedData.message,
            source: lead.source,
            referrerUsername: lead.referrerUsername,
            referrerType: lead.referrerType,
            createdAt: lead.createdAt,
          });
          pdfAttachment = {
            filename: `AffiliateLead_${lead.lastName}_${lead.id.slice(-6).toUpperCase()}.pdf`,
            content: pdfBuffer,
          };
          logger.info('PDF generated for affiliate lead', {
            leadId: lead.id,
            filename: pdfAttachment.filename,
            size: pdfBuffer.length,
          });
        } catch (pdfError) {
          // Log error but don't fail - email still sends without attachment
          logger.error('Failed to generate PDF for affiliate lead', {
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
          subject: `🤝 New Affiliate Lead: ${lead.firstName} ${lead.lastName}`,
          html: `
            <h2>New Affiliate Lead</h2>

            <h3>Contact Information:</h3>
            <ul>
              <li><strong>Name:</strong> ${lead.firstName} ${lead.lastName}</li>
              <li><strong>Email:</strong> ${lead.email}</li>
              <li><strong>Phone:</strong> ${lead.phone}</li>
            </ul>

            <h3>Marketing Details:</h3>
            <ul>
              <li><strong>Experience:</strong> ${validatedData.experience || 'Not specified'}</li>
              <li><strong>Audience:</strong> ${validatedData.audience || 'Not specified'}</li>
            </ul>

            ${validatedData.message ? `<h3>Message:</h3><p>${validatedData.message}</p>` : ''}

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
          logger.error('Failed to send affiliate lead notification email', error);
        } else {
          logger.info('Affiliate lead notification email sent', {
            emailId: data?.id,
            to: recipients.primary,
            cc: recipients.cc,
            hasPdf: !!pdfAttachment,
          });
        }
      } else {
        logger.info('Affiliate lead email (Dev Mode)', {
          to: recipients.primary,
          cc: recipients.cc,
          from: fromEmail,
          leadId: lead.id,
        });
      }
    } catch (emailError) {
      logger.error('Error sending affiliate lead email', emailError);
      // Continue - database save succeeded
    }

    // Send Telegram notification (non-blocking)
    sendLeadToTelegram({
      formType: '🤝 Affiliate Application',
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      message: validatedData.message,
      refCode: attributionResult.attribution.referrerUsername || undefined,
      source: lead.source || 'affiliate_lead_form',
      additionalFields: {
        'Experience': validatedData.experience || 'Not specified',
        'Audience': validatedData.audience || 'Not specified',
      },
    }).catch(err => logger.error('Telegram notification failed', { error: err }));

    return createLeadSuccessResponse(lead.id, getLeadSuccessMessage('affiliate'));
  } catch (error) {
    return handleApiError(error, 'creating affiliate lead');
  }
}
