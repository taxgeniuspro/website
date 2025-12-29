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
  ptin?: string | null;
  certification?: string | null;
  experience?: string | null;
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
  queueAdminNotification,
  queueConfirmationEmail,
  commonLeadFields,
} from '@/lib/api-helpers/lead-helpers';
import { getAttribution } from '@/lib/services/attribution.service';
import { logger } from '@/lib/logger';

// Validation schema
const preparerLeadSchema = z.object({
  ...commonLeadFields,
  ptin: z.string().min(1, 'PTIN is required'),
  certification: z.string().optional(),
  experience: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = preparerLeadSchema.parse(body);

    // Extract metadata and UTM parameters
    const { ipAddress, userAgent, referer } = extractRequestMetadata(request);
    const { utmSource, utmMedium, utmCampaign } = extractUtmParams(body);

    // EPIC 6: Get attribution (cookie → email → phone → direct)
    const attributionResult = await getAttribution(validatedData.email, validatedData.phone);

    // Create lead in database using Supabase
    const { data: leadData, error: leadError } = await db.from('leads').insert({
      type: 'tax_preparer',
      status: 'NEW',
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      email: validatedData.email,
      phone: validatedData.phone,
      ptin: validatedData.ptin,
      certification: validatedData.certification || null,
      experience: validatedData.experience || null,
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
      ptin: leadData.ptin,
      certification: leadData.certification,
      experience: leadData.experience,
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
            contact_type: 'PREPARER',
            first_name: lead.firstName,
            last_name: lead.lastName,
            email: lead.email.toLowerCase(),
            phone: lead.phone,
            stage: 'NEW',
            source: lead.source || 'preparer_lead_form',
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

      logger.info('CRM contact created/updated from preparer lead', {
        contactId: crmContact.id,
        leadId: lead.id,
        email: lead.email,
      });

      // Create CRMInteraction to log the lead submission
      const { error: interactionError } = await db.from('crm_interactions').insert({
        contact_id: crmContact.id,
        type: 'NOTE',
        direction: 'INBOUND',
        subject: 'Tax Preparer Lead Inquiry',
        body: `**Tax Preparer Lead Submitted**

**Contact Information:**
- Name: ${lead.firstName} ${lead.lastName}
- Email: ${lead.email}
- Phone: ${lead.phone}

**Professional Details:**
- PTIN: ${validatedData.ptin}
- Certification: ${validatedData.certification || 'Not specified'}
- Experience: ${validatedData.experience || 'Not specified'}

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

      logger.info('CRM interaction created for preparer lead', {
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

    // Queue notifications (async, non-blocking)
    await Promise.allSettled([
      queueAdminNotification('tax_preparer', lead),
      queueConfirmationEmail('tax_preparer', lead.email, lead.firstName),
    ]);

    return createLeadSuccessResponse(lead.id, getLeadSuccessMessage('tax_preparer'));
  } catch (error) {
    return handleApiError(error, 'creating preparer lead');
  }
}
