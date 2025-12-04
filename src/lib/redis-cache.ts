/**
 * Redis Cache Utility
 *
 * Provides a simple interface for caching API responses in Redis.
 * Falls back gracefully if Redis is not available.
 *
 * Usage:
 * ```typescript
 * import { cacheGet, cacheSet } from '@/lib/redis-cache';
 *
 * // Try to get cached data
 * const cached = await cacheGet('preparer-availability:123');
 * if (cached) return cached;
 *
 * // Fetch fresh data
 * const data = await fetchData();
 *
 * // Cache for 5 minutes
 * await cacheSet('preparer-availability:123', data, 300);
 * ```
 */

import Redis from 'ioredis';
import { logger } from './logger';

let redis: Redis | null = null;
let redisAvailable = false;

// Initialize Redis client
function getRedisClient(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('REDIS_URL not configured, caching disabled');
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET'];
        return targetErrors.some((targetError) =>
          err.message.includes(targetError)
        );
      },
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
      redisAvailable = false;
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
      redisAvailable = true;
    });

    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis client', { error });
    return null;
  }
}

/**
 * Get a value from cache
 * @param key Cache key
 * @returns Parsed JSON value or null if not found/error
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client || !redisAvailable) return null;

  try {
    const value = await client.get(key);
    if (!value) return null;

    const parsed = JSON.parse(value);
    logger.debug('Cache hit', { key });
    return parsed as T;
  } catch (error) {
    logger.error('Cache get error', { key, error });
    return null;
  }
}

/**
 * Set a value in cache
 * @param key Cache key
 * @param value Value to cache (will be JSON.stringify'd)
 * @param ttlSeconds Time to live in seconds (default: 300 = 5 minutes)
 */
export async function cacheSet<T = any>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<boolean> {
  const client = getRedisClient();
  if (!client || !redisAvailable) return false;

  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
    logger.debug('Cache set', { key, ttl: ttlSeconds });
    return true;
  } catch (error) {
    logger.error('Cache set error', { key, error });
    return false;
  }
}

/**
 * Delete a value from cache
 * @param key Cache key
 */
export async function cacheDel(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client || !redisAvailable) return false;

  try {
    await client.del(key);
    logger.debug('Cache deleted', { key });
    return true;
  } catch (error) {
    logger.error('Cache delete error', { key, error });
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 * @param pattern Pattern to match (e.g., "preparer:*")
 */
export async function cacheDelPattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  if (!client || !redisAvailable) return 0;

  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;

    await client.del(...keys);
    logger.debug('Cache pattern deleted', { pattern, count: keys.length });
    return keys.length;
  } catch (error) {
    logger.error('Cache delete pattern error', { pattern, error });
    return 0;
  }
}

/**
 * Check if a key exists in cache
 * @param key Cache key
 */
export async function cacheExists(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client || !redisAvailable) return false;

  try {
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error('Cache exists error', { key, error });
    return false;
  }
}

/**
 * Cache TTL constants for different data types
 */
export const CacheTTL = {
  VERY_SHORT: 60, // 1 minute - for highly dynamic data
  SHORT: 300, // 5 minutes - for frequently changing data
  MEDIUM: 1800, // 30 minutes - for moderately static data
  LONG: 3600, // 1 hour - for relatively static data
  VERY_LONG: 86400, // 24 hours - for very static data
} as const;

/**
 * Common cache key patterns
 */
export const CacheKey = {
  preparerAvailability: (preparerId: string) => `preparer:${preparerId}:availability`,
  preparerProfile: (preparerId: string) => `preparer:${preparerId}:profile`,
  servicePages: (slug: string) => `page:service:${slug}`,
  landingPage: (slug: string) => `page:landing:${slug}`,
  locationPage: (city: string, state: string) => `page:location:${state}:${city}`,
} as const;
