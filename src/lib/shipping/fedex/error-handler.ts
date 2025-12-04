/**
 * FedEx Error Handler
 * WooCommerce-grade error handling with retry logic and token refresh
 *
 * Features:
 * - Automatic OAuth token refresh on 401
 * - Exponential backoff on rate limiting (429)
 * - Network error retries with jitter
 * - Structured logging
 * - Partial failure handling
 */

import axios, { type AxiosError, type AxiosResponse } from 'axios'
import type { FedExApiError, FedExErrorCode, FedExRateResponse } from './types'

export class FedExError extends Error implements FedExApiError {
  code: string
  statusCode?: number
  response?: FedExRateResponse
  retryable: boolean

  constructor(
    message: string,
    code: string,
    options: {
      statusCode?: number
      response?: FedExRateResponse
      retryable?: boolean
      cause?: Error
    } = {}
  ) {
    super(message)
    this.name = 'FedExError'
    this.code = code
    this.statusCode = options.statusCode
    this.response = options.response
    this.retryable = options.retryable ?? false
    this.cause = options.cause
  }
}

/**
 * Error codes mapped from HTTP status and FedEx API responses
 */
export const ERROR_CODES = {
  // Authentication
  AUTH_FAILED: 'AUTHENTICATION_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Rate limiting
  RATE_LIMIT: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',

  // Validation
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_DIMENSIONS: 'INVALID_DIMENSIONS',
  WEIGHT_EXCEEDED: 'WEIGHT_EXCEEDED',
  UNSUPPORTED_SERVICE: 'UNSUPPORTED_SERVICE',

  // Service
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
} as const

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  retryableStatusCodes: number[]
  useExponentialBackoff: boolean
  useJitter: boolean
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  useExponentialBackoff: true,
  useJitter: true,
}

/**
 * Main error handler class
 */
export class FedExErrorHandler {
  private retryConfig: RetryConfig

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  }

  /**
   * Parse Axios error into FedExError
   */
  parseError(error: unknown): FedExError {
    // Already a FedExError
    if (error instanceof FedExError) {
      return error
    }

    // Axios error
    if (axios.isAxiosError(error)) {
      return this.parseAxiosError(error)
    }

    // Generic error
    if (error instanceof Error) {
      return new FedExError(error.message, ERROR_CODES.UNKNOWN, {
        retryable: false,
        cause: error,
      })
    }

    // Unknown error type
    return new FedExError('An unknown error occurred', ERROR_CODES.UNKNOWN, {
      retryable: false,
    })
  }

  /**
   * Parse Axios error specifically
   */
  private parseAxiosError(error: AxiosError): FedExError {
    const status = error.response?.status
    const responseData = error.response?.data as FedExRateResponse | undefined

    // Authentication errors (401)
    if (status === 401) {
      return new FedExError(
        'FedEx authentication failed. Token may be expired.',
        ERROR_CODES.TOKEN_EXPIRED,
        {
          statusCode: 401,
          response: responseData,
          retryable: true, // Retry after token refresh
        }
      )
    }

    // Rate limiting (429)
    if (status === 429) {
      return new FedExError(
        'FedEx rate limit exceeded. Please try again later.',
        ERROR_CODES.RATE_LIMIT,
        {
          statusCode: 429,
          response: responseData,
          retryable: true,
        }
      )
    }

    // Server errors (5xx)
    if (status && status >= 500) {
      return new FedExError(
        'FedEx service temporarily unavailable.',
        ERROR_CODES.SERVICE_UNAVAILABLE,
        {
          statusCode: status,
          response: responseData,
          retryable: true,
        }
      )
    }

    // Client errors (4xx) - not retryable
    if (status && status >= 400 && status < 500) {
      const fedexErrors = responseData?.errors || []
      const errorMessage =
        fedexErrors.length > 0 ? fedexErrors.map((e) => e.message).join(', ') : error.message

      return new FedExError(errorMessage, this.mapFedExErrorCode(fedexErrors[0]?.code), {
        statusCode: status,
        response: responseData,
        retryable: false,
      })
    }

    // Network errors (no response)
    if (error.code === 'ECONNREFUSED') {
      return new FedExError('Could not connect to FedEx API.', ERROR_CODES.CONNECTION_REFUSED, {
        retryable: true,
        cause: error,
      })
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return new FedExError('Request to FedEx API timed out.', ERROR_CODES.TIMEOUT, {
        retryable: true,
        cause: error,
      })
    }

    // Generic network error
    return new FedExError(
      error.message || 'Network error connecting to FedEx.',
      ERROR_CODES.NETWORK_ERROR,
      {
        retryable: true,
        cause: error,
      }
    )
  }

  /**
   * Map FedEx API error codes to our error codes
   */
  private mapFedExErrorCode(fedexCode?: string): string {
    if (!fedexCode) return ERROR_CODES.UNKNOWN

    const codeMap: Record<string, string> = {
      'INVALID.ADDRESS': ERROR_CODES.INVALID_ADDRESS,
      'INVALID.CITY.STATE.ZIP': ERROR_CODES.INVALID_ADDRESS,
      'INVALID.POSTAL.CODE': ERROR_CODES.INVALID_ADDRESS,
      'WEIGHT.EXCEEDS.MAXIMUM': ERROR_CODES.WEIGHT_EXCEEDED,
      'DIMENSIONS.INVALID': ERROR_CODES.INVALID_DIMENSIONS,
      'SERVICE.NOT.AVAILABLE': ERROR_CODES.UNSUPPORTED_SERVICE,
      UNAUTHORIZED: ERROR_CODES.AUTH_FAILED,
      'AUTHENTICATION.FAILED': ERROR_CODES.AUTH_FAILED,
    }

    return codeMap[fedexCode] || ERROR_CODES.UNKNOWN
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  calculateDelay(attempt: number): number {
    const { baseDelay, maxDelay, useExponentialBackoff, useJitter } = this.retryConfig

    let delay = baseDelay

    if (useExponentialBackoff) {
      delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
    }

    if (useJitter) {
      // Add random jitter (±25%)
      const jitter = delay * 0.25
      delay = delay + (Math.random() * jitter * 2 - jitter)
    }

    return Math.floor(delay)
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: FedExError): boolean {
    // Explicitly marked as retryable
    if (error.retryable) return true

    // Check status code
    if (error.statusCode && this.retryConfig.retryableStatusCodes.includes(error.statusCode)) {
      return true
    }

    return false
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    onTokenRefresh?: () => Promise<void>,
    context: string = 'FedEx API request'
  ): Promise<T> {
    let lastError: FedExError | null = null
    let tokenRefreshed = false

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries + 1; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = this.parseError(error)

        // Log the error
        this.logError(lastError, attempt, context)

        // Token expired - refresh once and retry immediately
        if (lastError.code === ERROR_CODES.TOKEN_EXPIRED && !tokenRefreshed && onTokenRefresh) {
          try {
            await onTokenRefresh()
            tokenRefreshed = true
            continue // Retry immediately without delay
          } catch (refreshError) {
            throw new FedExError(
              'Failed to refresh authentication token',
              ERROR_CODES.AUTH_FAILED,
              {
                retryable: false,
                cause: refreshError as Error,
              }
            )
          }
        }

        // Check if we should retry
        const shouldRetry = attempt < this.retryConfig.maxRetries + 1 && this.isRetryable(lastError)

        if (!shouldRetry) {
          throw lastError
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt)
        await this.sleep(delay)
      }
    }

    // All retries exhausted
    throw (
      lastError ||
      new FedExError('Max retries exhausted', ERROR_CODES.UNKNOWN, { retryable: false })
    )
  }

  /**
   * Log error with structured format
   */
  private logError(error: FedExError, attempt: number, context: string): void {
    const logData = {
      timestamp: new Date().toISOString(),
      context,
      attempt,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        retryable: error.retryable,
      },
      fedexResponse: error.response
        ? {
            transactionId: error.response.transactionId,
            errors: error.response.errors,
            alerts: error.response.output?.alerts,
          }
        : undefined,
    }

    // In production, send to logging service (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      console.error('[FedEx Error]', JSON.stringify(logData, null, 2))
      // TODO: Send to Sentry/LogRocket
    } else {
      console.error('[FedEx Error]', logData)
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Handle partial failures (some services succeeded, others failed)
   */
  handlePartialFailure<T>(
    results: Array<{ success: boolean; data?: T; error?: FedExError }>,
    context: string
  ): T[] {
    const successful = results.filter((r) => r.success && r.data).map((r) => r.data!)
    const failed = results.filter((r) => !r.success)

    if (failed.length > 0) {
      console.warn(
        `[FedEx] Partial failure in ${context}: ${successful.length} succeeded, ${failed.length} failed`
      )

      // Log failed items
      failed.forEach((f, index) => {
        if (f.error) {
          this.logError(f.error, 1, `${context} (item ${index + 1})`)
        }
      })
    }

    return successful
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = new FedExErrorHandler()

/**
 * Convenience function for wrapping API calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  onTokenRefresh?: () => Promise<void>,
  context?: string
): Promise<T> {
  return errorHandler.executeWithRetry(fn, onTokenRefresh, context)
}
