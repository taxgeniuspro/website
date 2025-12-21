import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackJourneyStage } from '@/lib/services/journey-tracking.service';
import { getUTMCookie } from '@/lib/utils/cookie-manager';
import { getAttribution, saveTaxIntakeAttribution } from '@/lib/services/attribution.service';
import { EmailService } from '@/lib/services/email.service';
import { logger } from '@/lib/logger';
import { getEmailRecipients } from '@/config/email-routing';
import { ClientFolderService } from '@/lib/services/client-folder.service';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';
import { addMonths } from 'date-fns';
import {
  generateReferralCode,
  buildReferralLink,
} from '@/lib/services/client-referral.service';
import { scheduleReferralInvitationEmail } from '@/lib/services/scheduled-email.service';
import { generateTaxIntakePDF } from '@/lib/services/pdf-form-generator.service';

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
            // Use Profile.id (not User.id) to match dashboard queries
            assignedPreparerId = referrerProfile.id;
            logger.info(`Lead from TAX_PREPARER referral assigned to that preparer`, {
              preparerId: assignedPreparerId,
              profileId: referrerProfile.id,
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
        // Query for any documents uploaded for this lead (e.g., driver's license)
        const documentUrls: { driversLicenseUrl?: string; additionalDocUrls?: string[] } = {};
        try {
          if (lead.clientFolderId) {
            const documents = await prisma.document.findMany({
              where: {
                folderId: lead.clientFolderId,
                isDeleted: false,
              },
              select: {
                fileUrl: true,
                metadata: true,
                type: true,
              },
            });

            // Categorize documents by type
            for (const doc of documents) {
              const metadata = doc.metadata as { documentType?: string } | null;
              if (metadata?.documentType === 'drivers_license' || doc.type === 'OTHER') {
                // First ID document found becomes driver's license
                if (!documentUrls.driversLicenseUrl) {
                  documentUrls.driversLicenseUrl = doc.fileUrl;
                } else {
                  // Additional documents
                  if (!documentUrls.additionalDocUrls) {
                    documentUrls.additionalDocUrls = [];
                  }
                  documentUrls.additionalDocUrls.push(doc.fileUrl);
                }
              }
            }

            logger.info('Found documents for PDF embedding', {
              leadId: lead.id,
              folderId: lead.clientFolderId,
              documentCount: documents.length,
              hasDriversLicense: !!documentUrls.driversLicenseUrl,
              additionalDocs: documentUrls.additionalDocUrls?.length || 0,
            });
          }
        } catch (docError) {
          logger.error('Failed to query documents for PDF', { leadId: lead.id, error: docError });
          // Continue without documents
        }

        // Generate professional PDF form for email attachment
        let pdfAttachment: { filename: string; content: Buffer } | undefined;
        try {
          const pdfBuffer = await generateTaxIntakePDF({
            id: lead.id,
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
            // Identity Information
            date_of_birth,
            ssn,
            // Tax Filing Information
            filing_status,
            employment_type,
            occupation,
            claimed_as_dependent,
            in_college,
            // Dependents
            has_dependents,
            number_of_dependents,
            dependents_under_24_student_or_disabled,
            dependents_in_college,
            child_care_provider,
            // Property & Tax Credits
            has_mortgage,
            denied_eitc,
            // IRS & Refund
            has_irs_pin,
            irs_pin,
            wants_refund_advance,
            // Identification Documents
            drivers_license,
            license_expiration,
            // Attribution
            referrerUsername: attributionResult.attribution.referrerUsername,
            referrerType: attributionResult.attribution.referrerType,
            tax_year,
            created_at: lead.created_at,
            // Include document URLs for PDF embedding
            drivers_license_url: documentUrls.driversLicenseUrl,
            additional_document_urls: documentUrls.additionalDocUrls,
          });
          pdfAttachment = {
            filename: `TaxIntake_${last_name}_${lead.id.slice(-6).toUpperCase()}.pdf`,
            content: pdfBuffer,
          };
          logger.info('PDF form generated for tax intake', {
            leadId: lead.id,
            filename: pdfAttachment.filename,
            size: pdfBuffer.length,
          });
        } catch (pdfError) {
          // Log error but don't fail - email will be sent without attachment
          logger.error('Failed to generate PDF form for tax intake', {
            leadId: lead.id,
            error: pdfError,
          });
        }

        // Fetch image attachments if driver's license URL exists
        let imageAttachments: Array<{ filename: string; content: Buffer }> | undefined;
        if (documentUrls.driversLicenseUrl) {
          try {
            const response = await fetch(documentUrls.driversLicenseUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const contentType = response.headers.get('content-type') || 'image/jpeg';
              const ext = contentType.includes('png') ? 'png' : contentType.includes('pdf') ? 'pdf' : 'jpg';
              imageAttachments = [{
                filename: `DriversLicense_${last_name}.${ext}`,
                content: buffer,
              }];
              logger.info('Driver license image fetched for email attachment', {
                leadId: lead.id,
                size: buffer.length,
              });
            }
          } catch (imgFetchError) {
            logger.error('Failed to fetch driver license for email attachment', {
              leadId: lead.id,
              error: imgFetchError,
            });
            // Continue without image attachment
          }
        }

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
          licenseFileUrl: documentUrls.driversLicenseUrl,
          // Attribution
          source: attributionResult.attribution.attributionMethod || 'direct',
          referrerUsername: attributionResult.attribution.referrerUsername,
          referrerType: attributionResult.attribution.referrerType,
          attributionMethod: attributionResult.attribution.attributionMethod,
        }, ccEmail, (locale as 'en' | 'es') || 'en', pdfAttachment, imageAttachments);
        logger.info('Comprehensive tax intake email sent with attachments', {
          leadId: lead.id,
          recipient: emailRecipient,
          cc: ccEmail,
          locale: locale || 'en',
          hasPdfAttachment: !!pdfAttachment,
          hasImageAttachments: !!imageAttachments && imageAttachments.length > 0,
        });
      } else {
        // PARTIAL SAVE: Don't send email notification for incomplete submissions
        // Users only want to be notified when the full form with all data is submitted
        // This prevents confusing "New Lead" emails with only name/phone
        logger.info('Partial tax intake saved - no email sent (waiting for full submission)', {
          leadId: lead.id,
          hasSSN: !!ssn,
          hasDOB: !!date_of_birth,
          hasFilingStatus: !!filing_status,
          savedFields: {
            first_name: !!first_name,
            last_name: !!last_name,
            email: !!email,
            phone: !!phone,
            address: !!address_line_1,
          },
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
