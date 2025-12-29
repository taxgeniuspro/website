/**
 * Cache Utility
 *
 * Provides a simple interface for caching API responses.
 * Uses in-memory storage for single-instance deployments.
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

import { logger } from './logger';

// In-memory cache store
interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry>();

// Cleanup expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cacheStore.entries()) {
      if (entry.expiresAt < now) {
        cacheStore.delete(key);
      }
    }
  }, 60000); // Every minute
}

/**
 * Get a value from cache
 * @param key Cache key
 * @returns Parsed JSON value or null if not found/expired
 */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (entry.expiresAt < Date.now()) {
    cacheStore.delete(key);
    return null;
  }

  logger.debug('Cache hit', { key });
  return entry.value as T;
}

/**
 * Set a value in cache
 * @param key Cache key
 * @param value Value to cache
 * @param ttlSeconds Time to live in seconds (default: 300 = 5 minutes)
 */
export async function cacheSet<T = unknown>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<boolean> {
  try {
    cacheStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
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
  try {
    cacheStore.delete(key);
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
  try {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;
    for (const key of cacheStore.keys()) {
      if (regex.test(key)) {
        cacheStore.delete(key);
        count++;
      }
    }
    logger.debug('Cache pattern deleted', { pattern, count });
    return count;
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
  const entry = cacheStore.get(key);
  if (!entry) return false;

  if (entry.expiresAt < Date.now()) {
    cacheStore.delete(key);
    return false;
  }

  return true;
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
