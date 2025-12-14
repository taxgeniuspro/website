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
import { getAttribution, saveLeadAttribution } from '@/lib/services/attribution.service';
import { checkLeadFraud, addFraudMetadata } from '@/lib/middleware/fraud-check.middleware';
import { trackLeadSubmission } from '@/lib/analytics/ga4';
import { logger } from '@/lib/logger';

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

    // Queue notifications (async, non-blocking)
    await Promise.allSettled([
      queueAdminNotification('CUSTOMER', lead),
      queueConfirmationEmail('CUSTOMER', lead.email, lead.firstName),
    ]);

    return createLeadSuccessResponse(lead.id, getLeadSuccessMessage('CUSTOMER'));
  } catch (error) {
    return handleApiError(error, 'creating customer lead');
  }
}
