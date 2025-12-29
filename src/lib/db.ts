/**
 * Database Client - Supabase PostgreSQL via HTTP API
 *
 * Self-hosted Supabase on VPS 72.60.28.175
 * Replaces Prisma for database operations (HTTP-based, no TCP connection issues)
 *
 * Usage:
 * - Import: import { db } from '@/lib/db'
 * - Query: const users = await db.from('profiles').select('*').eq('role', 'admin')
 * - RPC: await db.rpc('calculate_commission', { user_id: '123' })
 *
 * @see https://supabase.com/docs/reference/javascript
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

// Self-hosted Supabase on VPS
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'http://supabasekong-sg00o844o4gs84ogock8c0c8.72.60.28.175.sslip.io';

const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ============================================================================
// SINGLETON CLIENTS
// ============================================================================

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

/**
 * Get Supabase client for public operations (uses anon key)
 * Use for client-side operations and authenticated user requests
 */
function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_ANON_KEY) {
      console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY not set, some operations may fail');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

/**
 * Get Supabase admin client for server-side operations (uses service role key)
 * Use for API routes and server actions that need full database access
 * NEVER expose this to the client
 */
function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminClient) {
    if (!SUPABASE_SERVICE_KEY) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
          'Add it to Coolify environment variables for taxgeniuspro-web.'
      );
    }
    supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdminClient;
}

// ============================================================================
// PRISMA-COMPATIBLE DATABASE WRAPPER
// ============================================================================

/**
 * Database helper that wraps Supabase operations
 * Provides access to Supabase query builder with a cleaner API
 *
 * Note: Supabase uses lowercase table names by default.
 * The Prisma schema maps model names to snake_case table names (e.g., Profile → profiles)
 */
export const db = {
  /**
   * Get the raw Supabase admin client for advanced operations
   */
  get client(): SupabaseClient {
    return getSupabaseAdmin();
  },

  /**
   * Get the public Supabase client (anon key)
   */
  get publicClient(): SupabaseClient {
    return getSupabase();
  },

  /**
   * Query a table directly
   * @param table - The table name (lowercase, e.g., 'profiles', 'users', 'referrals')
   *
   * @example
   * // Simple select
   * const { data, error } = await db.from('profiles').select('*').eq('role', 'admin');
   *
   * // Select with relations (use foreign key columns)
   * const { data } = await db.from('profiles')
   *   .select('*, users!inner(email)')
   *   .eq('id', profileId);
   *
   * // Insert
   * const { data, error } = await db.from('profiles').insert({ firstName: 'John', role: 'client' });
   *
   * // Update
   * const { data, error } = await db.from('profiles').update({ firstName: 'Jane' }).eq('id', profileId);
   *
   * // Delete
   * const { error } = await db.from('profiles').delete().eq('id', profileId);
   */
  from(table: string) {
    return getSupabaseAdmin().from(table);
  },

  /**
   * Execute a PostgreSQL RPC (stored procedure/function)
   * @param fn - The function name
   * @param params - Parameters to pass to the function
   *
   * @example
   * const { data, error } = await db.rpc('calculate_commission', { user_id: '123' });
   */
  rpc(fn: string, params?: Record<string, unknown>) {
    return getSupabaseAdmin().rpc(fn, params);
  },

  /**
   * Storage operations for file uploads
   *
   * @example
   * // Upload a file
   * const { data, error } = await db.storage.from('documents').upload('path/file.pdf', file);
   *
   * // Get public URL
   * const { data } = db.storage.from('documents').getPublicUrl('path/file.pdf');
   *
   * // Delete a file
   * const { error } = await db.storage.from('documents').remove(['path/file.pdf']);
   */
  storage: {
    from(bucket: string) {
      return getSupabaseAdmin().storage.from(bucket);
    },
  },

  /**
   * Auth admin operations (server-side only)
   *
   * @example
   * // Create a user
   * const { data, error } = await db.auth.admin.createUser({
   *   email: 'user@example.com',
   *   password: 'password123',
   *   email_confirm: true
   * });
   *
   * // Delete a user
   * const { error } = await db.auth.admin.deleteUser(userId);
   */
  auth: {
    get admin() {
      return getSupabaseAdmin().auth.admin;
    },
  },
};

// ============================================================================
// TABLE NAME MAPPINGS (Prisma model → Supabase table)
// ============================================================================

/**
 * Maps Prisma model names to Supabase/PostgreSQL table names
 * Use this when migrating Prisma code to Supabase
 */
export const TABLE_NAMES = {
  // Auth & Users
  User: 'users',
  Account: 'accounts',
  Session: 'sessions',
  VerificationToken: 'verification_tokens',
  MagicLink: 'magic_links',
  LoginAttempt: 'login_attempts',
  Profile: 'profiles',

  // Referral System
  Referral: 'referrals',
  ReferralAnalytics: 'referral_analytics',

  // Tax System
  TaxReturn: 'tax_returns',
  TaxIntakeLead: 'tax_intake_leads',
  Document: 'documents',

  // CRM
  CRMContact: 'crm_contacts',
  CRMInteraction: 'crm_interactions',

  // Appointments
  Appointment: 'appointments',
  AppointmentType: 'appointment_types',
  AvailabilitySlot: 'availability_slots',

  // Payments
  Payment: 'payments',
  Commission: 'commissions',
  PayoutRequest: 'payout_requests',

  // Marketing
  MarketingCampaign: 'marketing_campaigns',
  MarketingAsset: 'marketing_assets',

  // And more... add as needed during migration
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper to handle Supabase errors consistently
 */
export function handleDbError(error: unknown, operation: string): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Database ${operation} failed:`, message);
  throw new Error(`Database ${operation} failed: ${message}`);
}

/**
 * Helper to ensure a single result from a query
 * Throws if no result or multiple results
 */
export function ensureSingle<T>(
  data: T[] | null,
  errorMessage = 'Expected exactly one result'
): T {
  if (!data || data.length === 0) {
    throw new Error(`${errorMessage}: no results found`);
  }
  if (data.length > 1) {
    throw new Error(`${errorMessage}: multiple results found`);
  }
  return data[0];
}

/**
 * Helper to get first result or null
 */
export function firstOrNull<T>(data: T[] | null): T | null {
  if (!data || data.length === 0) {
    return null;
  }
  return data[0];
}

// ============================================================================
// EXPORTS
// ============================================================================

export { getSupabase, getSupabaseAdmin };
export type { SupabaseClient };
export default db;
