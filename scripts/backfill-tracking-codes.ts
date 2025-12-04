/**
 * Backfill Script: Assign tracking codes to existing users
 *
 * Run this script once to populate tracking codes for all existing users.
 *
 * Usage: npx tsx scripts/backfill-tracking-codes.ts
 */

import { backfillTrackingCodes } from '../src/lib/services/tracking-code.service'

async function main() {
  console.log('🚀 Starting tracking code backfill...\n')

  try {
    const result = await backfillTrackingCodes('https://taxgeniuspro.tax')

    console.log('\n✅ Backfill complete!')
    console.log(`   - Updated: ${result.updated} profiles`)
    console.log(`   - Errors: ${result.errors} profiles`)

    if (result.errors > 0) {
      console.log('\n⚠️  Some profiles failed to update. Check the error logs above.')
      process.exit(1)
    }

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Backfill failed:', error)
    process.exit(1)
  }
}

main()
