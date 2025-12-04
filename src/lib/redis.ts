import Redis from 'ioredis';
import { logger } from '@/lib/logger';

// Check if we're in a build environment
const isBuildTime = process.env.DOCKER_BUILD === 'true' ||
                    process.env.NEXT_PHASE === 'phase-production-build' ||
                    process.env.SKIP_REDIS === 'true';

const globalForRedis = global as unknown as {
  redis: Redis | undefined;
};

// Parse REDIS_URL if provided, otherwise use individual env vars
function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    // Use URL-based connection (Docker-friendly)
    return new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Don't connect immediately
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });
  }

  // Fallback to host/port configuration
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    lazyConnect: true, // Don't connect immediately
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  });
}

// Lazy-load Redis client - only create when needed, not at module load time
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (isBuildTime) {
    // During build, return a mock that will error on actual use
    throw new Error('Redis not available during build time');
  }

  if (!_redis) {
    _redis = globalForRedis.redis ?? createRedisClient();
    if (process.env.NODE_ENV !== 'production') {
      globalForRedis.redis = _redis;
    }
  }
  return _redis;
}

// Export getter function for lazy access
export { getRedis };

// For backwards compatibility, export redis as a getter that lazily initializes
// This will throw if accessed during build time
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedis();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// Helper functions for common operations
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
    }
  },

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Redis invalidate error for pattern ${pattern}:`, error);
    }
  },

  // Rate limiting helper
  async rateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);
      const reset = Date.now() + ttl * 1000;

      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        reset,
      };
    } catch (error) {
      logger.error(`Redis rate limit error for key ${key}:`, error);
      // Fail open - allow the request if Redis is down
      return { allowed: true, remaining: limit, reset: Date.now() + windowSeconds * 1000 };
    }
  },
};

// Session storage helpers for Lucia Auth
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
  referrerActivity: (referrerId: string, limit: number) =>
    `referrer:activity:${referrerId}:${limit}`,
  contestLeaderboard: (limit: number) => `contest:leaderboard:${limit}`,
  activeContests: () => 'contests:active',
  vanitySlug: (slug: string) => `vanity:${slug}`,
  userProfile: (userId: string) => `profile:${userId}`,
};
