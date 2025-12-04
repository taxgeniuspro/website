/**
 * Centralized logging service for TaxGeniusPro
 *
 * Features:
 * - Environment-aware logging (production vs development)
 * - Structured log levels (debug, info, warn, error)
 * - Optional metadata support
 * - Integration-ready for external services (Sentry, DataDog, etc.)
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.debug('Debugging information', { userId: 123 })
 * logger.info('User logged in', { email: 'user@example.com' })
 * logger.warn('Rate limit approaching', { requests: 95 })
 * logger.error('Failed to process payment', error, { orderId: 'abc123' })
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown>;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Determines if a log level should be output based on the environment
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction) {
      // In production, only log warnings and errors
      return level === 'error' || level === 'warn';
    }
    // In development, log everything
    return true;
  }

  /**
   * Formats metadata for consistent output
   */
  private formatMetadata(metadata?: LogMetadata): string {
    if (!metadata || Object.keys(metadata).length === 0) {
      return '';
    }
    return '\n' + JSON.stringify(metadata, null, 2);
  }

  /**
   * Debug-level logging for detailed development information
   * Only logs in development environment
   */
  debug(message: string, metadata?: LogMetadata) {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}${this.formatMetadata(metadata)}`);
    }
  }

  /**
   * Info-level logging for general application flow
   * Only logs in development environment
   */
  info(message: string, metadata?: LogMetadata) {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}${this.formatMetadata(metadata)}`);
    }
  }

  /**
   * Warning-level logging for concerning but non-critical issues
   * Logs in all environments
   */
  warn(message: string, metadata?: LogMetadata) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}${this.formatMetadata(metadata)}`);
    }
  }

  /**
   * Error-level logging for exceptions and critical failures
   * Always logs in all environments
   *
   * Automatically integrates with Sentry when configured
   */
  error(message: string, error?: Error | unknown, metadata?: LogMetadata) {
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : { error };

    const fullMetadata = {
      ...errorDetails,
      ...metadata,
    };

    console.error(`[ERROR] ${message}${this.formatMetadata(fullMetadata)}`);

    // Integrate with Sentry if configured
    if (this.isProduction && typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Client-side Sentry integration
      // Note: Sentry is imported dynamically to avoid bundling when not configured
      import('@sentry/nextjs')
        .then((module) => {
          module.captureException(error instanceof Error ? error : new Error(message), {
            tags: metadata,
            level: 'error',
            extra: { message, ...fullMetadata },
          });
        })
        .catch(() => {
          // Sentry not available - silently continue
        });
    }
  }

  /**
   * Convenience method for logging API requests
   */
  apiRequest(method: string, path: string, metadata?: LogMetadata) {
    this.info(`API ${method} ${path}`, metadata);
  }

  /**
   * Convenience method for logging API responses
   */
  apiResponse(method: string, path: string, status: number, metadata?: LogMetadata) {
    const logMethod = status >= 400 ? 'warn' : 'info';
    this[logMethod](`API ${method} ${path} - ${status}`, metadata);
  }

  /**
   * Convenience method for logging database queries
   */
  dbQuery(query: string, metadata?: LogMetadata) {
    this.debug(`DB Query: ${query}`, metadata);
  }

  /**
   * Convenience method for logging authentication events
   */
  auth(event: string, metadata?: LogMetadata) {
    this.info(`Auth: ${event}`, metadata);
  }
}

/**
 * Singleton logger instance
 * Import and use this throughout the application
 */
export const logger = new Logger();
