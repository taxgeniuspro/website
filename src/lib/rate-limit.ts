/**
 * Rate Limiting Module
 *
 * Uses in-memory store for rate limiting.
 * Suitable for single-instance deployments on Coolify VPS.
 */

import { logger } from '@/lib/logger';

// In-memory store for rate limiting
class InMemoryRateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async limit(key: string, maxRequests: number, windowMs: number) {
    const now = Date.now();
    const entry = this.store.get(key);

    // Cleanup expired entries periodically (10% chance per request)
    if (Math.random() < 0.1) {
      this.cleanup(now);
    }

    if (!entry || entry.resetTime < now) {
      this.store.set(key, { count: 1, resetTime: now + windowMs });
      return {
        success: true,
        limit: maxRequests,
        reset: now + windowMs,
        remaining: maxRequests - 1,
      };
    }

    entry.count++;
    const remaining = Math.max(0, maxRequests - entry.count);
    const success = entry.count <= maxRequests;

    return { success, limit: maxRequests, reset: entry.resetTime, remaining };
  }

  private cleanup(now: number) {
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime < now) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton instance
const inMemoryStore = new InMemoryRateLimitStore();

// ============ Rate Limiter Implementation ============

interface RateLimitResult {
  success: boolean;
  limit: number;
  reset: number;
  remaining: number;
}

interface RateLimiter {
  limit: (key: string) => Promise<RateLimitResult>;
}

// Helper to create rate limiter
function createRateLimiter(config: { max: number; windowMs: number; prefix: string }): RateLimiter {
  return {
    limit: async (key: string): Promise<RateLimitResult> => {
      return inMemoryStore.limit(`${config.prefix}:${key}`, config.max, config.windowMs);
    },
  };
}

// ============ Rate Limiters for Different Endpoints ============

// AI Content Generation: 10 requests per minute per user
export const aiContentRateLimit = createRateLimiter({
  max: 10,
  windowMs: 60000,
  prefix: 'ratelimit:ai-content',
});

// General API: 100 requests per minute per IP
export const apiRateLimit = createRateLimiter({
  max: 100,
  windowMs: 60000,
  prefix: 'ratelimit:api',
});

// Authentication endpoints: 10 requests per minute per IP (prevent brute force)
export const authRateLimit = createRateLimiter({
  max: 10,
  windowMs: 60000,
  prefix: 'ratelimit:auth',
});

// Document operations: 30 requests per minute per user
export const documentRateLimit = createRateLimiter({
  max: 30,
  windowMs: 60000,
  prefix: 'ratelimit:document',
});

// Upload endpoints: 20 uploads per hour per user (prevent abuse)
export const uploadRateLimit = createRateLimiter({
  max: 20,
  windowMs: 3600000,
  prefix: 'ratelimit:upload',
});

// Payment webhooks: 1000 requests per minute (high throughput for Square)
export const webhookRateLimit = createRateLimiter({
  max: 1000,
  windowMs: 60000,
  prefix: 'ratelimit:webhook',
});

// Referral tracking: 200 events per minute per IP
export const trackingRateLimit = createRateLimiter({
  max: 200,
  windowMs: 60000,
  prefix: 'ratelimit:tracking',
});

// Admin role changes: 5 per minute per user (prevent mass role escalation)
export const adminRoleChangeRateLimit = createRateLimiter({
  max: 5,
  windowMs: 60000,
  prefix: 'ratelimit:admin-role',
});

// ============ Helper Functions ============

/**
 * Get client IP address from request headers
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return 'anonymous';
}

/**
 * Get user-specific identifier (for authenticated requests)
 */
export function getUserIdentifier(userId: string, ip?: string): string {
  return ip ? `${userId}:${ip}` : userId;
}

/**
 * Check rate limit for a specific limiter
 */
export async function checkRateLimit(identifier: string, limiter: RateLimiter = aiContentRateLimit) {
  const { success, limit, reset, remaining } = await limiter.limit(identifier);

  return {
    success,
    limit,
    reset,
    remaining,
    retryAfter: success ? 0 : Math.ceil((reset - Date.now()) / 1000), // seconds until reset
  };
}

/**
 * Create rate limit headers for response
 */
export function getRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  reset: number;
}): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}
