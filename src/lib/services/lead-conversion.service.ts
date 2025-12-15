/**
 * Lead Conversion Service
 *
 * Handles automatic conversion of TaxIntakeLead records to CLIENT profiles
 * when users sign up after filling out the tax intake form.
 *
 * Flow:
 * 1. User fills /start-filing/form → TaxIntakeLead created
 * 2. User signs up → Clerk webhook fires
 * 3. Service detects lead by email
 * 4. Creates CLIENT profile
 * 5. Creates TaxReturn from lead data
 * 6. Links everything together
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { assignTrackingCodeToUser } from './tracking-code.service';
import type { TaxIntakeLead, Profile, TaxReturn } from '@prisma/client';

interface ConversionResult {
  success: boolean;
  profileId?: string;
  taxReturnId?: string;
  error?: string;
}

/**
 * Find TaxIntakeLead by email
 */
export async function findLeadByEmail(email: string): Promise<TaxIntakeLead | null> {
  try {
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { email: email.toLowerCase() },
    });

    return lead;
  } catch (error) {
    logger.error('Error finding lead by email:', { email, error });
    return null;
  }
}

/**
 * Convert TaxIntakeLead to CLIENT profile and TaxReturn
 */
export async function convertLeadToClient(
  leadId: string,
  userId: string
): Promise<ConversionResult> {
  try {
    logger.info(`Starting lead-to-client conversion for lead ${leadId}`);

    // 1. Get the lead
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }

    if (lead.convertedToClient) {
      logger.warn(`Lead ${leadId} already converted`);
      return {
        success: true,
        profileId: lead.profileId || undefined,
        taxReturnId: lead.taxReturnId || undefined,
      };
    }

    // 2. Create CLIENT profile
    const profile = await createProfileFromLead(lead, userId);
    logger.info(`Created CLIENT profile ${profile.id} for lead ${leadId}`);

    // 3. Assign tracking code
    await assignTrackingCodeToUser(
      profile.id,
      process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'
    );
    logger.info(`Assigned tracking code to profile ${profile.id}`);

    // 3.5. Auto-assign to preparer (use lead's assigned preparer OR Tax Genius default)
    const preparerId = lead.assignedPreparerId || process.env.TAX_GENIUS_PREPARER_ID;

    if (preparerId) {
      try {
        await prisma.clientPreparer.create({
          data: {
            clientId: profile.id,
            preparerId: preparerId,
            isActive: true,
          },
        });

        if (lead.assignedPreparerId) {
          logger.info(`✅ Auto-assigned client ${profile.id} to their referrer preparer ${preparerId}`);
        } else {
          logger.info(`✅ Auto-assigned client ${profile.id} to Tax Genius default preparer ${preparerId}`);
        }
      } catch (error) {
        logger.error(`Failed to auto-assign client to preparer:`, error);
      }
    } else {
      logger.warn('⚠️  No preparer assignment: lead has no assignedPreparerId and TAX_GENIUS_PREPARER_ID not set');
    }

    // 4. Create TaxReturn from lead data
    const taxReturn = await createTaxReturnFromLead(lead, profile.id);
    logger.info(`Created TaxReturn ${taxReturn.id} for profile ${profile.id}`);

    // 5. Link lead to profile and tax return
    await linkLeadToProfile(leadId, profile.id, taxReturn.id);
    logger.info(`Linked lead ${leadId} to profile ${profile.id} and tax return ${taxReturn.id}`);

    logger.info(`✅ Successfully converted lead ${leadId} to CLIENT`);

    return {
      success: true,
      profileId: profile.id,
      taxReturnId: taxReturn.id,
    };
  } catch (error) {
    logger.error('Error converting lead to client:', { leadId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create CLIENT profile from TaxIntakeLead
 */
async function createProfileFromLead(lead: TaxIntakeLead, userId: string): Promise<Profile> {
  // Check if profile already exists for this Clerk user
  const existingProfile = await prisma.profile.findUnique({
    where: { userId },
  });

  if (existingProfile) {
    logger.info(`Profile already exists for ${userId}, using existing profile`);
    return existingProfile;
  }

  const profile = await prisma.profile.create({
    data: {
      userId,
      role: 'CLIENT',
      firstName: lead.first_name,
      lastName: lead.last_name,
      phone: lead.phone,
      affiliateStatus: 'APPROVED',
      affiliateApprovedAt: new Date(),
      // Store address in encrypted JSON format
      address: lead.address_line_1
        ? {
            line1: lead.address_line_1,
            line2: lead.address_line_2 || undefined,
            city: lead.city,
            state: lead.state,
            zipCode: lead.zip_code,
          }
        : undefined,
    },
  });

  return profile;
}

/**
 * Create TaxReturn from TaxIntakeLead form data
 */
async function createTaxReturnFromLead(lead: TaxIntakeLead, profileId: string): Promise<TaxReturn> {
  const currentYear = new Date().getFullYear();
  const taxYear = currentYear - 1; // Previous year's taxes

  // Check if tax return already exists for this year
  const existingReturn = await prisma.taxReturn.findUnique({
    where: {
      profileId_taxYear: {
        profileId,
        taxYear,
      },
    },
  });

  if (existingReturn) {
    logger.info(`TaxReturn already exists for profile ${profileId} year ${taxYear}`);
    return existingReturn;
  }

  // Create tax return with form data from lead
  const taxReturn = await prisma.taxReturn.create({
    data: {
      profileId,
      taxYear,
      status: 'DRAFT',
      formData: lead.full_form_data || {},
    },
  });

  return taxReturn;
}

/**
 * Link TaxIntakeLead to Profile and TaxReturn
 */
async function linkLeadToProfile(
  leadId: string,
  profileId: string,
  taxReturnId: string
): Promise<void> {
  await prisma.taxIntakeLead.update({
    where: { id: leadId },
    data: {
      profileId,
      taxReturnId,
      convertedToClient: true,
      convertedAt: new Date(),
    },
  });
}

/**
 * Check if user has unconverted lead
 * Used by auth flow to determine if role selection should be skipped
 */
export async function hasUnconvertedLead(email: string): Promise<{
  hasLead: boolean;
  leadId?: string;
  convertedToClient?: boolean;
}> {
  try {
    const lead = await findLeadByEmail(email);

    if (!lead) {
      return { hasLead: false };
    }

    return {
      hasLead: true,
      leadId: lead.id,
      convertedToClient: lead.convertedToClient,
    };
  } catch (error) {
    logger.error('Error checking for unconverted lead:', { email, error });
    return { hasLead: false };
  }
}

/**
 * Convert TaxIntakeLead to AFFILIATE CLIENT
 * Same as client but with affiliate status and referral links
 */
export async function convertLeadToAffiliateClient(
  leadId: string,
  userId: string
): Promise<ConversionResult> {
  try {
    logger.info(`Starting lead-to-affiliate-client conversion for lead ${leadId}`);

    // 1. Get the lead
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }

    if (lead.convertedToClient) {
      logger.warn(`Lead ${leadId} already converted`);
      return {
        success: true,
        profileId: lead.profileId || undefined,
        taxReturnId: lead.taxReturnId || undefined,
      };
    }

    // 2. Create CLIENT profile with APPROVED affiliate status
    const profile = await createAffiliateProfileFromLead(lead, userId);
    logger.info(`Created AFFILIATE CLIENT profile ${profile.id} for lead ${leadId}`);

    // 3. Assign tracking code and generate referral links
    await assignTrackingCodeToUser(
      profile.id,
      process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'
    );
    logger.info(`Assigned tracking code and referral links to affiliate profile ${profile.id}`);

    // 4. Auto-assign to preparer
    const preparerId = lead.assignedPreparerId || process.env.TAX_GENIUS_PREPARER_ID;
    if (preparerId) {
      try {
        await prisma.clientPreparer.create({
          data: {
            clientId: profile.id,
            preparerId: preparerId,
            isActive: true,
          },
        });
        logger.info(`Auto-assigned affiliate client ${profile.id} to preparer ${preparerId}`);
      } catch (error) {
        logger.error(`Failed to auto-assign affiliate client to preparer:`, error);
      }
    }

    // 5. Create TaxReturn from lead data
    const taxReturn = await createTaxReturnFromLead(lead, profile.id);
    logger.info(`Created TaxReturn ${taxReturn.id} for affiliate profile ${profile.id}`);

    // 6. Link lead to profile and tax return
    await linkLeadToProfile(leadId, profile.id, taxReturn.id);
    logger.info(`Linked lead ${leadId} to affiliate profile ${profile.id}`);

    logger.info(`✅ Successfully converted lead ${leadId} to AFFILIATE CLIENT`);

    return {
      success: true,
      profileId: profile.id,
      taxReturnId: taxReturn.id,
    };
  } catch (error) {
    logger.error('Error converting lead to affiliate client:', { leadId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create AFFILIATE CLIENT profile from TaxIntakeLead
 * Includes affiliate status APPROVED and will get referral links
 */
async function createAffiliateProfileFromLead(lead: TaxIntakeLead, userId: string): Promise<Profile> {
  // Check if profile already exists
  const existingProfile = await prisma.profile.findUnique({
    where: { userId },
  });

  if (existingProfile) {
    // Update existing profile to have affiliate status
    const updatedProfile = await prisma.profile.update({
      where: { id: existingProfile.id },
      data: {
        affiliateStatus: 'APPROVED',
        affiliateApprovedAt: existingProfile.affiliateApprovedAt || new Date(),
      },
    });
    logger.info(`Updated existing profile ${userId} to affiliate status`);
    return updatedProfile;
  }

  const profile = await prisma.profile.create({
    data: {
      userId,
      role: 'client',
      firstName: lead.first_name,
      lastName: lead.last_name,
      phone: lead.phone,
      affiliateStatus: 'APPROVED',
      affiliateApprovedAt: new Date(),
      address: lead.address_line_1
        ? {
            line1: lead.address_line_1,
            line2: lead.address_line_2 || undefined,
            city: lead.city,
            state: lead.state,
            zipCode: lead.zip_code,
          }
        : undefined,
    },
  });

  return profile;
}

interface PreparerApplicationResult {
  success: boolean;
  applicationId?: string;
  error?: string;
}

/**
 * Create Tax Preparer Application from TaxIntakeLead
 * Pre-fills application with lead's info and routes to admin for approval
 */
export async function createPreparerApplicationFromLead(
  leadId: string,
  notes?: string
): Promise<PreparerApplicationResult> {
  try {
    logger.info(`Creating preparer application from lead ${leadId}`);

    // 1. Get the lead
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }

    // 2. Check if application already exists for this email
    const existingApp = await prisma.preparerApplication.findFirst({
      where: { email: lead.email.toLowerCase() },
    });

    if (existingApp) {
      return {
        success: false,
        error: `A preparer application already exists for ${lead.email} (Status: ${existingApp.status})`,
      };
    }

    // 3. Create preparer application with lead data
    const application = await prisma.preparerApplication.create({
      data: {
        firstName: lead.first_name,
        middleName: lead.middle_name,
        lastName: lead.last_name,
        email: lead.email.toLowerCase(),
        phone: lead.phone,
        status: 'PENDING',
        stage: 'NEW',
        notes: notes
          ? `Converted from tax intake lead.\n\nConversion Notes: ${notes}`
          : 'Converted from tax intake lead.',
        // Store original lead ID for reference
        metadata: {
          sourceLeadId: leadId,
          convertedAt: new Date().toISOString(),
        },
      },
    });

    // 4. Update lead with conversion info (but don't mark as convertedToClient since they're becoming a preparer)
    await prisma.taxIntakeLead.update({
      where: { id: leadId },
      data: {
        contactNotes: lead.contactNotes
          ? `${lead.contactNotes}\n\n[${new Date().toISOString()}] Converted to preparer application (ID: ${application.id})`
          : `[${new Date().toISOString()}] Converted to preparer application (ID: ${application.id})`,
        updated_at: new Date(),
      },
    });

    // 5. Create lead activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        activityType: 'STATUS_CHANGED',
        title: 'Lead converted to Tax Preparer Application',
        description: `Created preparer application ${application.id}. Awaiting admin approval.`,
        metadata: {
          applicationId: application.id,
          conversionType: 'preparer',
        },
      },
    });

    logger.info(`✅ Created preparer application ${application.id} from lead ${leadId}`);

    return {
      success: true,
      applicationId: application.id,
    };
  } catch (error) {
    logger.error('Error creating preparer application from lead:', { leadId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
