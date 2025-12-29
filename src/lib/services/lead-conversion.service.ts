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

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { assignTrackingCodeToUser } from './tracking-code.service';

// Local type definitions (migrated from Prisma types)
interface TaxIntakeLead {
  id: string;
  email: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  phone?: string | null;
  tax_year: number;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  full_form_data?: Record<string, unknown> | null;
  convertedToClient: boolean;
  profileId?: string | null;
  taxReturnId?: string | null;
  assignedPreparerId?: string | null;
  contactNotes?: string | null;
  referrerUsername?: string | null;
  updated_at?: Date;
}

interface Profile {
  id: string;
  userId: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  affiliateStatus?: string | null;
  affiliateApprovedAt?: Date | null;
  address?: Record<string, unknown> | null;
  customTrackingCode?: string | null;
}

interface TaxReturn {
  id: string;
  profileId: string;
  taxYear: number;
  status: string;
  formData?: Record<string, unknown> | null;
}

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
  const { data: owliverProfiles } = await db
    .from('profiles')
    .select('id')
    .eq('customTrackingCode', 'ow')
    .limit(1);

  const owliver = firstOrNull(owliverProfiles);
  if (owliver) {
    return owliver.id;
  }

  // Last resort: lookup by email
  const { data: owliverUsers } = await db
    .from('users')
    .select('id, profile:profiles!userId (id)')
    .eq('email', 'taxgenius.tax@gmail.com')
    .limit(1);

  const owliverUser = firstOrNull(owliverUsers) as { id: string; profile?: { id: string } | null } | null;
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
    const { data: existingAssignments } = await db
      .from('client_preparers')
      .select('id')
      .eq('clientId', clientProfileId)
      .eq('preparerId', owliverProfileId)
      .limit(1);

    if (existingAssignments && existingAssignments.length > 0) {
      logger.info(`Client ${clientEmail} already assigned to Owliver`);
      return true;
    }

    // Create new assignment
    await db.from('client_preparers').insert({
      clientId: clientProfileId,
      preparerId: owliverProfileId,
      isActive: true,
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
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('*')
      .eq('email', email.toLowerCase())
      .order('tax_year', { ascending: false })
      .limit(1);

    return firstOrNull(leads) as TaxIntakeLead | null;
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
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('*')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads) as TaxIntakeLead | null;

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
        await db.from('client_preparers').insert({
          clientId: profile.id,
          preparerId: preparerId,
          isActive: true,
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
  const { data: existingProfiles } = await db
    .from('profiles')
    .select('*')
    .eq('userId', userId)
    .limit(1);

  const existingProfile = firstOrNull(existingProfiles) as Profile | null;

  if (existingProfile) {
    logger.info(`Profile already exists for ${userId}, using existing profile`);
    return existingProfile;
  }

  const { data: newProfile, error } = await db
    .from('profiles')
    .insert({
      userId,
      role: 'client',
      firstName: lead.first_name,
      lastName: lead.last_name,
      phone: lead.phone,
      affiliateStatus: 'APPROVED',
      affiliateApprovedAt: new Date().toISOString(),
      // Store address in JSON format
      address: lead.address_line_1
        ? {
            line1: lead.address_line_1,
            line2: lead.address_line_2 || undefined,
            city: lead.city,
            state: lead.state,
            zipCode: lead.zip_code,
          }
        : null,
    })
    .select()
    .single();

  if (error || !newProfile) {
    throw new Error(`Failed to create profile: ${error?.message || 'Unknown error'}`);
  }

  return newProfile as Profile;
}

/**
 * Create TaxReturn from TaxIntakeLead form data
 */
async function createTaxReturnFromLead(lead: TaxIntakeLead, profileId: string): Promise<TaxReturn> {
  const currentYear = new Date().getFullYear();
  const taxYear = currentYear - 1; // Previous year's taxes

  // Check if tax return already exists for this year
  const { data: existingReturns } = await db
    .from('tax_returns')
    .select('*')
    .eq('profileId', profileId)
    .eq('taxYear', taxYear)
    .limit(1);

  const existingReturn = firstOrNull(existingReturns) as TaxReturn | null;

  if (existingReturn) {
    logger.info(`TaxReturn already exists for profile ${profileId} year ${taxYear}`);
    return existingReturn;
  }

  // Create tax return with form data from lead
  const { data: newReturn, error } = await db
    .from('tax_returns')
    .insert({
      profileId,
      taxYear,
      status: 'DRAFT',
      formData: lead.full_form_data || {},
    })
    .select()
    .single();

  if (error || !newReturn) {
    throw new Error(`Failed to create tax return: ${error?.message || 'Unknown error'}`);
  }

  return newReturn as TaxReturn;
}

/**
 * Link TaxIntakeLead to Profile and TaxReturn
 */
async function linkLeadToProfile(
  leadId: string,
  profileId: string,
  taxReturnId: string
): Promise<void> {
  await db
    .from('tax_intake_leads')
    .update({
      profileId,
      taxReturnId,
      convertedToClient: true,
      convertedAt: new Date().toISOString(),
    })
    .eq('id', leadId);
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
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('*')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads) as TaxIntakeLead | null;

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
        await db.from('client_preparers').insert({
          clientId: profile.id,
          preparerId: preparerId,
          isActive: true,
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
  const { data: existingProfiles } = await db
    .from('profiles')
    .select('*')
    .eq('userId', userId)
    .limit(1);

  const existingProfile = firstOrNull(existingProfiles) as Profile | null;

  if (existingProfile) {
    // Update existing profile to have affiliate status
    const { data: updatedProfile, error } = await db
      .from('profiles')
      .update({
        affiliateStatus: 'APPROVED',
        affiliateApprovedAt: existingProfile.affiliateApprovedAt || new Date().toISOString(),
      })
      .eq('id', existingProfile.id)
      .select()
      .single();

    if (error || !updatedProfile) {
      throw new Error(`Failed to update profile: ${error?.message || 'Unknown error'}`);
    }
    logger.info(`Updated existing profile ${userId} to affiliate status`);
    return updatedProfile as Profile;
  }

  const { data: newProfile, error } = await db
    .from('profiles')
    .insert({
      userId,
      role: 'client',
      firstName: lead.first_name,
      lastName: lead.last_name,
      phone: lead.phone,
      affiliateStatus: 'APPROVED',
      affiliateApprovedAt: new Date().toISOString(),
      address: lead.address_line_1
        ? {
            line1: lead.address_line_1,
            line2: lead.address_line_2 || undefined,
            city: lead.city,
            state: lead.state,
            zipCode: lead.zip_code,
          }
        : null,
    })
    .select()
    .single();

  if (error || !newProfile) {
    throw new Error(`Failed to create profile: ${error?.message || 'Unknown error'}`);
  }

  return newProfile as Profile;
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
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('*')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads) as TaxIntakeLead | null;

    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }

    // 2. Check if application already exists for this email
    const { data: existingApps } = await db
      .from('preparer_applications')
      .select('id, status')
      .eq('email', lead.email.toLowerCase())
      .limit(1);

    const existingApp = firstOrNull(existingApps) as { id: string; status: string } | null;

    if (existingApp) {
      return {
        success: false,
        error: `A preparer application already exists for ${lead.email} (Status: ${existingApp.status})`,
      };
    }

    // 3. Create preparer application with lead data
    const { data: application, error: createError } = await db
      .from('preparer_applications')
      .insert({
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
      })
      .select()
      .single();

    if (createError || !application) {
      throw new Error(`Failed to create preparer application: ${createError?.message || 'Unknown error'}`);
    }

    // 4. Update lead with conversion info (but don't mark as convertedToClient since they're becoming a preparer)
    await db
      .from('tax_intake_leads')
      .update({
        contactNotes: lead.contactNotes
          ? `${lead.contactNotes}\n\n[${new Date().toISOString()}] Converted to preparer application (ID: ${application.id})`
          : `[${new Date().toISOString()}] Converted to preparer application (ID: ${application.id})`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    // 5. Create lead activity
    await db.from('lead_activities').insert({
      leadId,
      activityType: 'STATUS_CHANGED',
      title: 'Lead converted to Tax Preparer Application',
      description: `Created preparer application ${application.id}. Awaiting admin approval.`,
      metadata: {
        applicationId: application.id,
        conversionType: 'preparer',
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
    const { data: applications } = await db
      .from('preparer_applications')
      .select('*')
      .eq('id', applicationId)
      .limit(1);

    const application = firstOrNull(applications) as {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      notes?: string;
    } | null;

    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // 2. Check if user already exists with this email
    const { data: existingUsers } = await db
      .from('users')
      .select('id, email, profile:profiles!userId (*)')
      .eq('email', application.email.toLowerCase())
      .limit(1);

    const existingUser = firstOrNull(existingUsers) as {
      id: string;
      email: string;
      profile?: Profile | null;
    } | null;

    if (existingUser && existingUser.profile) {
      // User already exists - update their profile if needed
      if (conversionType === 'affiliate' && existingUser.profile.affiliateStatus !== 'APPROVED') {
        await db
          .from('profiles')
          .update({
            affiliateStatus: 'APPROVED',
            affiliateApprovedAt: existingUser.profile.affiliateApprovedAt || new Date().toISOString(),
          })
          .eq('id', existingUser.profile.id);

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
      await db
        .from('preparer_applications')
        .update({
          notes: application.notes
            ? `${application.notes}\n\n[${new Date().toISOString()}] Rejected but converted to ${conversionType}. Profile ID: ${existingUser.profile.id}`
            : `[${new Date().toISOString()}] Rejected but converted to ${conversionType}. Profile ID: ${existingUser.profile.id}`,
        })
        .eq('id', applicationId);

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
    await db
      .from('preparer_applications')
      .update({
        notes: application.notes
          ? `${application.notes}\n\n[${new Date().toISOString()}] Rejected but marked for ${conversionType} conversion. Awaiting user signup.\n[PENDING_CONVERSION:${conversionType}]\n[ASSIGN_TO_OWLIVER]`
          : `[${new Date().toISOString()}] Rejected but marked for ${conversionType} conversion. Awaiting user signup.\n[PENDING_CONVERSION:${conversionType}]\n[ASSIGN_TO_OWLIVER]`,
      })
      .eq('id', applicationId);

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
    const { data: applications } = await db
      .from('preparer_applications')
      .select('*')
      .eq('id', applicationId)
      .limit(1);

    const application = firstOrNull(applications) as {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      notes?: string;
    } | null;

    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // 2. Check if profile already exists
    const { data: existingProfiles } = await db
      .from('profiles')
      .select('*')
      .eq('userId', userId)
      .limit(1);

    const existingProfile = firstOrNull(existingProfiles) as Profile | null;

    if (existingProfile) {
      // Update existing profile if converting to affiliate
      if (conversionType === 'affiliate' && existingProfile.affiliateStatus !== 'APPROVED') {
        await db
          .from('profiles')
          .update({
            affiliateStatus: 'APPROVED',
            affiliateApprovedAt: existingProfile.affiliateApprovedAt || new Date().toISOString(),
          })
          .eq('id', existingProfile.id);

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
    const { data: newProfile, error: createError } = await db
      .from('profiles')
      .insert({
        userId,
        role: 'client',
        firstName: application.firstName,
        lastName: application.lastName,
        phone: application.phone,
        affiliateStatus: 'APPROVED',
        affiliateApprovedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !newProfile) {
      throw new Error(`Failed to create profile: ${createError?.message || 'Unknown error'}`);
    }

    const profile = newProfile as Profile;
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
    await db
      .from('preparer_applications')
      .update({
        notes: application.notes
          ? `${application.notes}\n\n[${new Date().toISOString()}] Profile created: ${profile.id} as ${conversionType}`
          : `[${new Date().toISOString()}] Profile created: ${profile.id} as ${conversionType}`,
      })
      .eq('id', applicationId);

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
