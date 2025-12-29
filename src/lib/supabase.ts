/**
 * Supabase Client Configuration
 *
 * Re-exports from db.ts for backwards compatibility
 * Use db.ts directly for new code
 *
 * @see /src/lib/db.ts
 */

export {
  db,
  getSupabase,
  getSupabaseAdmin,
  TABLE_NAMES,
  handleDbError,
  ensureSingle,
  firstOrNull,
} from './db';

export type { SupabaseClient } from './db';

// Default export for simple import
export { db as default } from './db';
