/**
 * Environment Variable Validation
 *
 * This module validates all required environment variables on application startup.
 * Prevents runtime errors from missing or invalid configuration.
 *
 * Usage: Import this file in your root layout or API route to trigger validation.
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';

const envSchema = z.object({
  // Authentication & Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional(),
  REDIS_PASSWORD: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Email Service
  RESEND_API_KEY: z.string().startsWith('re_', 'RESEND_API_KEY must start with re_').optional(),

  // Storage (Cloudflare R2/S3)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Payment Processing
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_')
    .optional(),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_')
    .optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),

  SQUARE_ACCESS_TOKEN: z.string().optional(),
  SQUARE_LOCATION_ID: z.string().optional(),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().optional(),

  // AI Services
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Application Settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),

  // Sentry (Error Monitoring)
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

/**
 * Validated and type-safe environment variables
 * Import this instead of process.env to ensure type safety
 */
export const env = (() => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        logger.error(`  - ${err.path.join('.')}: ${err.message}`);
      });

      // In production, throw error to prevent app from starting with invalid config
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Invalid environment configuration. Check logs above.');
      }

      // In development, show warnings but allow app to continue
      logger.warn('\n⚠️  WARNING: Running with invalid environment configuration');
      logger.warn('Some features may not work correctly.\n');
    }

    // Return process.env as fallback (with type assertion for development)
    return process.env as z.infer<typeof envSchema>;
  }
})();

/**
 * Runtime environment variable getter with validation
 * Use this for optional environment variables that might not be set
 */
export function getEnv<K extends keyof typeof env>(key: K): (typeof env)[K] | undefined {
  return env[key];
}

/**
 * Require a specific environment variable or throw an error
 * Use this for critical variables that MUST be set
 */
export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value as NonNullable<(typeof env)[K]>;
}

/**
 * Check if we're in a specific environment
 */
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Log environment validation status
if (isDevelopment) {
  logger.info('✅ Environment variables validated successfully');
}
