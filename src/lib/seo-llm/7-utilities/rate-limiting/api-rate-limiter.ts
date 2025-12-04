/**
 * API Rate Limiter with Smart Retry Logic
 *
 * Protects against:
 * - OpenAI rate limits (RPM/TPM)
 * - Google AI rate limits
 * - Ollama overload
 * - Network failures
 *
 * Features:
 * - Exponential backoff with jitter
 * - Request queue management
 * - Token bucket algorithm
 * - Per-service rate limits
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import axiosRetry from 'axios-retry'

export interface RateLimitConfig {
  maxRequests: number // Max requests per window
  windowMs: number // Time window in milliseconds
  maxRetries: number // Max retry attempts
  baseDelay: number // Initial retry delay (ms)
  maxDelay: number // Maximum retry delay (ms)
}

export interface ServiceConfig {
  ollama: RateLimitConfig
  openai: RateLimitConfig
  google: RateLimitConfig
}

const DEFAULT_CONFIGS: ServiceConfig = {
  ollama: {
    maxRequests: 10, // 10 concurrent requests max
    windowMs: 1000, // Per second
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },
  openai: {
    maxRequests: 60, // 60 RPM (adjust based on your tier)
    windowMs: 60000, // Per minute
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
  },
  google: {
    maxRequests: 30, // Conservative limit
    windowMs: 60000, // Per minute
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
  },
}

class TokenBucket {
  private tokens: number
  private lastRefill: number

  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per millisecond
  ) {
    this.tokens = maxTokens
    this.lastRefill = Date.now()
  }

  async consume(tokens: number = 1): Promise<boolean> {
    this.refill()

    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }

    // Wait for tokens to become available
    const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000
    await this.sleep(waitTime)
    return this.consume(tokens)
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    const tokensToAdd = elapsed * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export class APIRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map()
  private configs: ServiceConfig

  constructor(configs?: Partial<ServiceConfig>) {
    this.configs = {
      ...DEFAULT_CONFIGS,
      ...configs,
    }

    // Initialize token buckets
    for (const [service, config] of Object.entries(this.configs)) {
      const refillRate = config.maxRequests / config.windowMs
      this.buckets.set(service, new TokenBucket(config.maxRequests, refillRate))
    }
  }

  /**
   * Execute API call with rate limiting and retry logic
   */
  async execute<T>(
    service: keyof ServiceConfig,
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    const config = this.configs[service]
    const bucket = this.buckets.get(service)!

    // Wait for rate limit token
    await bucket.consume(1)

    // Execute with retry logic
    return this.retryWithBackoff(operation, config, context || service)
  }

  /**
   * Retry with exponential backoff + jitter
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RateLimitConfig,
    context: string,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation()
    } catch (error: any) {
      // Check if retryable
      if (!this.isRetryableError(error)) {
        throw error
      }

      // Check if max retries exceeded
      if (attempt >= config.maxRetries) {
        console.error(`[RateLimit] Max retries exceeded for ${context}`)
        throw new Error(`Max retries (${config.maxRetries}) exceeded: ${error.message}`)
      }

      // Calculate backoff with jitter
      const delay = this.calculateBackoff(attempt, config.baseDelay, config.maxDelay)

      console.warn(
        `[RateLimit] ${context} failed (attempt ${attempt}/${config.maxRetries}), ` +
          `retrying in ${delay}ms...`
      )

      await this.sleep(delay)
      return this.retryWithBackoff(operation, config, context, attempt + 1)
    }
  }

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
    const jitter = Math.random() * 0.3 * exponentialDelay // ±30% jitter
    return Math.floor(exponentialDelay + jitter)
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true
    }

    // HTTP status codes that should be retried
    const retryableStatus = [408, 429, 500, 502, 503, 504]
    if (error.response?.status && retryableStatus.includes(error.response.status)) {
      return true
    }

    // Rate limit errors
    if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
      return true
    }

    return false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get current rate limit status
   */
  getStatus(service: keyof ServiceConfig): {
    maxRequests: number
    windowMs: number
    availableTokens: number
  } {
    const config = this.configs[service]
    const bucket = this.buckets.get(service)!

    return {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      availableTokens: Math.floor((bucket as any).tokens),
    }
  }
}

/**
 * Create Axios instance with retry logic
 */
export function createRateLimitedAxios(service: keyof ServiceConfig): AxiosInstance {
  const instance = axios.create({
    timeout: 60000, // 60 seconds
  })

  const config = DEFAULT_CONFIGS[service]

  axiosRetry(instance, {
    retries: config.maxRetries,
    retryDelay: (retryCount) => {
      return Math.min(config.baseDelay * Math.pow(2, retryCount - 1), config.maxDelay)
    },
    retryCondition: (error) => {
      return (
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        error.response?.status === 429 ||
        error.response?.status === 503
      )
    },
    onRetry: (retryCount, error, requestConfig) => {
      console.log(
        `[Axios] Retry ${retryCount}/${config.maxRetries} for ${requestConfig.url}: ${error.message}`
      )
    },
  })

  return instance
}

/**
 * Singleton instance
 */
let rateLimiterInstance: APIRateLimiter | null = null

export function getRateLimiter(configs?: Partial<ServiceConfig>): APIRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new APIRateLimiter(configs)
  }
  return rateLimiterInstance
}

/**
 * Example usage with Ollama
 */
export async function rateLimitedOllamaExample() {
  const limiter = getRateLimiter()

  const response = await limiter.execute(
    'ollama',
    async () => {
      // Your actual API call here
      const result = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          model: 'qwen2.5:32b',
          prompt: 'Hello world',
        }),
      })
      return result.json()
    },
    'ollama-generation'
  )

  return response
}

/**
 * Example usage with OpenAI
 */
export async function rateLimitedOpenAIExample() {
  const limiter = getRateLimiter()
  const axios = createRateLimitedAxios('openai')

  const response = await limiter.execute(
    'openai',
    async () => {
      return axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Translate to Spanish: Hello' }],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      )
    },
    'openai-translation'
  )

  return response.data
}
