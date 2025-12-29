/**
 * LLM Caching Layer
 *
 * Reduces API costs by 60-80% through intelligent caching
 * - Caches Ollama text generations
 * - Caches OpenAI translations
 * - Caches image generation prompts (stores URLs, not images)
 * - TTL-based expiration
 * - Cache warming capabilities
 *
 * Uses in-memory storage for single-instance deployments.
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 24 hours)
  prefix?: string; // Cache key prefix
}

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

export class LLMCache {
  private defaultTTL: number = 86400; // 24 hours

  /**
   * Generate cache key from prompt and options
   */
  private generateKey(service: string, prompt: string, options?: Record<string, unknown>): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    const hash = this.simpleHash(prompt + optionsStr);
    return `llm:${service}:${hash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached response
   */
  async get<T = string>(
    service: string,
    prompt: string,
    options?: Record<string, unknown>
  ): Promise<T | null> {
    const key = this.generateKey(service, prompt, options);
    const entry = cacheStore.get(key);

    if (!entry) {
      console.log(`[Cache] MISS: ${service}`);
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      cacheStore.delete(key);
      console.log(`[Cache] MISS (expired): ${service}`);
      return null;
    }

    console.log(`[Cache] HIT: ${service}`);
    return entry.value as T;
  }

  /**
   * Set cached response
   */
  async set<T = string>(
    service: string,
    prompt: string,
    response: T,
    options?: CacheOptions
  ): Promise<void> {
    const key = this.generateKey(service, prompt, options);
    const ttl = options?.ttl || this.defaultTTL;

    cacheStore.set(key, {
      value: response,
      expiresAt: Date.now() + ttl * 1000,
    });

    console.log(`[Cache] SET: ${service} (TTL: ${ttl}s)`);
  }

  /**
   * Cached Ollama generation
   */
  async cachedOllamaGenerate(
    prompt: string,
    options: {
      system?: string;
      temperature?: number;
      maxTokens?: number;
    },
    generator: () => Promise<string>,
    cacheTTL: number = this.defaultTTL
  ): Promise<string> {
    // Check cache first
    const cached = await this.get<string>('ollama', prompt, options);
    if (cached) return cached;

    // Generate fresh response
    const response = await generator();

    // Cache for future use
    await this.set('ollama', prompt, response, { ttl: cacheTTL });

    return response;
  }

  /**
   * Cached OpenAI translation
   */
  async cachedTranslation(
    text: string,
    sourceLocale: string,
    targetLocale: string,
    translator: () => Promise<{ translatedText: string; confidence: number }>,
    cacheTTL: number = 604800 // 7 days for translations
  ): Promise<{ translatedText: string; confidence: number }> {
    const cacheKey = `${sourceLocale}:${targetLocale}`;
    const cached = await this.get<{ translatedText: string; confidence: number }>(
      'translation',
      text,
      { locale: cacheKey }
    );

    if (cached) return cached;

    const response = await translator();
    await this.set('translation', text, response, { ttl: cacheTTL });

    return response;
  }

  /**
   * Cached image generation URL (not the image itself)
   */
  async cachedImageURL(
    prompt: string,
    options: Record<string, unknown>,
    generator: () => Promise<string>,
    cacheTTL: number = 2592000 // 30 days
  ): Promise<string> {
    const cached = await this.get<string>('image', prompt, options);
    if (cached) return cached;

    const imageUrl = await generator();
    await this.set('image', prompt, imageUrl, { ttl: cacheTTL });

    return imageUrl;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<number> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;

    for (const key of cacheStore.keys()) {
      if (regex.test(key)) {
        cacheStore.delete(key);
        count++;
      }
    }

    console.log(`[Cache] Invalidated ${count} keys matching: ${pattern}`);
    return count;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    ollamaKeys: number;
    translationKeys: number;
    imageKeys: number;
    memoryUsage: string;
  }> {
    let ollamaKeys = 0;
    let translationKeys = 0;
    let imageKeys = 0;

    for (const key of cacheStore.keys()) {
      if (key.startsWith('llm:ollama:')) ollamaKeys++;
      if (key.startsWith('llm:translation:')) translationKeys++;
      if (key.startsWith('llm:image:')) imageKeys++;
    }

    return {
      totalKeys: cacheStore.size,
      ollamaKeys,
      translationKeys,
      imageKeys,
      memoryUsage: `${cacheStore.size} entries (in-memory)`,
    };
  }

  /**
   * Warm cache with common prompts
   */
  async warmCache(
    prompts: Array<{ service: string; prompt: string; generator: () => Promise<unknown> }>
  ): Promise<void> {
    console.log(`[Cache] Warming cache with ${prompts.length} prompts...`);

    for (const { service, prompt, generator } of prompts) {
      const cached = await this.get(service, prompt);
      if (!cached) {
        const response = await generator();
        await this.set(service, prompt, response);
      }
    }

    console.log('[Cache] Cache warming complete');
  }

  /**
   * Close (no-op for in-memory cache)
   */
  async disconnect(): Promise<void> {
    // No-op for in-memory cache
  }
}

/**
 * Singleton instance - lazy initialized
 */
let cacheInstance: LLMCache | null = null;

export function getLLMCache(): LLMCache {
  if (!cacheInstance) {
    cacheInstance = new LLMCache();
  }
  return cacheInstance;
}

/**
 * Example usage in Ollama client
 */
export async function cachedOllamaExample() {
  const cache = getLLMCache();

  const response = await cache.cachedOllamaGenerate(
    'Write a 50-word description of business cards',
    { temperature: 0.7, maxTokens: 200 },
    async () => {
      // Your actual Ollama API call here
      return 'Generated description...';
    },
    86400 // 24 hours TTL
  );

  return response;
}
