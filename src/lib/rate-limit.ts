/**
 * Rate Limiting Module
 *
 * Uses ioredis for VPS Redis when available, falls back to in-memory store.
 * Coolify deployments use Redis on the same VPS network.
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logger';

// Check if we're in a build environment
const isBuildTime = process.env.DOCKER_BUILD === 'true' ||
                    process.env.NEXT_PHASE === 'phase-production-build' ||
                    process.env.SKIP_REDIS === 'true';

// In-memory store for rate limiting when Redis is unavailable
class InMemoryRateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async limit(key: string, maxRequests: number, windowMs: number) {
    const now = Date.now();
    const entry = this.store.get(key);

    // Cleanup expired entries periodically
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

// Try to create Redis client, fall back to in-memory if unavailable
let redis: Redis | null = null;
let usingInMemory = isBuildTime; // Start with in-memory during build
const inMemoryStore = new InMemoryRateLimitStore();

// Only try to connect to Redis if not in build time
if (!isBuildTime) {
  try {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      redis = new Redis(redisUrl, {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      // Test connection
      redis.on('error', (err) => {
        if (!usingInMemory) {
          logger.warn('[RateLimit] Redis connection failed, using in-memory store', {
            error: err.message,
          });
          usingInMemory = true;
        }
      });
    } else {
      // No REDIS_URL configured, use in-memory
      usingInMemory = true;
    }
  } catch (error) {
    logger.warn('[RateLimit] Redis initialization failed, using in-memory store');
    usingInMemory = true;
  }
} else {
  logger.debug('[RateLimit] Skipping Redis connection during build time');
}

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

// Helper to create rate limiter with fallback
function createRateLimiter(config: { max: number; windowMs: number; prefix: string }): RateLimiter {
  if (redis && !usingInMemory) {
    // Use Redis-based sliding window rate limiter
    return {
      limit: async (key: string): Promise<RateLimitResult> => {
        const fullKey = `${config.prefix}:${key}`;
        const now = Date.now();
        const windowStart = now - config.windowMs;

        try {
          // Use sorted set for sliding window
          const multi = redis!.multi();
          multi.zremrangebyscore(fullKey, 0, windowStart);
          multi.zadd(fullKey, now, `${now}-${Math.random()}`);
          multi.zcard(fullKey);
          multi.expire(fullKey, Math.ceil(config.windowMs / 1000));

          const results = await multi.exec();
          const count = (results?.[2]?.[1] as number) || 0;

          return {
            success: count <= config.max,
            limit: config.max,
            reset: now + config.windowMs,
            remaining: Math.max(0, config.max - count),
          };
        } catch (error) {
          // Fall back to in-memory on error
          return inMemoryStore.limit(fullKey, config.max, config.windowMs);
        }
      },
    };
  }

  // Return in-memory limiter
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
