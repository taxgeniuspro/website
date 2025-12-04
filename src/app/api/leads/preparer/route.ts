import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
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

    // Create lead in database
    const lead = await prisma.lead.create({
      data: {
        type: 'TAX_PREPARER',
        status: 'NEW',
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        ptin: validatedData.ptin,
        certification: validatedData.certification || null,
        experience: validatedData.experience || null,
        message: validatedData.message || null,
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
      },
    });

    // ========================================
    // CRM INTEGRATION: Create CRM contact and interaction
    // ========================================
    try {
      const crmContact = await prisma.cRMContact.upsert({
        where: { email: lead.email.toLowerCase() },
        create: {
          contactType: 'PREPARER',
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email.toLowerCase(),
          phone: lead.phone,
          stage: 'NEW',
          source: lead.source || 'preparer_lead_form',
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

      logger.info('CRM contact created/updated from preparer lead', {
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
          subject: '👔 Tax Preparer Lead Inquiry',
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
          occurredAt: new Date(),
        },
      });

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
      queueAdminNotification('TAX_PREPARER', lead),
      queueConfirmationEmail('TAX_PREPARER', lead.email, lead.firstName),
    ]);

    return createLeadSuccessResponse(lead.id, getLeadSuccessMessage('TAX_PREPARER'));
  } catch (error) {
    return handleApiError(error, 'creating preparer lead');
  }
}
