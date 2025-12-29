/**
 * Fraud Prevention Service
 *
 * Detects and prevents fraudulent lead submissions, duplicate entries,
 * and suspicious referral patterns
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 8
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions
interface LeadRecord {
  id: string;
  email?: string | null;
  phone?: string | null;
  ipAddress?: string | null;
  status: string;
  referrerUsername?: string | null;
  createdAt: string;
}

interface ProfileRecord {
  id: string;
  role: string;
  shortLinkUsername?: string | null;
  createdAt: string;
}

/**
 * Fraud check result interface
 */
export interface FraudCheckResult {
  isValid: boolean;
  riskScore: number; // 0-100, higher = more suspicious
  flags: string[];
  blockedReason?: string;
}

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  message?: string;
}

/**
 * Check for duplicate leads by email or phone
 *
 * Prevents same person from submitting multiple leads
 */
export async function checkDuplicateLead(
  email: string,
  phone: string,
  timeWindowHours: number = 24
): Promise<{ isDuplicate: boolean; existingLeadId?: string; timeSinceLastSubmission?: number }> {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - timeWindowHours);

    const normalizedEmail = email.toLowerCase();
    const normalizedPhone = phone.replace(/\D/g, ''); // Strip non-numeric

    // Check for existing leads with same email or phone
    const { data: leadsData } = await db
      .from('leads')
      .select('id, createdAt')
      .or(`email.eq.${normalizedEmail},phone.eq.${normalizedPhone}`)
      .gte('createdAt', cutoffTime.toISOString())
      .order('createdAt', { ascending: false })
      .limit(1);

    const existingLead = firstOrNull(leadsData) as { id: string; createdAt: string } | null;

    if (existingLead) {
      const timeSinceLastSubmission = Date.now() - new Date(existingLead.createdAt).getTime();
      const minutesAgo = Math.floor(timeSinceLastSubmission / 1000 / 60);

      logger.warn('Duplicate lead detected', {
        email,
        phone,
        existingLeadId: existingLead.id,
        minutesAgo,
      });

      return {
        isDuplicate: true,
        existingLeadId: existingLead.id,
        timeSinceLastSubmission: minutesAgo,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    logger.error('Error checking duplicate lead', { error });
    // Fail open - don't block legitimate leads due to check failure
    return { isDuplicate: false };
  }
}

/**
 * Check rate limit for IP address
 *
 * Prevents rapid-fire submissions from same IP
 */
export async function checkIPRateLimit(
  ipAddress: string,
  maxSubmissions: number = 5,
  timeWindowMinutes: number = 60
): Promise<RateLimitResult> {
  try {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - timeWindowMinutes);

    // Count recent submissions from this IP
    const { count: recentSubmissions } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('ipAddress', ipAddress)
      .gte('createdAt', cutoffTime.toISOString());

    const submissionCount = recentSubmissions || 0;
    const remaining = Math.max(0, maxSubmissions - submissionCount);
    const resetAt = new Date();
    resetAt.setMinutes(resetAt.getMinutes() + timeWindowMinutes);

    if (submissionCount >= maxSubmissions) {
      logger.warn('IP rate limit exceeded', {
        ipAddress,
        submissions: submissionCount,
        limit: maxSubmissions,
      });

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        message: `Too many submissions. Please try again in ${timeWindowMinutes} minutes.`,
      };
    }

    return {
      allowed: true,
      remaining,
      resetAt,
    };
  } catch (error) {
    logger.error('Error checking IP rate limit', { error });
    // Fail open - don't block legitimate leads
    return {
      allowed: true,
      remaining: maxSubmissions,
      resetAt: new Date(),
    };
  }
}

/**
 * Validate referrer username exists and is active
 */
export async function validateReferrer(username: string): Promise<{
  isValid: boolean;
  referrerType?: string;
  reason?: string;
}> {
  try {
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role, shortLinkUsername, createdAt')
      .eq('shortLinkUsername', username)
      .limit(1);

    const profile = firstOrNull(profileData) as ProfileRecord | null;

    if (!profile) {
      return {
        isValid: false,
        reason: 'Referrer username not found',
      };
    }

    // Check if referrer is eligible (has been active for at least 1 day)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const profileCreatedAt = new Date(profile.createdAt);
    if (profileCreatedAt > oneDayAgo) {
      logger.warn('New referrer account used', {
        username,
        accountAge: Date.now() - profileCreatedAt.getTime(),
      });
      // Allow but flag as potentially suspicious
    }

    return {
      isValid: true,
      referrerType: profile.role,
    };
  } catch (error) {
    logger.error('Error validating referrer', { error });
    // Fail open
    return { isValid: true };
  }
}

/**
 * Detect suspicious patterns in lead submission
 */
export async function detectSuspiciousPatterns(data: {
  email: string;
  phone: string;
  ipAddress: string;
  referrerUsername?: string;
  userAgent: string;
}): Promise<{ flags: string[]; riskScore: number }> {
  const flags: string[] = [];
  let riskScore = 0;

  try {
    // Check 1: Disposable email domain
    const disposableDomains = [
      'tempmail.com',
      'guerrillamail.com',
      'mailinator.com',
      '10minutemail.com',
      'throwaway.email',
      'temp-mail.org',
    ];
    const emailDomain = data.email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(emailDomain)) {
      flags.push('DISPOSABLE_EMAIL');
      riskScore += 30;
    }

    // Check 2: Phone number format validation
    const cleanPhone = data.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      flags.push('INVALID_PHONE_FORMAT');
      riskScore += 20;
    }

    // Check 3: Repeated digits in phone (e.g., 555-555-5555)
    const hasRepeatedDigits = /(\d)\1{4,}/.test(cleanPhone);
    if (hasRepeatedDigits) {
      flags.push('SUSPICIOUS_PHONE_PATTERN');
      riskScore += 25;
    }

    // Check 4: Missing or suspicious user agent
    if (!data.userAgent || data.userAgent.length < 10) {
      flags.push('MISSING_USER_AGENT');
      riskScore += 15;
    }

    // Check 5: Email contains suspicious patterns
    const suspiciousEmailPatterns = [
      /test@/i,
      /fake@/i,
      /spam@/i,
      /\d{8,}@/, // 8+ consecutive digits
      /^[a-z]{1,2}@/i, // Single or double letter before @
    ];
    if (suspiciousEmailPatterns.some((pattern) => pattern.test(data.email))) {
      flags.push('SUSPICIOUS_EMAIL_PATTERN');
      riskScore += 25;
    }

    // Check 6: Referrer abuse - check if this referrer has high fraud rate
    if (data.referrerUsername) {
      const referrerFraudRate = await calculateReferrerFraudRate(data.referrerUsername);
      if (referrerFraudRate > 0.3) {
        // More than 30% fraud rate
        flags.push('HIGH_FRAUD_REFERRER');
        riskScore += 40;
      }
    }

    // Check 7: IP reputation - check if this IP has submitted multiple invalid leads
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { count: ipFraudCount } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('ipAddress', data.ipAddress)
      .eq('status', 'DISQUALIFIED')
      .gte('createdAt', thirtyDaysAgo.toISOString());

    if ((ipFraudCount || 0) > 3) {
      flags.push('SUSPICIOUS_IP_HISTORY');
      riskScore += 35;
    }

    // Log suspicious activity
    if (flags.length > 0) {
      logger.warn('Suspicious lead patterns detected', {
        email: data.email,
        ipAddress: data.ipAddress,
        flags,
        riskScore,
      });
    }

    return { flags, riskScore };
  } catch (error) {
    logger.error('Error detecting suspicious patterns', { error });
    return { flags: [], riskScore: 0 };
  }
}

/**
 * Calculate fraud rate for a referrer
 */
async function calculateReferrerFraudRate(username: string): Promise<number> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Fetch leads and group by status in JavaScript (Supabase doesn't support groupBy)
    const { data: leadsData } = await db
      .from('leads')
      .select('id, status')
      .eq('referrerUsername', username)
      .gte('createdAt', ninetyDaysAgo.toISOString());

    const leads = (leadsData || []) as { id: string; status: string }[];

    if (leads.length === 0) return 0;

    // Count by status
    const statusCounts = leads.reduce(
      (acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalLeads = leads.length;
    const disqualifiedLeads = statusCounts['DISQUALIFIED'] || 0;

    return disqualifiedLeads / totalLeads;
  } catch (error) {
    logger.error('Error calculating referrer fraud rate', { error });
    return 0;
  }
}

/**
 * Comprehensive fraud check
 *
 * Runs all fraud detection checks and returns overall result
 */
export async function performFraudCheck(data: {
  email: string;
  phone: string;
  ipAddress: string;
  referrerUsername?: string;
  userAgent: string;
}): Promise<FraudCheckResult> {
  try {
    const flags: string[] = [];
    let riskScore = 0;

    // Check 1: Duplicate detection
    const duplicateCheck = await checkDuplicateLead(data.email, data.phone, 24);
    if (duplicateCheck.isDuplicate) {
      flags.push('DUPLICATE_SUBMISSION');
      riskScore += 50;

      // Block if submitted within last hour
      if (duplicateCheck.timeSinceLastSubmission && duplicateCheck.timeSinceLastSubmission < 60) {
        return {
          isValid: false,
          riskScore: 100,
          flags,
          blockedReason: 'Duplicate submission detected. Please try again later.',
        };
      }
    }

    // Check 2: Rate limiting
    const rateLimit = await checkIPRateLimit(data.ipAddress, 5, 60);
    if (!rateLimit.allowed) {
      flags.push('RATE_LIMIT_EXCEEDED');
      return {
        isValid: false,
        riskScore: 100,
        flags,
        blockedReason: rateLimit.message,
      };
    }

    // Check 3: Referrer validation
    if (data.referrerUsername) {
      const referrerCheck = await validateReferrer(data.referrerUsername);
      if (!referrerCheck.isValid) {
        flags.push('INVALID_REFERRER');
        riskScore += 30;
      }
    }

    // Check 4: Suspicious patterns
    const patternCheck = await detectSuspiciousPatterns(data);
    flags.push(...patternCheck.flags);
    riskScore += patternCheck.riskScore;

    // Normalize risk score to 0-100
    riskScore = Math.min(100, riskScore);

    // Block if risk score is very high (>80)
    if (riskScore > 80) {
      return {
        isValid: false,
        riskScore,
        flags,
        blockedReason: 'Submission flagged as suspicious. Please contact support.',
      };
    }

    // Log high-risk submissions but allow them
    if (riskScore > 50) {
      logger.warn('High-risk lead submission allowed', {
        email: data.email,
        ipAddress: data.ipAddress,
        riskScore,
        flags,
      });
    }

    return {
      isValid: true,
      riskScore,
      flags,
    };
  } catch (error) {
    logger.error('Error performing fraud check', { error });
    // Fail open - allow submission but log error
    return {
      isValid: true,
      riskScore: 0,
      flags: ['FRAUD_CHECK_ERROR'],
    };
  }
}

/**
 * Log fraud attempt for analysis
 */
export async function logFraudAttempt(data: {
  email: string;
  phone: string;
  ipAddress: string;
  userAgent: string;
  referrerUsername?: string;
  flags: string[];
  riskScore: number;
  blockedReason?: string;
}): Promise<void> {
  try {
    // Store in dedicated fraud log table (if exists) or use logging
    logger.error('Fraud attempt blocked', {
      email: data.email,
      ipAddress: data.ipAddress,
      flags: data.flags,
      riskScore: data.riskScore,
      blockedReason: data.blockedReason,
      referrerUsername: data.referrerUsername,
    });

    // Could also store in database for admin review:
    // await prisma.fraudLog.create({ data: { ... } })
  } catch (error) {
    logger.error('Error logging fraud attempt', { error });
  }
}

/**
 * Check if email domain is valid and has MX records
 * (More advanced check - requires DNS lookup)
 */
export function isValidEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();

  // Basic domain format validation
  const domainRegex =
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;

  return domainRegex.test(domain);
}

/**
 * Sanitize phone number to standard format
 */
export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Handle US numbers with country code
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Sanitize email to lowercase and trim
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
