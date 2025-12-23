/**
 * Failed Login Tracking Service
 *
 * Tracks failed login attempts and implements account lockout:
 * - After 5 failed attempts: 15 minute lockout
 * - After 10 failed attempts: 1 hour lockout
 * - After 15 failed attempts: 24 hour lockout (notify admin)
 *
 * Uses Redis for distributed tracking across multiple instances.
 */

import { cache, redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const LOCKOUT_THRESHOLDS = [
  { attempts: 5, lockoutMinutes: 15 },
  { attempts: 10, lockoutMinutes: 60 },
  { attempts: 15, lockoutMinutes: 60 * 24 }, // 24 hours
];

const MAX_ATTEMPTS_WINDOW_SECONDS = 60 * 60; // 1 hour window for counting attempts
const LOCKOUT_KEY_PREFIX = 'lockout:';
const ATTEMPTS_KEY_PREFIX = 'login_attempts:';

export interface FailedLoginResult {
  locked: boolean;
  attemptsRemaining?: number;
  lockoutMinutes?: number;
  unlockTime?: Date;
}

export interface LoginAttemptRecord {
  email: string;
  ipAddress: string;
  timestamp: Date;
  success: boolean;
  reason?: string;
}

export class FailedLoginService {
  /**
   * Check if an email is currently locked out
   */
  static async isLocked(email: string): Promise<FailedLoginResult> {
    const lockKey = `${LOCKOUT_KEY_PREFIX}${email.toLowerCase()}`;

    try {
      const lockData = await cache.get<{ until: number; attempts: number }>(lockKey);

      if (lockData && lockData.until > Date.now()) {
        const unlockTime = new Date(lockData.until);
        const lockoutMinutes = Math.ceil((lockData.until - Date.now()) / (60 * 1000));

        return {
          locked: true,
          lockoutMinutes,
          unlockTime,
        };
      }

      // Get current attempt count
      const attemptsKey = `${ATTEMPTS_KEY_PREFIX}${email.toLowerCase()}`;
      const attempts = await redis.get(attemptsKey);
      const attemptCount = attempts ? parseInt(attempts, 10) : 0;

      // Calculate attempts remaining until first lockout
      const attemptsRemaining = Math.max(0, LOCKOUT_THRESHOLDS[0].attempts - attemptCount);

      return {
        locked: false,
        attemptsRemaining,
      };
    } catch (error) {
      logger.error('Failed to check lockout status', { email, error });
      // Fail open - don't lock out if Redis is down
      return { locked: false, attemptsRemaining: 5 };
    }
  }

  /**
   * Record a failed login attempt
   */
  static async recordFailedAttempt(
    email: string,
    ipAddress: string,
    reason?: string
  ): Promise<FailedLoginResult> {
    const emailLower = email.toLowerCase();
    const attemptsKey = `${ATTEMPTS_KEY_PREFIX}${emailLower}`;
    const lockKey = `${LOCKOUT_KEY_PREFIX}${emailLower}`;

    try {
      // Increment attempt count
      const attempts = await redis.incr(attemptsKey);

      // Set expiry on first attempt
      if (attempts === 1) {
        await redis.expire(attemptsKey, MAX_ATTEMPTS_WINDOW_SECONDS);
      }

      // Log the failed attempt to database for audit
      try {
        await prisma.loginAttempt.create({
          data: {
            email: emailLower,
            ipAddress,
            success: false,
            reason: reason || 'Invalid credentials',
          },
        });
      } catch {
        // loginAttempt table might not exist yet, log to logger instead
        logger.warn('Failed login attempt', {
          email: emailLower,
          ipAddress,
          attempts,
          reason,
        });
      }

      // Check if we should lock the account
      let lockoutConfig = null;
      for (const threshold of LOCKOUT_THRESHOLDS) {
        if (attempts >= threshold.attempts) {
          lockoutConfig = threshold;
        }
      }

      if (lockoutConfig) {
        const lockoutMs = lockoutConfig.lockoutMinutes * 60 * 1000;
        const unlockTime = Date.now() + lockoutMs;

        await cache.set(lockKey, { until: unlockTime, attempts }, lockoutConfig.lockoutMinutes * 60);

        logger.warn('Account locked due to failed login attempts', {
          email: emailLower,
          attempts,
          lockoutMinutes: lockoutConfig.lockoutMinutes,
          unlockTime: new Date(unlockTime).toISOString(),
        });

        // Notify admin if this is a high-severity lockout (15+ attempts)
        if (attempts >= 15) {
          await this.notifyAdminOfSuspiciousActivity(emailLower, ipAddress, attempts);
        }

        return {
          locked: true,
          lockoutMinutes: lockoutConfig.lockoutMinutes,
          unlockTime: new Date(unlockTime),
        };
      }

      // Not locked yet - return attempts remaining
      const nextThreshold = LOCKOUT_THRESHOLDS.find(t => t.attempts > attempts);
      const attemptsRemaining = nextThreshold
        ? nextThreshold.attempts - attempts
        : 0;

      return {
        locked: false,
        attemptsRemaining,
      };
    } catch (error) {
      logger.error('Failed to record failed login attempt', { email, error });
      return { locked: false, attemptsRemaining: 5 };
    }
  }

  /**
   * Clear failed login attempts after successful login
   */
  static async clearAttempts(email: string): Promise<void> {
    const emailLower = email.toLowerCase();
    const attemptsKey = `${ATTEMPTS_KEY_PREFIX}${emailLower}`;
    const lockKey = `${LOCKOUT_KEY_PREFIX}${emailLower}`;

    try {
      await Promise.all([
        cache.del(attemptsKey),
        cache.del(lockKey),
      ]);

      logger.info('Cleared failed login attempts after successful login', { email: emailLower });
    } catch (error) {
      logger.error('Failed to clear login attempts', { email, error });
    }
  }

  /**
   * Record a successful login
   */
  static async recordSuccessfulLogin(email: string, ipAddress: string): Promise<void> {
    try {
      // Clear any previous failed attempts
      await this.clearAttempts(email);

      // Log successful login
      try {
        await prisma.loginAttempt.create({
          data: {
            email: email.toLowerCase(),
            ipAddress,
            success: true,
          },
        });
      } catch {
        // loginAttempt table might not exist, log to logger
        logger.info('Successful login', { email: email.toLowerCase(), ipAddress });
      }
    } catch (error) {
      logger.error('Failed to record successful login', { email, error });
    }
  }

  /**
   * Notify admin of suspicious login activity
   */
  private static async notifyAdminOfSuspiciousActivity(
    email: string,
    ipAddress: string,
    attempts: number
  ): Promise<void> {
    // Import EmailService dynamically to avoid circular dependencies
    const { EmailService } = await import('./email.service');

    const adminEmail = 'taxgenius.tax@gmail.com'; // Main admin email

    try {
      await EmailService.sendSecurityAlertEmail(adminEmail, {
        type: 'excessive_failed_logins',
        targetEmail: email,
        ipAddress,
        attempts,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to send security alert to admin', { error, email, attempts });
    }
  }

  /**
   * Get recent login attempts for an email (for admin view)
   */
  static async getRecentAttempts(email: string, limit = 10): Promise<LoginAttemptRecord[]> {
    try {
      const attempts = await prisma.loginAttempt.findMany({
        where: { email: email.toLowerCase() },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return attempts.map(a => ({
        email: a.email,
        ipAddress: a.ipAddress,
        timestamp: a.createdAt,
        success: a.success,
        reason: a.reason || undefined,
      }));
    } catch {
      // Table might not exist
      return [];
    }
  }
}
