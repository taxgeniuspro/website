import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackJourneyStage } from '@/lib/services/journey-tracking.service';
import { getUTMCookie } from '@/lib/utils/cookie-manager';
import { getAttribution, saveTaxIntakeAttribution } from '@/lib/services/attribution.service';
import { logger } from '@/lib/logger';
import { ClientFolderService } from '@/lib/services/client-folder.service';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';
import { addMonths } from 'date-fns';
import {
  generateReferralCode,
  buildReferralLink,
} from '@/lib/services/client-referral.service';
import { scheduleReferralInvitationEmail } from '@/lib/services/scheduled-email.service';
import { CRMLeadScoringService } from '@/lib/services/crm-lead-scoring.service';
import { sendLeadToTelegram } from '@/lib/services/telegram-lead-notifier.service';

/**
 * Get Owliver Owl's Profile.id as the default preparer assignment.
 * All leads MUST be assigned to a preparer - Owliver is the fallback.
 */
async function getDefaultPreparerId(): Promise<string | null> {
  try {
    const owliver = await prisma.profile.findFirst({
      where: {
        OR: [
          { customTrackingCode: 'ow' },
          { trackingCode: 'ow' },
          { user: { email: 'taxgenius.tax@gmail.com' } },
        ],
        role: { in: ['admin', 'tax_preparer'] },
      },
      select: { id: true },
    });

    if (owliver) {
      return owliver.id;
    }

    // Fallback: find any admin with booking enabled
    const fallbackAdmin = await prisma.profile.findFirst({
      where: {
        role: 'admin',
        bookingEnabled: true,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    return fallbackAdmin?.id || null;
  } catch (error) {
    logger.error('Failed to get default preparer ID', { error });
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      // Personal Information & Address
      first_name,
      middle_name,
      last_name,
      email,
      phone,
      country_code,
      address_line_1,
      address_line_2,
      city,
      state,
      zip_code,
      // Complete Tax Information
      date_of_birth,
      ssn,
      filing_status,
      employment_type,
      occupation,
      claimed_as_dependent,
      in_college,
      has_dependents,
      number_of_dependents,
      dependents_under_24_student_or_disabled,
      dependents_in_college,
      child_care_provider,
      has_mortgage,
      denied_eitc,
      has_irs_pin,
      irs_pin,
      wants_refund_advance,
      drivers_license,
      license_expiration,
      full_form_data,
      // Language/Locale for email routing
      locale,
      // Tax year for this intake (allows yearly submissions)
      tax_year: providedTaxYear,
    } = body;

    // Determine the tax year for this intake
    const tax_year = providedTaxYear ?? getCurrentFilingTaxYear();

    // Validate required fields
    if (!first_name || !last_name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate sensitive data formats when provided
    // SSN: Must be 9 digits, optionally with dashes (XXX-XX-XXXX or XXXXXXXXX)
    if (ssn) {
      const ssnClean = ssn.replace(/[-\s]/g, '');
      if (!/^\d{9}$/.test(ssnClean)) {
        logger.warn('Invalid SSN format submitted', { email, ssnLength: ssn.length });
        return NextResponse.json({ error: 'Invalid SSN format. Please enter 9 digits.' }, { status: 400 });
      }
    }

    // Date of Birth: Must be a valid date in reasonable range (1900-current year)
    if (date_of_birth) {
      const dob = new Date(date_of_birth);
      const currentYear = new Date().getFullYear();
      const dobYear = dob.getFullYear();
      if (isNaN(dob.getTime()) || dobYear < 1900 || dobYear > currentYear) {
        logger.warn('Invalid date of birth submitted', { email, date_of_birth });
        return NextResponse.json({ error: 'Invalid date of birth format.' }, { status: 400 });
      }
    }

    // IRS PIN: Must be exactly 6 digits
    if (irs_pin) {
      const pinClean = String(irs_pin).replace(/\s/g, '');
      if (!/^\d{6}$/.test(pinClean)) {
        logger.warn('Invalid IRS PIN format submitted', { email, pinLength: String(irs_pin).length });
        return NextResponse.json({ error: 'Invalid IRS PIN format. Must be 6 digits.' }, { status: 400 });
      }
    }

    // Check if this is a complete tax intake (has SSN and other tax fields) or just basic contact
    const isCompleteTaxIntake = Boolean(ssn && date_of_birth && filing_status);

    // Log intake type detection for debugging
    logger.info('Tax intake form type detection', {
      isCompleteTaxIntake,
      hasSSN: !!ssn,
      hasDOB: !!date_of_birth,
      hasFilingStatus: !!filing_status,
      email,
    });

    // Check for ref parameter in URL
    const refParam = req.nextUrl.searchParams.get('ref');
    let refOverride = null;
    let cachedReferrerProfile = null; // Cache for referrer profile to avoid duplicate queries

    if (refParam) {
      // Look up the referrer by tracking code (optimization: cache this result)
      cachedReferrerProfile = await prisma.profile.findFirst({
        where: {
          OR: [
            { trackingCode: refParam },
            { customTrackingCode: refParam },
            { shortLinkUsername: refParam },
          ],
        },
        select: {
          id: true,
          role: true,
          userId: true,
        },
      });

      if (cachedReferrerProfile) {
        refOverride = {
          referrerUsername: refParam,
          referrerType: cachedReferrerProfile.role,
          attributionMethod: 'ref_param',
        };
        logger.info('Attribution from URL ref parameter', {
          ref: refParam,
          referrerRole: cachedReferrerProfile.role,
          referrerId: cachedReferrerProfile.id,
        });
      }
    }

    // EPIC 6: Get attribution (cookie → email → phone → direct)
    // Use refOverride if available, otherwise use getAttribution
    const attributionResult = refOverride
      ? { attribution: refOverride, source: 'ref_param' }
      : await getAttribution(email, phone);

    // CRITICAL: Determine lead assignment based on referrer role
    let assignedPreparerId: string | null = null;

    if (attributionResult.attribution.referrerUsername) {
      // Optimization: Reuse cached profile if same referrer, avoiding N+1 query
      const referrerProfile =
        cachedReferrerProfile &&
        (attributionResult.attribution.referrerUsername === refParam)
          ? cachedReferrerProfile
          : await prisma.profile.findFirst({
              where: {
                OR: [
                  { trackingCode: attributionResult.attribution.referrerUsername },
                  { customTrackingCode: attributionResult.attribution.referrerUsername },
                  { shortLinkUsername: attributionResult.attribution.referrerUsername },
                ],
              },
              select: {
                id: true,
                role: true,
                userId: true,
              },
            });

      if (referrerProfile) {
        // Business Rule: Assign lead based on referrer role
        switch (referrerProfile.role) {
          case 'client':
            // CLIENT refers → Assign to the client's assigned preparer (for commission tracking)
            // Look up client's assigned preparer via CRMContact relation
            try {
              const clientCrmContact = await prisma.cRMContact.findFirst({
                where: { userId: referrerProfile.userId },
                select: { assignedPreparerId: true },
              });
              if (clientCrmContact?.assignedPreparerId) {
                assignedPreparerId = clientCrmContact.assignedPreparerId;
                logger.info(`Lead from CLIENT referral assigned to client's preparer`, {
                  referrerId: referrerProfile.id,
                  clientUserId: referrerProfile.userId,
                  assignedPreparerId: assignedPreparerId,
                });
              } else {
                // Fallback to Owliver (default preparer) if client has no assigned preparer
                assignedPreparerId = await getDefaultPreparerId();
                logger.info(`Lead from CLIENT referral assigned to Owliver (client has no preparer)`, {
                  referrerId: referrerProfile.id,
                  assignedPreparerId,
                });
              }
            } catch (lookupError) {
              // Log error and fallback to Owliver (default preparer)
              logger.error('Failed to look up client preparer assignment', {
                referrerId: referrerProfile.id,
                error: lookupError,
              });
              assignedPreparerId = await getDefaultPreparerId();
            }
            break;

          case 'affiliate':
            // AFFILIATE refers → Assign to Owliver (default preparer)
            assignedPreparerId = await getDefaultPreparerId();
            logger.info(`Lead from AFFILIATE referral assigned to Owliver (default)`, {
              referrerId: referrerProfile.id,
              assignedPreparerId,
            });
            break;

          case 'tax_preparer':
            // TAX_PREPARER refers → Assign to THAT tax preparer
            // Use Profile.id (not User.id) to match dashboard queries
            assignedPreparerId = referrerProfile.id;
            logger.info(`Lead from TAX_PREPARER referral assigned to that preparer`, {
              preparerId: assignedPreparerId,
              profileId: referrerProfile.id,
            });
            break;

          default:
            // Default: assign to Owliver (default preparer)
            assignedPreparerId = await getDefaultPreparerId();
            logger.info(`Lead with unknown referrer role assigned to Owliver (default)`, {
              role: referrerProfile.role,
              assignedPreparerId,
            });
        }
      }
    }

    // CRITICAL: Ensure ALL leads are assigned to a preparer
    // If we still don't have an assignment (no ref code, lookup failed, etc.), assign to Owliver
    if (!assignedPreparerId) {
      assignedPreparerId = await getDefaultPreparerId();
      logger.info('Lead assigned to default preparer (no referrer)', {
        assignedPreparerId,
      });
    }

    // Check if lead already exists for this email AND tax year (composite key)
    let lead = await prisma.taxIntakeLead.findUnique({
      where: {
        email_tax_year: {
          email,
          tax_year
        }
      },
    });

    if (lead) {
      // Update existing lead for this tax year
      lead = await prisma.taxIntakeLead.update({
        where: {
          email_tax_year: {
            email,
            tax_year
          }
        },
        data: {
          first_name,
          middle_name,
          last_name,
          phone,
          country_code,
          address_line_1,
          address_line_2,
          city,
          state,
          zip_code,
          updated_at: new Date(),
          // Mark as completed if all tax fields are present
          completed: isCompleteTaxIntake,
          // EPIC 6: Attribution fields (update on re-submit)
          referrerUsername: attributionResult.attribution.referrerUsername,
          referrerType: attributionResult.attribution.referrerType,
          attributionMethod: attributionResult.attribution.attributionMethod,
          // CRITICAL: Smart lead assignment
          assignedPreparerId: assignedPreparerId,
          // Store complete tax intake data if provided
          full_form_data: full_form_data || lead.full_form_data,
        },
      });
    } else {
      // Create new lead for this tax year
      // Lead expires in 6 months if not converted to client
      const expiresAt = addMonths(new Date(), 6);

      lead = await prisma.taxIntakeLead.create({
        data: {
          first_name,
          middle_name,
          last_name,
          email,
          phone,
          country_code,
          address_line_1,
          address_line_2,
          city,
          state,
          zip_code,
          tax_year, // Include the tax year
          // Mark as completed if all tax fields are present (intake form vs lead)
          completed: isCompleteTaxIntake,
          // EPIC 6: Attribution fields
          referrerUsername: attributionResult.attribution.referrerUsername,
          referrerType: attributionResult.attribution.referrerType,
          attributionMethod: attributionResult.attribution.attributionMethod,
          // CRITICAL: Smart lead assignment
          assignedPreparerId: assignedPreparerId,
          // Store complete tax intake data if provided
          full_form_data: full_form_data,
          // Lead expiration: auto-delete in 6 months if not converted
          expiresAt,
        },
      });
    }

    // ========================================
    // DOCUMENT MANAGEMENT: Create Client Folder
    // Auto-create folder structure for lead documents
    // ========================================
    try {
      // Only create folder if we have an assigned preparer
      // NOTE: assignedPreparerId IS the Profile.id (not User.id)
      // This was fixed in PR #120 - leads are assigned by Profile.id
      let folderOwnerId: string | null = null;

      if (assignedPreparerId) {
        // assignedPreparerId is already a Profile.id, use it directly
        folderOwnerId = assignedPreparerId;
      }

      if (folderOwnerId) {
        // Use the intake's tax year for the folder structure
        const folderResult = await ClientFolderService.getOrCreateClientFolder(
          folderOwnerId,
          first_name,
          last_name,
          tax_year
        );

        // Link folder to lead
        await prisma.taxIntakeLead.update({
          where: { id: lead.id },
          data: { clientFolderId: folderResult.folderId },
        });

        logger.info('Client folder created for tax intake lead', {
          leadId: lead.id,
          folderId: folderResult.folderId,
          path: folderResult.path,
          yearFolderId: folderResult.yearFolderId,
        });
      } else {
        logger.info('No folder created - no assigned preparer', {
          leadId: lead.id,
        });
      }
    } catch (folderError) {
      // Log but don't fail - folder can be created later manually
      logger.error('Failed to create client folder for lead', {
        leadId: lead.id,
        error: folderError,
      });
    }

    // ========================================
    // CRITICAL: CRM INTEGRATION
    // Create/Update CRMContact for unified tracking
    // ========================================
    let crmContact;
    try {
      crmContact = await prisma.cRMContact.upsert({
        where: { email: email.toLowerCase() },
        create: {
          contactType: 'LEAD',
          firstName: first_name,
          lastName: last_name,
          email: email.toLowerCase(),
          phone: phone,
          stage: 'NEW',
          source: 'tax_intake_form',
          assignedPreparerId: assignedPreparerId,
          referrerUsername: attributionResult.attribution.referrerUsername,
          referrerType: attributionResult.attribution.referrerType,
          attributionMethod: attributionResult.attribution.attributionMethod,
          lastContactedAt: new Date(),
          // Tax-specific fields from intake
          filingStatus: filing_status,
          dependents: number_of_dependents ? parseInt(number_of_dependents) : null,
          taxYear: tax_year, // Use the intake's tax year
        },
        update: {
          firstName: first_name,
          lastName: last_name,
          phone: phone,
          assignedPreparerId: assignedPreparerId,
          referrerUsername: attributionResult.attribution.referrerUsername,
          referrerType: attributionResult.attribution.referrerType,
          attributionMethod: attributionResult.attribution.attributionMethod,
          lastContactedAt: new Date(),
          // Update tax-specific fields
          filingStatus: filing_status || undefined,
          dependents: number_of_dependents ? parseInt(number_of_dependents) : undefined,
        },
      });

      logger.info('CRM contact created/updated from tax intake', {
        contactId: crmContact.id,
        leadId: lead.id,
        email: email,
        isNew: !lead.id, // Was this a new lead?
      });

      // Create CRMInteraction to log the form submission
      const interactionBody = isCompleteTaxIntake
        ? `**Complete Tax Intake Form Submitted**

**Personal Information:**
- Name: ${first_name} ${middle_name || ''} ${last_name}
- Email: ${email}
- Phone: ${phone}
- Date of Birth: ${date_of_birth || 'Not provided'}

**Address:**
${address_line_1 || 'Not provided'}
${address_line_2 ? address_line_2 + '\n' : ''}${city}, ${state} ${zip_code}

**Tax Filing Information:**
- Filing Status: ${filing_status}
- Employment Type: ${employment_type}
- Occupation: ${occupation || 'Not specified'}
- Dependents: ${has_dependents ? number_of_dependents : 'None'}
- In College: ${in_college ? 'Yes' : 'No'}
- Has Mortgage: ${has_mortgage ? 'Yes' : 'No'}

**Attribution:**
- Source: ${attributionResult.attribution.attributionMethod || 'Direct'}
${attributionResult.attribution.referrerUsername ? `- Referrer: ${attributionResult.attribution.referrerUsername} (${attributionResult.attribution.referrerType})` : ''}

**Lead ID:** ${lead.id}`
        : `**Tax Intake Form Started** (Partial Submission)

**Basic Information:**
- Name: ${first_name} ${last_name}
- Email: ${email}
- Phone: ${phone}

**Address:**
${address_line_1 || 'Not provided'}
${city ? `${city}, ${state} ${zip_code}` : 'Not provided'}

**Status:** Lead saved partial information (Page 2/3 completed)

**Attribution:**
- Source: ${attributionResult.attribution.attributionMethod || 'Direct'}
${attributionResult.attribution.referrerUsername ? `- Referrer: ${attributionResult.attribution.referrerUsername}` : ''}

**Lead ID:** ${lead.id}`;

      await prisma.cRMInteraction.create({
        data: {
          contactId: crmContact.id,
          type: 'NOTE',
          direction: 'INBOUND',
          subject: isCompleteTaxIntake
            ? '📋 Complete Tax Intake Form Submitted'
            : '📝 Tax Intake Form Started (Partial)',
          body: interactionBody,
          occurredAt: new Date(),
        },
      });

      logger.info('CRM interaction created for tax intake submission', {
        contactId: crmContact.id,
        leadId: lead.id,
        isComplete: isCompleteTaxIntake,
      });

      // ========================================
      // LEAD SCORING: Calculate and update score
      // ========================================
      try {
        const scoreBreakdown = await CRMLeadScoringService.updateContactScore(
          crmContact.id,
          'tax_intake_form'
        );
        logger.info('Lead score calculated for CRM contact', {
          contactId: crmContact.id,
          score: scoreBreakdown.total,
          breakdown: {
            emailEngagement: scoreBreakdown.emailEngagement,
            interactions: scoreBreakdown.interactions,
            stage: scoreBreakdown.stage,
            recency: scoreBreakdown.recency,
          },
        });
      } catch (scoreError) {
        // Log error but don't fail - scoring can be recalculated later
        logger.error('Failed to calculate lead score', {
          contactId: crmContact.id,
          error: scoreError,
        });
      }
    } catch (crmError) {
      // CRITICAL: Enhanced logging for CRM creation failures
      // This helps debug why CRM contacts might not be appearing in the admin view
      logger.error('CRITICAL: Failed to create CRM contact/interaction', {
        error: crmError instanceof Error ? crmError.message : String(crmError),
        stack: crmError instanceof Error ? crmError.stack : undefined,
        leadId: lead.id,
        email: email,
        assignedPreparerId: assignedPreparerId,
        referrerUsername: attributionResult.attribution.referrerUsername,
        timestamp: new Date().toISOString(),
      });
      // Note: We silently continue so leads are saved even if CRM creation fails
      // Run the backfill script if CRM contacts are missing: npx tsx scripts/backfill-crm-contacts.ts
    }

    // ========================================
    // EMAIL NOTIFICATION REMOVED
    // Email is now ONLY sent from /api/tax-intake/submit endpoint
    // This prevents duplicate emails when users navigate through the form
    // The /submit endpoint handles the final submission with PDF attachments
    // ========================================
    logger.info('Lead saved - email will be sent on final submit via /api/tax-intake/submit', {
      leadId: lead.id,
      isCompleteTaxIntake,
      assignedPreparerId,
    });

    // Track journey stage: INTAKE_COMPLETED (Epic 6)
    const attribution = await getUTMCookie();
    if (attribution) {
      await trackJourneyStage({
        trackingCode: attribution.trackingCode,
        stage: 'INTAKE_COMPLETED',
        metadata: {
          leadId: lead.id,
          email: lead.email,
        },
      });
    }

    // ========================================
    // SCHEDULE CLIENT REFERRAL INVITATION EMAIL
    // Send 30 minutes after lead form completion
    // ========================================
    try {
      // Get the preparer's tracking code for the referral link
      // NOTE: assignedPreparerId IS the Profile.id (not User.id)
      let preparerCode = 'tg'; // Default to Tax Genius
      if (assignedPreparerId) {
        const preparerProfile = await prisma.profile.findUnique({
          where: { id: assignedPreparerId },
          select: { customTrackingCode: true, trackingCode: true },
        });
        if (preparerProfile) {
          preparerCode = preparerProfile.customTrackingCode || preparerProfile.trackingCode || 'tg';
        }
      }

      // Generate unique referral code for this lead
      const referralCode = generateReferralCode();
      const referralLink = buildReferralLink(preparerCode, first_name || 'Friend', referralCode);

      // Schedule referral invitation email for 30 minutes from now
      const scheduledEmailId = await scheduleReferralInvitationEmail(
        lead.id,
        referralCode,
        referralLink
      );

      if (scheduledEmailId) {
        logger.info('Referral invitation email scheduled', {
          leadId: lead.id,
          scheduledEmailId,
          referralCode,
        });
      }
    } catch (referralError) {
      // Log error but don't fail the request - lead was already saved
      logger.error('Failed to schedule referral invitation email', {
        error: referralError,
        leadId: lead.id,
      });
    }

    // Send Telegram notification for complete tax intakes (non-blocking)
    if (isCompleteTaxIntake) {
      sendLeadToTelegram({
        formType: '📋 TAX INTAKE (Complete)',
        firstName: first_name,
        lastName: last_name,
        email,
        phone,
        zipCode: zip_code,
        locale: (locale as 'en' | 'es') || 'en',
        refCode: attributionResult.attribution.referrerUsername || undefined,
        source: 'tax_intake_form',
        additionalFields: {
          'Filing Status': filing_status || 'Not provided',
          'Employment': employment_type || 'Not provided',
          'Dependents': has_dependents ? (number_of_dependents || '1+') : '0',
          'Wants Advance': wants_refund_advance ? 'Yes' : 'No',
        },
      }).catch(err => logger.error('Telegram notification failed', { error: err }));
    }

    return NextResponse.json(
      {
        success: true,
        leadId: lead.id,
        message: 'Lead information saved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error saving lead:', error);
    return NextResponse.json({ error: 'Failed to save lead information' }, { status: 500 });
  }
}
