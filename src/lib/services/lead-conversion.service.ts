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

/**
 * Get Owliver's Profile ID
 * Owliver Owl (taxgenius.tax@gmail.com) is the default preparer for rejected preparer applicants
 * who are converted to clients/affiliates.
 *
 * @returns Owliver's profile ID or null if not found
 */
async function getOwliverProfileId(): Promise<string | null> {
  // Check environment variable first
  if (process.env.OWLIVER_PROFILE_ID) {
    return process.env.OWLIVER_PROFILE_ID;
  }

  // Fall back to dynamic lookup by tracking code
  const owliver = await prisma.profile.findFirst({
    where: { customTrackingCode: 'ow' },
    select: { id: true },
  });

  if (owliver) {
    return owliver.id;
  }

  // Last resort: lookup by email
  const owliverUser = await prisma.user.findUnique({
    where: { email: 'taxgenius.tax@gmail.com' },
    include: { profile: { select: { id: true } } },
  });

  return owliverUser?.profile?.id || null;
}

/**
 * Assign a client to Owliver Owl as their managing preparer
 * Creates a ClientPreparer relationship
 */
async function assignClientToOwliver(clientProfileId: string, clientEmail: string): Promise<boolean> {
  try {
    const owliverProfileId = await getOwliverProfileId();

    if (!owliverProfileId) {
      logger.warn(`⚠️ Could not find Owliver's profile ID - skipping client assignment for ${clientEmail}`);
      return false;
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.clientPreparer.findUnique({
      where: {
        clientId_preparerId: {
          clientId: clientProfileId,
          preparerId: owliverProfileId,
        },
      },
    });

    if (existingAssignment) {
      logger.info(`Client ${clientEmail} already assigned to Owliver`);
      return true;
    }

    // Create new assignment
    await prisma.clientPreparer.create({
      data: {
        clientId: clientProfileId,
        preparerId: owliverProfileId,
        isActive: true,
      },
    });

    logger.info(`✅ Assigned rejected preparer ${clientEmail} to Owliver as client`);
    return true;
  } catch (error) {
    logger.error(`Failed to assign client ${clientEmail} to Owliver:`, error);
    return false;
  }
}

interface ConversionResult {
  success: boolean;
  profileId?: string;
  taxReturnId?: string;
  error?: string;
}

/**
 * Find TaxIntakeLead by email
 * Returns the most recent lead for this email (highest tax_year)
 */
export async function findLeadByEmail(email: string): Promise<TaxIntakeLead | null> {
  try {
    const lead = await prisma.taxIntakeLead.findFirst({
      where: { email: email.toLowerCase() },
      orderBy: { tax_year: 'desc' },
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
      role: 'client',
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

interface RejectedPreparerConversionResult {
  success: boolean;
  profileId?: string;
  error?: string;
  requiresSignup?: boolean;
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
        languages: 'English', // Default - admin can update during review
        status: 'PENDING',
        stage: 'NEW',
        notes: notes
          ? `Converted from tax intake lead (ID: ${leadId}).\n\nConversion Notes: ${notes}`
          : `Converted from tax intake lead (ID: ${leadId}).`,
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

/**
 * Convert a rejected preparer application to Client or Affiliate Client
 * Used when admin rejects a preparer application but wants to keep them as a customer
 *
 * @param applicationId - PreparerApplication ID
 * @param conversionType - 'client' (standard) or 'affiliate' (special pricing + referral links)
 */
export async function convertRejectedPreparerToClient(
  applicationId: string,
  conversionType: 'client' | 'affiliate'
): Promise<RejectedPreparerConversionResult> {
  try {
    logger.info(`Converting rejected preparer application ${applicationId} to ${conversionType}`);

    // 1. Get the preparer application
    const application = await prisma.preparerApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // 2. Check if user already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: application.email.toLowerCase() },
      include: { profile: true },
    });

    if (existingUser && existingUser.profile) {
      // User already exists - update their profile if needed
      if (conversionType === 'affiliate' && existingUser.profile.affiliateStatus !== 'APPROVED') {
        await prisma.profile.update({
          where: { id: existingUser.profile.id },
          data: {
            affiliateStatus: 'APPROVED',
            affiliateApprovedAt: existingUser.profile.affiliateApprovedAt || new Date(),
          },
        });

        // Assign tracking code if affiliate and doesn't have one
        if (!existingUser.profile.customTrackingCode) {
          await assignTrackingCodeToUser(
            existingUser.profile.id,
            process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'
          );
        }

        logger.info(`Updated existing profile ${existingUser.profile.id} to affiliate status`);
      }

      // Update application with converted profile reference
      await prisma.preparerApplication.update({
        where: { id: applicationId },
        data: {
          notes: application.notes
            ? `${application.notes}\n\n[${new Date().toISOString()}] Rejected but converted to ${conversionType}. Profile ID: ${existingUser.profile.id}`
            : `[${new Date().toISOString()}] Rejected but converted to ${conversionType}. Profile ID: ${existingUser.profile.id}`,
        },
      });

      // Assign to Owliver as their managing preparer
      await assignClientToOwliver(existingUser.profile.id, application.email);

      return {
        success: true,
        profileId: existingUser.profile.id,
      };
    }

    // 3. User doesn't exist - they need to sign up first
    // Store the conversion intent in application notes
    // Also mark for Owliver assignment when they sign up
    await prisma.preparerApplication.update({
      where: { id: applicationId },
      data: {
        notes: application.notes
          ? `${application.notes}\n\n[${new Date().toISOString()}] Rejected but marked for ${conversionType} conversion. Awaiting user signup.\n[PENDING_CONVERSION:${conversionType}]\n[ASSIGN_TO_OWLIVER]`
          : `[${new Date().toISOString()}] Rejected but marked for ${conversionType} conversion. Awaiting user signup.\n[PENDING_CONVERSION:${conversionType}]\n[ASSIGN_TO_OWLIVER]`,
      },
    });

    logger.info(`Marked application ${applicationId} for ${conversionType} conversion + Owliver assignment - awaiting signup`);

    return {
      success: true,
      requiresSignup: true,
    };
  } catch (error) {
    logger.error('Error converting rejected preparer to client:', { applicationId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create Client profile directly from preparer application data
 * Used when we have the userId (after user signs up)
 */
export async function createClientFromPreparerApplication(
  applicationId: string,
  userId: string,
  conversionType: 'client' | 'affiliate'
): Promise<RejectedPreparerConversionResult> {
  try {
    logger.info(`Creating ${conversionType} profile from preparer application ${applicationId}`);

    // 1. Get the preparer application
    const application = await prisma.preparerApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // 2. Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      // Update existing profile if converting to affiliate
      if (conversionType === 'affiliate' && existingProfile.affiliateStatus !== 'APPROVED') {
        await prisma.profile.update({
          where: { id: existingProfile.id },
          data: {
            affiliateStatus: 'APPROVED',
            affiliateApprovedAt: existingProfile.affiliateApprovedAt || new Date(),
          },
        });

        if (!existingProfile.customTrackingCode) {
          await assignTrackingCodeToUser(
            existingProfile.id,
            process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'
          );
        }
      }

      // Assign to Owliver as their managing preparer (for rejected preparer applicants)
      if (application.notes?.includes('[ASSIGN_TO_OWLIVER]')) {
        await assignClientToOwliver(existingProfile.id, application.email);
      }

      return {
        success: true,
        profileId: existingProfile.id,
      };
    }

    // 3. Create new profile
    const profile = await prisma.profile.create({
      data: {
        userId,
        role: 'client',
        firstName: application.firstName,
        lastName: application.lastName,
        phone: application.phone,
        affiliateStatus: conversionType === 'affiliate' ? 'APPROVED' : 'APPROVED',
        affiliateApprovedAt: new Date(),
      },
    });

    logger.info(`Created ${conversionType} profile ${profile.id} from application ${applicationId}`);

    // 4. Assign tracking code (for both client and affiliate - all clients get tracking)
    await assignTrackingCodeToUser(
      profile.id,
      process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'
    );
    logger.info(`Assigned tracking code to profile ${profile.id}`);

    // 5. Assign to Owliver as their managing preparer (for rejected preparer applicants)
    if (application.notes?.includes('[ASSIGN_TO_OWLIVER]')) {
      await assignClientToOwliver(profile.id, application.email);
    }

    // 6. Update application with profile reference
    await prisma.preparerApplication.update({
      where: { id: applicationId },
      data: {
        notes: application.notes
          ? `${application.notes}\n\n[${new Date().toISOString()}] Profile created: ${profile.id} as ${conversionType}`
          : `[${new Date().toISOString()}] Profile created: ${profile.id} as ${conversionType}`,
      },
    });

    return {
      success: true,
      profileId: profile.id,
    };
  } catch (error) {
    logger.error('Error creating client from preparer application:', { applicationId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
