#!/usr/bin/env tsx
/**
 * Funnel Data Reconciliation Script
 *
 * Syncs cached MarketingLink counters with actual Lead/TaxIntakeLead counts.
 *
 * Usage:
 *   npx tsx scripts/reconcile-funnel-data.ts           # Reconcile all active links
 *   npx tsx scripts/reconcile-funnel-data.ts --check   # Check for drift without updating
 *   npx tsx scripts/reconcile-funnel-data.ts --link=LINKID  # Reconcile specific link
 */

import { reconcileFunnelData, checkFunnelDrift } from '../src/lib/services/funnel-reconciliation.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color?: keyof typeof colors): void {
  if (color) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  } else {
    console.log(message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const linkArg = args.find((a) => a.startsWith('--link='));
  const linkId = linkArg?.split('=')[1];

  console.log('\n' + '='.repeat(60));
  log('  Funnel Data Reconciliation', 'bold');
  console.log('='.repeat(60));

  if (checkOnly) {
    log('\nChecking for drifted counters (no updates)...', 'cyan');

    const { hasDrift, driftedLinks } = await checkFunnelDrift();

    if (hasDrift) {
      log(`\nFound ${driftedLinks.length} links with drifted counters:`, 'yellow');
      driftedLinks.forEach((code) => {
        console.log(`  - ${code}`);
      });
      log('\nRun without --check to reconcile.', 'cyan');
    } else {
      log('\nNo drift detected. All counters are in sync.', 'green');
    }
  } else {
    if (linkId) {
      log(`\nReconciling link: ${linkId}...`, 'cyan');
    } else {
      log('\nReconciling all active marketing links...', 'cyan');
    }

    const summary = await reconcileFunnelData(linkId);

    console.log('\n' + '-'.repeat(60));
    console.log('Results:\n');

    // Show updated links
    const updatedResults = summary.results.filter((r) => r.updated);
    if (updatedResults.length > 0) {
      log(`Updated ${updatedResults.length} links:`, 'green');
      updatedResults.forEach((result) => {
        console.log(`\n  ${result.linkCode} (${result.creatorUsername}):`);
        console.log(`    clicks:          ${result.before.clicks} -> ${result.after.clicks}`);
        console.log(`    intakeStarts:    ${result.before.intakeStarts} -> ${result.after.intakeStarts}`);
        console.log(`    intakeCompletes: ${result.before.intakeCompletes} -> ${result.after.intakeCompletes}`);
        console.log(`    returnsFiled:    ${result.before.returnsFiled} -> ${result.after.returnsFiled}`);
      });
    }

    // Summary
    console.log('\n' + '-'.repeat(60));
    console.log(`Total links:   ${summary.totalLinks}`);
    log(`Updated:       ${summary.linksUpdated}`, summary.linksUpdated > 0 ? 'green' : undefined);
    console.log(`Skipped:       ${summary.linksSkipped} (no changes needed)`);

    if (summary.errors.length > 0) {
      log(`\nErrors (${summary.errors.length}):`, 'red');
      summary.errors.forEach((e) => console.log(`  - ${e}`));
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
