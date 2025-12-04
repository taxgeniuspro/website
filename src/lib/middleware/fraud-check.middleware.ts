/**
 * Fraud Check Middleware
 *
 * Reusable middleware for validating lead submissions
 * Integrates with fraud-prevention.service
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 8
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  performFraudCheck,
  logFraudAttempt,
  sanitizeEmail,
  sanitizePhoneNumber,
  FraudCheckResult,
} from '@/lib/services/fraud-prevention.service';
import { logger } from '@/lib/logger';

/**
 * Extract IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback
  return 'unknown';
}

/**
 * Extract user agent from request
 */
function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Middleware function to check for fraud before creating lead
 *
 * Usage:
 * ```typescript
 * const fraudCheck = await checkLeadFraud(request, {
 *   email: 'user@example.com',
 *   phone: '555-123-4567',
 *   referrerUsername: 'johnsmith'
 * })
 *
 * if (!fraudCheck.passed) {
 *   return fraudCheck.response
 * }
 * ```
 */
export async function checkLeadFraud(
  request: NextRequest,
  data: {
    email: string;
    phone: string;
    referrerUsername?: string;
  }
): Promise<{
  passed: boolean;
  response?: NextResponse;
  result: FraudCheckResult;
  sanitizedData: {
    email: string;
    phone: string;
  };
}> {
  try {
    // Sanitize input data
    const sanitizedEmail = sanitizeEmail(data.email);
    const sanitizedPhone = sanitizePhoneNumber(data.phone);

    // Extract request metadata
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Perform fraud check
    const fraudResult = await performFraudCheck({
      email: sanitizedEmail,
      phone: sanitizedPhone,
      ipAddress,
      userAgent,
      referrerUsername: data.referrerUsername,
    });

    // If blocked, log and return error response
    if (!fraudResult.isValid) {
      await logFraudAttempt({
        email: sanitizedEmail,
        phone: sanitizedPhone,
        ipAddress,
        userAgent,
        referrerUsername: data.referrerUsername,
        flags: fraudResult.flags,
        riskScore: fraudResult.riskScore,
        blockedReason: fraudResult.blockedReason,
      });

      return {
        passed: false,
        response: NextResponse.json(
          {
            error: fraudResult.blockedReason || 'Submission blocked',
            flags: fraudResult.flags,
            riskScore: fraudResult.riskScore,
          },
          { status: 429 } // Too Many Requests
        ),
        result: fraudResult,
        sanitizedData: {
          email: sanitizedEmail,
          phone: sanitizedPhone,
        },
      };
    }

    // Passed checks - log if high risk
    if (fraudResult.riskScore > 50) {
      logger.warn('High-risk lead submission passed checks', {
        email: sanitizedEmail,
        ipAddress,
        riskScore: fraudResult.riskScore,
        flags: fraudResult.flags,
      });
    }

    return {
      passed: true,
      result: fraudResult,
      sanitizedData: {
        email: sanitizedEmail,
        phone: sanitizedPhone,
      },
    };
  } catch (error) {
    logger.error('Error in fraud check middleware', { error });

    // On error, fail open but log
    return {
      passed: true,
      result: {
        isValid: true,
        riskScore: 0,
        flags: ['FRAUD_CHECK_ERROR'],
      },
      sanitizedData: {
        email: sanitizeEmail(data.email),
        phone: sanitizePhoneNumber(data.phone),
      },
    };
  }
}

/**
 * Add fraud metadata to lead creation data
 */
export function addFraudMetadata(leadData: any, fraudResult: FraudCheckResult): any {
  return {
    ...leadData,
    metadata: JSON.stringify({
      ...(leadData.metadata ? JSON.parse(leadData.metadata) : {}),
      fraudCheck: {
        riskScore: fraudResult.riskScore,
        flags: fraudResult.flags,
        checkedAt: new Date().toISOString(),
      },
    }),
  };
}
