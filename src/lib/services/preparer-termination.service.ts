/**
 * Preparer Termination Service
 *
 * When a tax preparer is terminated:
 * 1. Reassign all their clients to Owliver Owl (Tax Genius default)
 * 2. Reassign all their leads to Owliver
 * 3. Delete their referral image folder
 * 4. Delete the preparer's profile (cascades to other data)
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Owliver Owl's profile ID - the default Tax Genius preparer
const OWLIVER_PROFILE_ID = 'p_086ccd7b-6a51-406a-b157-bfc8a743c676';

// Local type definitions (replacing @prisma/client)
interface PreparerRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  customTrackingCode?: string | null;
  userId?: string | null;
}

interface TerminationResult {
  success: boolean;
  preparerName: string;
  clientsReassigned: number;
  leadsReassigned: number;
  error?: string;
}

/**
 * Terminate a tax preparer and reassign their clients to Owliver
 */
export async function terminatePreparer(preparerId: string): Promise<TerminationResult> {
  try {
    // 1. Get the preparer info
    const { data: preparerData } = await db
      .from('profiles')
      .select('id, firstName, lastName, role, customTrackingCode, userId')
      .eq('id', preparerId)
      .limit(1);

    const preparer = firstOrNull(preparerData) as PreparerRecord | null;

    if (!preparer) {
      return {
        success: false,
        preparerName: 'Unknown',
        clientsReassigned: 0,
        leadsReassigned: 0,
        error: 'Preparer not found',
      };
    }

    // Prevent terminating Owliver
    if (preparer.id === OWLIVER_PROFILE_ID) {
      return {
        success: false,
        preparerName: `${preparer.firstName} ${preparer.lastName}`,
        clientsReassigned: 0,
        leadsReassigned: 0,
        error: 'Cannot terminate Owliver Owl - this is the default Tax Genius preparer',
      };
    }

    // Prevent terminating admins (except if explicitly a tax_preparer)
    if (preparer.role === 'admin') {
      return {
        success: false,
        preparerName: `${preparer.firstName} ${preparer.lastName}`,
        clientsReassigned: 0,
        leadsReassigned: 0,
        error: 'Cannot terminate an admin user',
      };
    }

    const preparerName = `${preparer.firstName} ${preparer.lastName}`;

    logger.info('Starting preparer termination', {
      preparerId,
      preparerName,
      trackingCode: preparer.customTrackingCode,
    });

    // 2. Count clients and leads before reassignment
    const { count: clientCount } = await db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('assignedPreparerId', preparerId);

    const { count: leadCount } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('assignedToId', preparerId);

    // 3. Reassign all clients to Owliver
    if ((clientCount || 0) > 0) {
      await db
        .from('profiles')
        .update({ assignedPreparerId: OWLIVER_PROFILE_ID })
        .eq('assignedPreparerId', preparerId);

      logger.info('Reassigned clients to Owliver', {
        preparerId,
        clientCount,
        newPreparerId: OWLIVER_PROFILE_ID,
      });
    }

    // 4. Reassign all leads to Owliver
    if ((leadCount || 0) > 0) {
      await db
        .from('leads')
        .update({ assignedToId: OWLIVER_PROFILE_ID })
        .eq('assignedToId', preparerId);

      logger.info('Reassigned leads to Owliver', {
        preparerId,
        leadCount,
        newPreparerId: OWLIVER_PROFILE_ID,
      });
    }

    // 5. Delete referral image folder (images will cascade delete)
    await db
      .from('referral_image_sets')
      .delete()
      .eq('preparerId', preparerId);

    logger.info('Deleted referral image folder', { preparerId });

    // 6. Delete client referral invitations from this preparer
    await db
      .from('client_referral_invitations')
      .delete()
      .eq('preparerId', preparerId);

    // 7. Delete short links associated with this preparer
    await db
      .from('short_links')
      .delete()
      .eq('preparerId', preparerId);

    // 8. Delete the profile (this cascades to many related records)
    await db
      .from('profiles')
      .delete()
      .eq('id', preparerId);

    logger.info('Deleted preparer profile', { preparerId, preparerName });

    // 9. Delete the user account if it exists
    if (preparer.userId) {
      try {
        await db
          .from('users')
          .delete()
          .eq('id', preparer.userId);
        logger.info('Deleted user account', { userId: preparer.userId });
      } catch (userDeleteError) {
        // User might have been deleted already or have other constraints
        logger.warn('Could not delete user account', {
          userId: preparer.userId,
          error: userDeleteError,
        });
      }
    }

    logger.info('Preparer termination complete', {
      preparerId,
      preparerName,
      clientsReassigned: clientCount || 0,
      leadsReassigned: leadCount || 0,
    });

    return {
      success: true,
      preparerName,
      clientsReassigned: clientCount || 0,
      leadsReassigned: leadCount || 0,
    };
  } catch (error) {
    logger.error('Error terminating preparer', { error, preparerId });
    return {
      success: false,
      preparerName: 'Unknown',
      clientsReassigned: 0,
      leadsReassigned: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Owliver's profile ID
 */
export function getOwliverProfileId(): string {
  return OWLIVER_PROFILE_ID;
}
