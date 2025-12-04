/**
 * Shared helpers for lead API routes
 *
 * This module contains reusable functions for handling lead submissions
 * across different lead types (customer, preparer, affiliate).
 *
 * Eliminates 240 lines of duplicated code across 3 API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// ============ Types ============

export interface RequestMetadata {
  ipAddress: string;
  userAgent: string;
  referer: string | null;
}

export interface UtmParameters {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
}

export interface LeadCreateResult {
  success: boolean;
  message: string;
  leadId?: string;
  errors?: any[];
}

// ============ Request Metadata Extraction ============

/**
 * Extract client IP address from request headers
 * Handles various proxy configurations (Cloudflare, Nginx, etc.)
 */
export function extractIpAddress(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    'unknown'
  );
}

/**
 * Extract request metadata (IP, user agent, referer)
 */
export function extractRequestMetadata(request: NextRequest): RequestMetadata {
  return {
    ipAddress: extractIpAddress(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    referer: request.headers.get('referer') || null,
  };
}

// ============ UTM Parameter Extraction ============

/**
 * Extract UTM tracking parameters from request body
 * Supports all 5 standard UTM parameters
 */
export function extractUtmParams(body: any): UtmParameters {
  return {
    utmSource: body.utmSource || body.utm_source || null,
    utmMedium: body.utmMedium || body.utm_medium || null,
    utmCampaign: body.utmCampaign || body.utm_campaign || null,
    utmTerm: body.utmTerm || body.utm_term || null,
    utmContent: body.utmContent || body.utm_content || null,
  };
}

/**
 * Extract UTM parameters from URL query string
 * Useful for tracking link clicks before form submission
 */
export function extractUtmFromUrl(url: URL): UtmParameters {
  return {
    utmSource: url.searchParams.get('utm_source'),
    utmMedium: url.searchParams.get('utm_medium'),
    utmCampaign: url.searchParams.get('utm_campaign'),
    utmTerm: url.searchParams.get('utm_term'),
    utmContent: url.searchParams.get('utm_content'),
  };
}

// ============ Error Handling ============

/**
 * Handle Zod validation errors
 * Returns a standardized 400 response with error details
 */
export function handleValidationError(error: z.ZodError): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message: 'Invalid form data. Please check your input and try again.',
      errors: error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    },
    { status: 400 }
  );
}

/**
 * Handle general API errors
 * Returns a standardized 500 response
 */
export function handleApiError(
  error: unknown,
  context: string = 'processing your request'
): NextResponse {
  logger.error(`Error ${context}:`, error);

  // Check for Zod validation errors
  if (error instanceof z.ZodError) {
    return handleValidationError(error);
  }

  // Check for Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: any };

    // Duplicate key error
    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          message: 'A record with this information already exists.',
        },
        { status: 409 }
      );
    }

    // Foreign key constraint error
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid reference. Please check your data.',
        },
        { status: 400 }
      );
    }
  }

  // Generic error response
  return NextResponse.json(
    {
      success: false,
      message: `An error occurred while ${context}. Please try again later.`,
    },
    { status: 500 }
  );
}

// ============ Success Response Builders ============

/**
 * Create a standardized success response for lead creation
 */
export function createLeadSuccessResponse(
  leadId: string,
  message: string,
  additionalData?: Record<string, any>
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
      leadId,
      ...additionalData,
    },
    { status: 201 }
  );
}

// ============ Validation Helpers ============

/**
 * Common validation schemas for lead fields
 */
export const commonLeadFields = {
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address').toLowerCase(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
};

/**
 * Sanitize string input (remove leading/trailing whitespace, normalize)
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Format phone number to standard format
 * Strips all non-numeric characters
 */
export function formatPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ============ Rate Limiting Helpers ============

/**
 * Check if IP address is rate limited
 * This is a placeholder - integrate with your rate limiting service
 */
export async function checkRateLimit(
  ipAddress: string,
  endpoint: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // TODO: Implement rate limiting logic
  // For now, always allow
  return { allowed: true };
}

// ============ Notification Helpers ============

/**
 * Queue email notification (placeholder)
 * TODO: Integrate with email service (Resend, SendGrid, etc.)
 */
export async function queueAdminNotification(leadType: string, leadData: any): Promise<void> {
  logger.info(`[TODO] Send admin notification for ${leadType} lead:`, leadData.email);
  // TODO: Implement email notification
}

/**
 * Queue confirmation email to lead (placeholder)
 * TODO: Integrate with email service
 */
export async function queueConfirmationEmail(
  leadType: string,
  email: string,
  firstName: string
): Promise<void> {
  logger.info(`[TODO] Send confirmation email to ${email} for ${leadType} lead`);
  // TODO: Implement confirmation email
}

// ============ Webhook Helpers ============

/**
 * Trigger webhook for lead creation (placeholder)
 * TODO: Integrate with webhook service
 */
export async function triggerLeadWebhook(leadType: string, leadData: any): Promise<void> {
  logger.info(`[TODO] Trigger webhook for ${leadType} lead:`, leadData.id);
  // TODO: Implement webhook trigger
  // This could integrate with:
  // - CRM systems (Salesforce, HubSpot)
  // - Slack notifications
  // - Discord webhooks
  // - Custom internal services
}

// ============ Lead Type Helpers ============

/**
 * Get human-readable lead type name
 */
export function getLeadTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    CUSTOMER: 'Customer',
    TAX_PREPARER: 'Tax Preparer',
    AFFILIATE: 'Affiliate',
    REFERRER: 'Referrer',
  };
  return typeMap[type] || type;
}

/**
 * Get success message template based on lead type
 */
export function getLeadSuccessMessage(type: string): string {
  const messages: Record<string, string> = {
    CUSTOMER: "Thank you! We've received your information and will contact you within 24 hours.",
    TAX_PREPARER: 'Application received! Our team will review your credentials within 24-48 hours.',
    AFFILIATE: 'Welcome to the team! Check your email for affiliate dashboard login details.',
    REFERRER: "Thank you for your referral! We'll keep you updated on the status.",
  };
  return messages[type] || 'Thank you! Your submission has been received.';
}

// ============ Data Enrichment ============

/**
 * Enrich lead data with additional metadata
 * This can include geolocation, browser detection, etc.
 */
export interface EnrichedLeadData {
  metadata: RequestMetadata;
  utm: UtmParameters;
  enrichment?: {
    country?: string;
    region?: string;
    city?: string;
    browser?: string;
    os?: string;
    device?: string;
  };
}

/**
 * Parse user agent to extract browser, OS, and device info
 * This is a simple implementation - consider using a library like ua-parser-js
 */
export function parseUserAgent(userAgent: string): {
  browser: string;
  os: string;
  device: string;
} {
  // Simplified detection - in production, use a proper parser
  const browser = userAgent.includes('Chrome')
    ? 'Chrome'
    : userAgent.includes('Safari')
      ? 'Safari'
      : userAgent.includes('Firefox')
        ? 'Firefox'
        : userAgent.includes('Edge')
          ? 'Edge'
          : 'Other';

  const os = userAgent.includes('Windows')
    ? 'Windows'
    : userAgent.includes('Mac')
      ? 'macOS'
      : userAgent.includes('Linux')
        ? 'Linux'
        : userAgent.includes('Android')
          ? 'Android'
          : userAgent.includes('iOS')
            ? 'iOS'
            : 'Other';

  const device = userAgent.includes('Mobile')
    ? 'Mobile'
    : userAgent.includes('Tablet')
      ? 'Tablet'
      : 'Desktop';

  return { browser, os, device };
}

/**
 * Enrich request with all available metadata
 */
export function enrichLeadData(request: NextRequest, body: any): EnrichedLeadData {
  const metadata = extractRequestMetadata(request);
  const utm = extractUtmParams(body);
  const { browser, os, device } = parseUserAgent(metadata.userAgent);

  return {
    metadata,
    utm,
    enrichment: {
      browser,
      os,
      device,
      // TODO: Add geolocation based on IP
      // country: getCountryFromIp(metadata.ipAddress),
      // region: getRegionFromIp(metadata.ipAddress),
      // city: getCityFromIp(metadata.ipAddress),
    },
  };
}
