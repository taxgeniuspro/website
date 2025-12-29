/**
 * In-Memory Cache Utility
 *
 * Replaces Redis with a simple in-memory store.
 * Suitable for single-instance deployments on Coolify VPS.
 *
 * Features:
 * - TTL-based expiration
 * - Automatic cleanup of expired entries
 * - Compatible API with previous Redis implementation
 */

import { logger } from '@/lib/logger';

// In-memory store with TTL tracking
interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number | null; // null = no expiration
}

class InMemoryCache {
  private store: Map<string, CacheEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup expired entries every 60 seconds
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async invalidate(pattern: string): Promise<void> {
    // Simple pattern matching (supports * at end)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const current = entry ? (typeof entry.value === 'number' ? entry.value : 0) : 0;
    const newValue = current + 1;
    this.store.set(key, { value: newValue, expiresAt: entry?.expiresAt || null });
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || !entry.expiresAt) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matches: string[] = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        matches.push(key);
      }
    }
    return matches;
  }

  async exists(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return 0;
    }
    return 1;
  }

  // Rate limiting helper
  async rateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    const current = await this.incr(key);

    if (current === 1) {
      await this.expire(key, windowSeconds);
    }

    const ttl = await this.ttl(key);
    const reset = Date.now() + ttl * 1000;

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      reset,
    };
  }
}

// Singleton instance
const cacheInstance = new InMemoryCache();

// Export cache object for compatibility
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      return await cacheInstance.get<T>(key);
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      await cacheInstance.set(key, value, ttlSeconds);
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error);
    }
  },

  async del(key: string): Promise<void> {
    try {
      await cacheInstance.del(key);
    } catch (error) {
      logger.error(`Cache DEL error for key ${key}:`, error);
    }
  },

  async invalidate(pattern: string): Promise<void> {
    try {
      await cacheInstance.invalidate(pattern);
    } catch (error) {
      logger.error(`Cache invalidate error for pattern ${pattern}:`, error);
    }
  },

  async rateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    try {
      return await cacheInstance.rateLimit(key, limit, windowSeconds);
    } catch (error) {
      logger.error(`Cache rate limit error for key ${key}:`, error);
      return { allowed: true, remaining: limit, reset: Date.now() + windowSeconds * 1000 };
    }
  },
};

// Export redis-like interface for compatibility with existing code
export const redis = {
  get: (key: string) => cacheInstance.get<string>(key).then((v) => (v === null ? null : String(v))),
  set: (key: string, value: string) => cacheInstance.set(key, value),
  setex: (key: string, ttl: number, value: string) => cacheInstance.set(key, value, ttl),
  del: (...keys: string[]) => Promise.all(keys.map((k) => cacheInstance.del(k))),
  incr: (key: string) => cacheInstance.incr(key),
  expire: (key: string, seconds: number) => cacheInstance.expire(key, seconds),
  ttl: (key: string) => cacheInstance.ttl(key),
  keys: (pattern: string) => cacheInstance.keys(pattern),
  exists: (key: string) => cacheInstance.exists(key),
};

// Session storage helpers
export const sessionStorage = {
  async get(sessionId: string): Promise<unknown | null> {
    return cache.get(`session:${sessionId}`);
  },

  async set(sessionId: string, data: unknown, expiresInSeconds: number): Promise<void> {
    return cache.set(`session:${sessionId}`, data, expiresInSeconds);
  },

  async delete(sessionId: string): Promise<void> {
    return cache.del(`session:${sessionId}`);
  },
};

// Cache keys generator
export const cacheKeys = {
  referrerStats: (referrerId: string) => `referrer:stats:${referrerId}`,
  referrerActivity: (referrerId: string, limit: number) => `referrer:activity:${referrerId}:${limit}`,
  contestLeaderboard: (limit: number) => `contest:leaderboard:${limit}`,
  activeContests: () => 'contests:active',
  vanitySlug: (slug: string) => `vanity:${slug}`,
  userProfile: (userId: string) => `profile:${userId}`,
};
