import { achievementEngine } from './achievement-engine';
import { logger } from '@/lib/logger';

/**
 * Achievement Trigger System
 *
 * This module provides convenience functions to trigger achievement checks
 * from various parts of the application.
 *
 * Usage:
 * import { triggerTaxReturnFiled } from '@/lib/gamification/triggers';
 *
 * // In your tax return filing code:
 * await triggerTaxReturnFiled(userId, {
 *   clientId,
 *   filingTime: 120000, // ms
 *   daysBeforeDeadline: 45
 * });
 */

/**
 * Trigger when a tax return is filed
 */
export async function triggerTaxReturnFiled(
  userId: string,
  data: {
    clientId: string;
    filingTime?: number; // Time taken in milliseconds
    daysBeforeDeadline?: number;
  }
) {
  try {
    await achievementEngine.checkAndUnlockAchievements(userId, 'TAX_RETURN_FILED', data);
  } catch (error) {
    logger.error('Error triggering tax return filed achievements:', error);
  }
}

/**
 * Trigger when a user logs in
 */
export async function triggerUserLogin(
  userId: string,
  data?: {
    loginHour?: number; // Hour of login (0-23)
  }
) {
  try {
    const loginHour = data?.loginHour || new Date().getHours();

    // Update login streak first
    await achievementEngine.updateStreak(userId);

    // Then check achievements
    await achievementEngine.checkAndUnlockAchievements(userId, 'USER_LOGIN', {
      ...data,
      loginHour,
    });
  } catch (error) {
    logger.error('Error triggering user login achievements:', error);
  }
}

/**
 * Trigger when a referral is created
 */
export async function triggerReferralCreated(
  referrerId: string,
  data: {
    referralId: string;
    clientId: string;
  }
) {
  try {
    await achievementEngine.checkAndUnlockAchievements(referrerId, 'REFERRAL_CREATED', data);
  } catch (error) {
    logger.error('Error triggering referral created achievements:', error);
  }
}

/**
 * Trigger when a referral converts to a client
 */
export async function triggerReferralConverted(
  referrerId: string,
  data: {
    referralId: string;
    clientId: string;
  }
) {
  try {
    await achievementEngine.checkAndUnlockAchievements(referrerId, 'REFERRAL_CONVERTED', data);
  } catch (error) {
    logger.error('Error triggering referral converted achievements:', error);
  }
}

/**
 * Trigger when a document is uploaded
 */
export async function triggerDocumentUploaded(
  userId: string,
  data: {
    documentId: string;
    documentType?: string;
  }
) {
  try {
    await achievementEngine.checkAndUnlockAchievements(userId, 'DOCUMENT_UPLOADED', data);
  } catch (error) {
    logger.error('Error triggering document uploaded achievements:', error);
  }
}

/**
 * Trigger when a message is sent
 */
export async function triggerMessageSent(
  userId: string,
  data: {
    messageId: string;
    recipientId: string;
  }
) {
  try {
    await achievementEngine.checkAndUnlockAchievements(userId, 'MESSAGE_SENT', data);
  } catch (error) {
    logger.error('Error triggering message sent achievements:', error);
  }
}

/**
 * Trigger when a tracking link is created
 */
export async function triggerTrackingLinkCreated(
  userId: string,
  data: {
    linkId: string;
    linkCode: string;
  }
) {
  try {
    await achievementEngine.checkAndUnlockAchievements(userId, 'TRACKING_LINK_CREATED', data);
  } catch (error) {
    logger.error('Error triggering tracking link created achievements:', error);
  }
}

/**
 * Trigger when a contest ends
 */
export async function triggerContestEnded(
  userId: string,
  data: {
    contestId: string;
    position: number; // 1st, 2nd, 3rd, etc.
    score: number;
  }
) {
  try {
    await achievementEngine.checkAndUnlockAchievements(userId, 'CONTEST_ENDED', data);
  } catch (error) {
    logger.error('Error triggering contest ended achievements:', error);
  }
}

/**
 * Trigger when profile is updated
 */
export async function triggerProfileUpdated(
  userId: string,
  data: {
    fieldsUpdated: string[];
  }
) {
  try {
    await achievementEngine.checkAndUnlockAchievements(userId, 'PROFILE_UPDATED', data);
  } catch (error) {
    logger.error('Error triggering profile updated achievements:', error);
  }
}

/**
 * Trigger when commission is earned
 */
export async function triggerCommissionEarned(
  userId: string,
  data: {
    commissionId: string;
    amount: number;
  }
) {
  try {
    await achievementEngine.checkAndUnlockAchievements(userId, 'COMMISSION_EARNED', data);
  } catch (error) {
    logger.error('Error triggering commission earned achievements:', error);
  }
}

/**
 * Trigger when marketing material is shared
 */
export async function triggerMarketingMaterialShared(
  userId: string,
  data: {
    materialId: string;
    channel: string; // 'facebook', 'instagram', 'twitter', etc.
  }
) {
  try {
    await achievementEngine.checkAndUnlockAchievements(userId, 'MATERIAL_SHARED', data);
  } catch (error) {
    logger.error('Error triggering material shared achievements:', error);
  }
}

/**
 * Manually trigger achievement check for all user's achievements
 * (useful for testing or recalculation)
 */
export async function recalculateAllAchievements(userId: string) {
  try {
    logger.info(`Recalculating all achievements for user ${userId}`);

    // Trigger multiple event types to recalculate
    await achievementEngine.checkAndUnlockAchievements(userId, 'RECALCULATE', {});

    logger.info(`Completed recalculation for user ${userId}`);
  } catch (error) {
    logger.error('Error recalculating achievements:', error);
  }
}
