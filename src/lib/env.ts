/**
 * Environment Variable Validation
 *
 * This file validates all environment variables used in the application
 * to catch configuration errors early and provide type safety.
 *
 * Usage:
 * ```typescript
 * import { env } from '@/lib/env'
 *
 * // Type-safe and validated
 * const apiUrl = env.DATABASE_URL
 * ```
 */

import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url().describe('PostgreSQL database connection URL'),

  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/auth/signin'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/auth/signup'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/auth/select-role'),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET_NAME: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Square
  SQUARE_ACCESS_TOKEN: z.string().optional(),
  SQUARE_LOCATION_ID: z.string().optional(),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().optional(),
  SQUARE_ENVIRONMENT: z.enum(['production', 'sandbox']).default('sandbox'),

  // Resend (Email)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().default('noreply@taxgeniuspro.tax'),

  // Google AI
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Sentry (Error Tracking)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Google Analytics
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3005'),

  // Web Push Notifications
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().email().optional(),

  // IORedis (if using local Redis)
  REDIS_URL: z.string().url().optional(),
});

// Type for validated environment variables
export type Env = z.infer<typeof envSchema>;

/**
 * Validates and exports environment variables
 * Throws an error if validation fails
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors
        .filter((e) => e.message === 'Required')
        .map((e) => e.path.join('.'));

      const invalid = error.errors
        .filter((e) => e.message !== 'Required')
        .map((e) => `${e.path.join('.')}: ${e.message}`);

      let errorMessage = '❌ Invalid environment variables:\n';

      if (missing.length > 0) {
        errorMessage += `\nMissing required variables:\n  - ${missing.join('\n  - ')}\n`;
      }

      if (invalid.length > 0) {
        errorMessage += `\nInvalid values:\n  - ${invalid.join('\n  - ')}\n`;
      }

      errorMessage +=
        '\nCheck your .env file and ensure all required variables are set correctly.\n';

      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Validated environment variables
 * Import this throughout the application instead of process.env
 */
export const env = validateEnv();

/**
 * Helper to check if we're in production
 */
export const isProd = env.NODE_ENV === 'production';

/**
 * Helper to check if we're in development
 */
export const isDev = env.NODE_ENV === 'development';

/**
 * Helper to check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test';
