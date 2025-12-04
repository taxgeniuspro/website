import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackJourneyStage } from '@/lib/services/journey-tracking.service';
import { getUTMCookie } from '@/lib/utils/cookie-manager';
import { getAttribution, saveTaxIntakeAttribution } from '@/lib/services/attribution.service';
import { EmailService } from '@/lib/services/email.service';
import { logger } from '@/lib/logger';
import { getEmailRecipients } from '@/config/email-routing';

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
    } = body;

    // Validate required fields
    if (!first_name || !last_name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if this is a complete tax intake (has SSN and other tax fields) or just basic contact
    const isCompleteTaxIntake = Boolean(ssn && date_of_birth && filing_status);

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
            // CLIENT refers → Assign to Tax Genius (null = corporate)
            // TODO: Look up client's assigned preparer via CRMContact or ClientPreparer relation
            assignedPreparerId = null;
            logger.info(`Lead from CLIENT referral assigned to Tax Genius corporate`, {
              referrerId: referrerProfile.id,
            });
            break;

          case 'affiliate':
            // AFFILIATE refers → Assign to Tax Genius (null = corporate)
            assignedPreparerId = null;
            logger.info(`Lead from AFFILIATE referral assigned to Tax Genius corporate`, {
              referrerId: referrerProfile.id,
            });
            break;

          case 'tax_preparer':
            // TAX_PREPARER refers → Assign to THAT tax preparer
            assignedPreparerId = referrerProfile.userId;
            logger.info(`Lead from TAX_PREPARER referral assigned to that preparer`, {
              preparerId: assignedPreparerId,
            });
            break;

          default:
            // Default: assign to Tax Genius
            assignedPreparerId = null;
            logger.info(`Lead with unknown referrer role assigned to Tax Genius`, {
              role: referrerProfile.role,
            });
        }
      }
    }

    // Check if lead already exists by email
    let lead = await prisma.taxIntakeLead.findUnique({
      where: { email },
    });

    if (lead) {
      // Update existing lead
      lead = await prisma.taxIntakeLead.update({
        where: { email },
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
      // Create new lead
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
          // EPIC 6: Attribution fields
          referrerUsername: attributionResult.attribution.referrerUsername,
          referrerType: attributionResult.attribution.referrerType,
          attributionMethod: attributionResult.attribution.attributionMethod,
          // CRITICAL: Smart lead assignment
          assignedPreparerId: assignedPreparerId,
          // Store complete tax intake data if provided
          full_form_data: full_form_data,
        },
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
          taxYear: new Date().getFullYear(), // Current tax year
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
    } catch (crmError) {
      // Log error but don't fail the request - lead was already saved
      logger.error('Failed to create CRM contact/interaction', {
        error: crmError,
        leadId: lead.id,
        email: email,
      });
    }

    // ========================================
    // LANGUAGE-BASED EMAIL ROUTING (using centralized config)
    // Spanish → Goldenprotaxes@gmail.com (Ale Hamilton) + CC to taxgenius.tax@gmail.com (Owliver Owl)
    // English → taxgenius.taxes@gmail.com (Ray Hamilton) + CC to taxgenius.tax@gmail.com (Owliver Owl)
    // ========================================

    // Determine primary recipient based on locale
    const recipients = getEmailRecipients((locale as 'en' | 'es') || 'en');
    const ccEmail = recipients.cc; // Always CC to Owliver Owl

    logger.info('Language-based email routing', {
      locale: locale || 'en',
      primaryRecipient: recipients.primary,
      ccRecipient: ccEmail,
      assignedPreparerId: assignedPreparerId || 'None (using language-based routing)',
    });

    // Send email notification to assigned preparer (if assigned) OR to language-based recipient
    const emailRecipient = assignedPreparerId || recipients.primary;

    try {
      // Send comprehensive tax intake email if all tax details are provided
      if (isCompleteTaxIntake) {
        await EmailService.sendTaxIntakeCompleteEmail(emailRecipient, {
          leadId: lead.id,
          // Personal Information
          firstName: first_name,
          middleName: middle_name,
          lastName: last_name,
          email: email,
          phone: phone,
          countryCode: country_code || '+1',
          dateOfBirth: date_of_birth,
          ssn: ssn,
          // Address
          addressLine1: address_line_1,
          addressLine2: address_line_2,
          city: city,
          state: state,
          zipCode: zip_code,
          // Tax Filing Details
          filingStatus: filing_status,
          employmentType: employment_type,
          occupation: occupation,
          claimedAsDependent: claimed_as_dependent,
          // Education
          inCollege: in_college,
          // Dependents
          hasDependents: has_dependents,
          numberOfDependents: number_of_dependents,
          dependentsUnder24StudentOrDisabled: dependents_under_24_student_or_disabled,
          dependentsInCollege: dependents_in_college,
          childCareProvider: child_care_provider,
          // Property
          hasMortgage: has_mortgage,
          // Tax Credits
          deniedEitc: denied_eitc,
          // IRS Information
          hasIrsPin: has_irs_pin,
          irsPin: irs_pin,
          // Refund Preferences
          wantsRefundAdvance: wants_refund_advance,
          // Identification
          driversLicense: drivers_license,
          licenseExpiration: license_expiration,
          licenseFileUrl: undefined, // TODO: Add file upload handling
          // Attribution
          source: attributionResult.attribution.attributionMethod || 'direct',
          referrerUsername: attributionResult.attribution.referrerUsername,
          referrerType: attributionResult.attribution.referrerType,
          attributionMethod: attributionResult.attribution.attributionMethod,
        }, ccEmail, (locale as 'en' | 'es') || 'en'); // Pass CC email and locale
        logger.info('Comprehensive tax intake email sent', {
          leadId: lead.id,
          recipient: emailRecipient,
          cc: ccEmail,
          locale: locale || 'en',
        });
      } else {
        // Send basic lead notification for incomplete submissions
        await EmailService.sendNewLeadNotificationEmail(emailRecipient, {
          leadId: lead.id,
          leadName: `${lead.first_name} ${lead.last_name}`,
          leadEmail: lead.email,
          leadPhone: lead.phone || undefined,
          service: 'tax-intake', // Tax intake form submission
          message: undefined, // No message field in tax intake
          source: attributionResult.attribution.attributionMethod || 'direct',
        }, ccEmail, (locale as 'en' | 'es') || 'en'); // Pass CC email and locale
        logger.info('Basic lead notification email sent', {
          leadId: lead.id,
          recipient: emailRecipient,
          cc: ccEmail,
          locale: locale || 'en',
        });
      }
    } catch (emailError) {
      // Log error but don't fail the request
      logger.error('Failed to send email notification', {
        error: emailError,
        leadId: lead.id,
        recipient: emailRecipient,
        isCompleteTaxIntake,
      });
    }

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
