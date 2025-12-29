/**
 * Professional Email Auto-Provisioning Service
 *
 * Automatically provisions professional email addresses for tax preparers
 * when they are approved. Uses Cloudflare for email forwarding.
 *
 * Flow:
 * 1. Preparer is approved
 * 2. Generate available username from firstName
 * 3. Create Cloudflare forwarding rule
 * 4. Create ProfessionalEmailAlias record with status=ACTIVE
 * 5. Send welcome email with Gmail Send-As setup instructions
 */

import { db, firstOrNull } from '@/lib/db';
import { cloudflareEmailService } from './cloudflare-email.service';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
interface ProfessionalEmailAliasRecord {
  id: string;
  profileId: string;
  emailAddress: string;
  forwardToEmail: string;
  displayName: string;
  status: string;
  cloudflareRuleId?: string | null;
  dnsConfigured: boolean;
  forwardingActive: boolean;
  annualPrice: number;
  isPrimary: boolean;
  gmailSendAsConfigured: boolean;
  smtpEnabled: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ProfileRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  user?: {
    email: string;
  } | null;
  professionalEmails?: ProfessionalEmailAliasRecord[];
}

const DOMAIN = 'taxgeniuspro.tax';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ProvisionResult {
  success: boolean;
  email?: string;
  error?: string;
  aliasId?: string;
}

/**
 * Generate a unique username for the professional email
 * Tries: firstName, firstName.lastName, firstName1, firstName2, etc.
 */
async function generateAvailableUsername(
  firstName: string,
  lastName: string
): Promise<string | null> {
  // Normalize names: lowercase, remove special characters
  const normalizedFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!normalizedFirst) {
    return null;
  }

  // Try different username patterns
  const patterns = [
    normalizedFirst, // e.g., "ira"
    `${normalizedFirst}.${normalizedLast}`, // e.g., "ira.johnson"
    `${normalizedFirst}${normalizedLast.charAt(0)}`, // e.g., "iraj"
  ];

  // Add numbered variants
  for (let i = 1; i <= 10; i++) {
    patterns.push(`${normalizedFirst}${i}`); // e.g., "ira1", "ira2"
  }

  for (const username of patterns) {
    const emailAddress = `${username}@${DOMAIN}`;

    // Check if email is already taken
    const { data: existingData } = await db
      .from('professional_email_aliases')
      .select('id')
      .eq('emailAddress', emailAddress)
      .limit(1);

    const existing = firstOrNull(existingData);

    if (!existing) {
      logger.info('Found available username', { username, emailAddress });
      return username;
    }
  }

  // All patterns exhausted
  logger.warn('Could not find available username', {
    firstName,
    lastName,
    triedPatterns: patterns.length,
  });
  return null;
}

// Max retries for concurrent race condition handling
const MAX_PROVISION_RETRIES = 3;

/**
 * Provision a professional email for a tax preparer
 *
 * @param profileId - The Profile.id of the tax preparer
 * @param retryCount - Internal retry counter (do not set externally)
 * @returns Result with email address if successful
 */
export async function provisionProfessionalEmail(
  profileId: string,
  retryCount: number = 0
): Promise<ProvisionResult> {
  // Prevent infinite recursion
  if (retryCount >= MAX_PROVISION_RETRIES) {
    logger.error('Max retries exceeded for professional email provisioning', { profileId, retryCount });
    return { success: false, error: 'Failed to provision email after multiple attempts' };
  }
  try {
    logger.info('Starting professional email provisioning', { profileId });

    // Get preparer profile
    const { data: profileData } = await db
      .from('profiles')
      .select('id, firstName, lastName, role, userId')
      .eq('id', profileId)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    if (profile.role !== 'tax_preparer') {
      return { success: false, error: 'Only tax preparers can have professional emails' };
    }

    // Get user email
    const { data: userData } = await db
      .from('users')
      .select('email')
      .eq('id', (profile as { userId?: string }).userId)
      .limit(1);

    const user = firstOrNull(userData) as { email: string } | null;

    // Check if they already have an active professional email
    const { data: existingEmailsData } = await db
      .from('professional_email_aliases')
      .select('id, emailAddress')
      .eq('profileId', profileId)
      .eq('status', 'ACTIVE');

    const existingEmails = (existingEmailsData || []) as ProfessionalEmailAliasRecord[];

    if (existingEmails.length > 0) {
      const existingEmail = existingEmails[0].emailAddress;
      logger.info('Preparer already has professional email', {
        profileId,
        email: existingEmail,
      });
      return {
        success: true,
        email: existingEmail,
        aliasId: existingEmails[0].id,
      };
    }

    // Get forwarding destination (their signup email)
    const forwardToEmail = user?.email;
    if (!forwardToEmail) {
      return { success: false, error: 'No email address found for user' };
    }

    // Validate forwarding email format
    if (!EMAIL_REGEX.test(forwardToEmail)) {
      return { success: false, error: 'Invalid forwarding email address format' };
    }

    // Generate available username
    const username = await generateAvailableUsername(
      profile.firstName || 'user',
      profile.lastName || ''
    );

    if (!username) {
      return { success: false, error: 'Could not generate available username' };
    }

    const emailAddress = `${username}@${DOMAIN}`;
    const displayName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Tax Professional';

    logger.info('Provisioning professional email', {
      profileId,
      emailAddress,
      forwardToEmail,
      displayName,
    });

    // Create the DB record (will fail if email already exists due to unique constraint)
    const { data: aliasData, error: insertError } = await db
      .from('professional_email_aliases')
      .insert({
        profileId: profile.id,
        emailAddress,
        forwardToEmail,
        displayName,
        status: 'PROVISIONING', // Set to provisioning until Cloudflare confirms
        annualPrice: 0, // Free for tax preparers
        isPrimary: true,
        gmailSendAsConfigured: false,
        smtpEnabled: true,
        dnsConfigured: false, // Will be set true after Cloudflare success
        forwardingActive: false, // Will be set true after Cloudflare success
      })
      .select()
      .single();

    if (insertError) {
      // If unique constraint violation, the email was taken by another concurrent request
      if (insertError.code === '23505') {
        logger.warn('Email address taken by concurrent request, retrying with new username', {
          profileId,
          emailAddress,
        });
        // Retry the entire provisioning (will generate a different username)
        return provisionProfessionalEmail(profileId, retryCount + 1);
      }
      throw insertError;
    }

    const alias = aliasData as ProfessionalEmailAliasRecord;

    // Create Cloudflare forwarding rule
    const cloudflareResult = await cloudflareEmailService.createForwardingRule(
      emailAddress,
      forwardToEmail,
      displayName
    );

    if (!cloudflareResult.success) {
      // Rollback: delete the DB record since Cloudflare failed
      logger.error('Failed to create Cloudflare forwarding rule, rolling back DB record', {
        profileId,
        emailAddress,
        aliasId: alias.id,
        error: cloudflareResult.message,
      });

      await db
        .from('professional_email_aliases')
        .delete()
        .eq('id', alias.id)
        .then(() => {})
        .catch((deleteErr) => {
          logger.error('Failed to rollback DB record after Cloudflare failure', {
            aliasId: alias.id,
            error: deleteErr,
          });
        });

      return {
        success: false,
        error: `Failed to create forwarding rule: ${cloudflareResult.message}`,
      };
    }

    // Update the alias to ACTIVE status with Cloudflare rule ID
    await db
      .from('professional_email_aliases')
      .update({
        status: 'ACTIVE',
        cloudflareRuleId: cloudflareResult.ruleId,
        dnsConfigured: true,
        forwardingActive: true,
      })
      .eq('id', alias.id);

    logger.info('Professional email provisioned successfully', {
      aliasId: alias.id,
      emailAddress,
      forwardToEmail,
      cloudflareRuleId: cloudflareResult.ruleId,
    });

    // Send welcome email with Gmail Send-As instructions
    try {
      await sendProfessionalEmailWelcome(
        forwardToEmail,
        emailAddress,
        displayName,
        profile.firstName || 'there'
      );
    } catch (welcomeError) {
      logger.error('Failed to send welcome email', {
        aliasId: alias.id,
        error: welcomeError,
      });
      // Don't fail the provisioning if welcome email fails
    }

    return {
      success: true,
      email: emailAddress,
      aliasId: alias.id,
    };
  } catch (error) {
    logger.error('Error provisioning professional email', {
      profileId,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send welcome email with Gmail Send-As setup instructions
 */
async function sendProfessionalEmailWelcome(
  toEmail: string,
  professionalEmail: string,
  displayName: string,
  firstName: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
  const setupGuideUrl = `${appUrl}/dashboard/tax-preparer/settings/professional-email`;

  // Use EmailService to send welcome email
  // For now, log the email content - can be enhanced with a proper template later
  logger.info('Sending professional email welcome', {
    to: toEmail,
    professionalEmail,
    displayName,
    setupGuideUrl,
  });

  // TODO: Create a proper email template for this
  // For now, the welcome will be sent as part of the preparer approval flow
}

/**
 * Deprovision a professional email (when preparer leaves or is suspended)
 *
 * @param aliasId - The ProfessionalEmailAlias.id to deprovision
 */
export async function deprovisionProfessionalEmail(
  aliasId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Starting professional email deprovisioning', { aliasId });

    const { data: aliasData } = await db
      .from('professional_email_aliases')
      .select('*')
      .eq('id', aliasId)
      .limit(1);

    const alias = firstOrNull(aliasData) as ProfessionalEmailAliasRecord | null;

    if (!alias) {
      return { success: false, error: 'Alias not found' };
    }

    // Delete Cloudflare forwarding rule if exists
    if (alias.cloudflareRuleId) {
      try {
        await cloudflareEmailService.deleteForwardingRule(alias.cloudflareRuleId);
      } catch (cloudflareError) {
        logger.error('Failed to delete Cloudflare rule', {
          aliasId,
          ruleId: alias.cloudflareRuleId,
          error: cloudflareError,
        });
        // Continue with deprovisioning even if Cloudflare delete fails
      }
    }

    // Update alias status to SUSPENDED
    await db
      .from('professional_email_aliases')
      .update({
        status: 'SUSPENDED',
        forwardingActive: false,
      })
      .eq('id', aliasId);

    logger.info('Professional email deprovisioned', {
      aliasId,
      emailAddress: alias.emailAddress,
    });

    return { success: true };
  } catch (error) {
    logger.error('Error deprovisioning professional email', {
      aliasId,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update the forwarding destination for a professional email
 *
 * @param aliasId - The ProfessionalEmailAlias.id
 * @param newForwardToEmail - New email to forward to
 */
export async function updateForwardingDestination(
  aliasId: string,
  newForwardToEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Updating forwarding destination', { aliasId, newForwardToEmail });

    const { data: aliasData } = await db
      .from('professional_email_aliases')
      .select('*')
      .eq('id', aliasId)
      .limit(1);

    const alias = firstOrNull(aliasData) as ProfessionalEmailAliasRecord | null;

    if (!alias) {
      return { success: false, error: 'Alias not found' };
    }

    // Update Cloudflare rule if exists
    if (alias.cloudflareRuleId) {
      const updated = await cloudflareEmailService.updateForwardingDestination(
        alias.cloudflareRuleId,
        newForwardToEmail
      );

      if (!updated) {
        return { success: false, error: 'Failed to update Cloudflare forwarding rule' };
      }
    }

    // Update database record
    await db
      .from('professional_email_aliases')
      .update({ forwardToEmail: newForwardToEmail })
      .eq('id', aliasId);

    logger.info('Forwarding destination updated', {
      aliasId,
      emailAddress: alias.emailAddress,
      newForwardToEmail,
    });

    return { success: true };
  } catch (error) {
    logger.error('Error updating forwarding destination', {
      aliasId,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Backfill professional emails for all existing tax preparers who don't have one
 * Used for migration when making professional email free
 */
export async function backfillProfessionalEmails(): Promise<{
  success: number;
  failed: number;
  skipped: number;
  results: Array<{ profileId: string; email?: string; error?: string }>;
}> {
  logger.info('Starting professional email backfill');

  // Get all tax preparers
  const { data: preparersData } = await db
    .from('profiles')
    .select('id, userId')
    .eq('role', 'tax_preparer');

  const allPreparers = (preparersData || []) as Array<{ id: string; userId?: string | null }>;

  // Get preparers who already have active professional emails
  const { data: existingAliasesData } = await db
    .from('professional_email_aliases')
    .select('profileId')
    .eq('status', 'ACTIVE');

  const existingProfileIds = new Set(
    (existingAliasesData || []).map((a: { profileId: string }) => a.profileId)
  );

  // Filter to only those without active professional emails
  const preparersWithoutEmail = allPreparers.filter((p) => !existingProfileIds.has(p.id));

  // Get user emails for all preparers
  const userIds = preparersWithoutEmail
    .map((p) => p.userId)
    .filter((id): id is string => id !== null && id !== undefined);

  const { data: usersData } = await db
    .from('users')
    .select('id, email')
    .in('id', userIds);

  const userEmailMap = new Map<string, string>();
  for (const user of (usersData || []) as Array<{ id: string; email: string }>) {
    userEmailMap.set(user.id, user.email);
  }

  // Attach user email to preparers
  const preparers = preparersWithoutEmail.map((p) => ({
    ...p,
    user: p.userId ? { email: userEmailMap.get(p.userId) } : null,
  }));

  logger.info(`Found ${preparers.length} preparers without professional email`);

  let success = 0;
  let failed = 0;
  let skipped = 0;
  const results: Array<{ profileId: string; email?: string; error?: string }> = [];

  for (const preparer of preparers) {
    // Skip test accounts
    if (preparer.user?.email?.includes('@taxgeniuspro.test')) {
      skipped++;
      continue;
    }

    const result = await provisionProfessionalEmail(preparer.id);

    if (result.success) {
      success++;
      results.push({ profileId: preparer.id, email: result.email });
    } else {
      failed++;
      results.push({ profileId: preparer.id, error: result.error });
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  logger.info('Professional email backfill complete', {
    success,
    failed,
    skipped,
    total: preparers.length,
  });

  return { success, failed, skipped, results };
}
