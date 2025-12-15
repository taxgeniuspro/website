/**
 * Fresh Start Reset Script
 *
 * Resets Tax Genius Pro to a clean state for a new client.
 * This script is more aggressive than reset-data.ts - it also removes
 * all client user accounts, leaving only admin and tax preparer users.
 *
 * PRESERVES:
 * - Users with role 'admin' or 'tax_preparer'
 * - Profiles for admin/tax_preparer users (avatars, QR codes, tracking codes)
 * - MarketingLinks (105 preparer short links)
 * - BookingServices, PreparerAvailability
 * - SystemSettings, Products, AffiliateGroups
 *
 * DELETES:
 * - All transactional data (leads, appointments, commissions, etc.)
 * - Client user accounts (role = 'client')
 * - Referrals, ClientPreparer, AffiliateBonding relationships
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CountResult {
  model: string;
  count: number;
  preserve: boolean;
}

async function resetForNewClient() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         FRESH START RESET - Tax Genius Pro                 ║');
  console.log('║  Preparing system for new client (admin + preparers only)  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 0: Verify critical data exists before proceeding
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('🔍 PHASE 0: Verifying critical data...\n');

  const adminCount = await prisma.profile.count({ where: { role: 'admin' } });
  const preparerCount = await prisma.profile.count({ where: { role: 'tax_preparer' } });
  const marketingLinkCount = await prisma.marketingLink.count();

  console.log(`  ✓ Admin users: ${adminCount}`);
  console.log(`  ✓ Tax preparers: ${preparerCount}`);
  console.log(`  ✓ Marketing links: ${marketingLinkCount}`);

  if (adminCount === 0) {
    console.error('\n❌ ERROR: No admin users found! Aborting reset.');
    process.exit(1);
  }

  if (preparerCount < 30) {
    console.warn(`\n⚠️  WARNING: Only ${preparerCount} tax preparers found (expected ~35).`);
    const proceed = true; // In a real scenario, might want to prompt
    if (!proceed) process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Show current counts before deletion
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📊 Current Data Counts:\n');

  const counts: CountResult[] = await Promise.all([
    prisma.user.count().then(c => ({ model: 'User', count: c, preserve: false })),
    prisma.profile.count().then(c => ({ model: 'Profile', count: c, preserve: false })),
    prisma.profile.count({ where: { role: 'admin' } }).then(c => ({ model: '  └─ admin', count: c, preserve: true })),
    prisma.profile.count({ where: { role: 'tax_preparer' } }).then(c => ({ model: '  └─ tax_preparer', count: c, preserve: true })),
    prisma.profile.count({ where: { role: 'client' } }).then(c => ({ model: '  └─ client', count: c, preserve: false })),
    prisma.marketingLink.count().then(c => ({ model: 'MarketingLink', count: c, preserve: true })),
    prisma.lead.count().then(c => ({ model: 'Lead', count: c, preserve: false })),
    prisma.taxIntakeLead.count().then(c => ({ model: 'TaxIntakeLead', count: c, preserve: false })),
    prisma.cRMContact.count().then(c => ({ model: 'CRMContact', count: c, preserve: false })),
    prisma.appointment.count().then(c => ({ model: 'Appointment', count: c, preserve: false })),
    prisma.order.count().then(c => ({ model: 'Order', count: c, preserve: false })),
    prisma.commission.count().then(c => ({ model: 'Commission', count: c, preserve: false })),
    prisma.document.count().then(c => ({ model: 'Document', count: c, preserve: false })),
    prisma.referral.count().then(c => ({ model: 'Referral', count: c, preserve: false })),
  ]);

  for (const { model, count, preserve } of counts) {
    const status = preserve ? '✅ KEEP' : '🗑️  DELETE';
    console.log(`  ${status} ${model}: ${count}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🚀 Starting deletion (respecting FK constraints)...');
  console.log('═'.repeat(60) + '\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: Leaf Tables (no dependents)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📦 TIER 1: Deleting leaf tables...\n');

  // CRM Leaf Tables
  console.log('  Deleting CRM leaf data...');
  await prisma.cRMLeadScore.deleteMany({});
  await prisma.cRMEmailActivity.deleteMany({});
  await prisma.cRMStageHistory.deleteMany({});
  await prisma.cRMTask.deleteMany({});
  await prisma.cRMContactTag.deleteMany({});
  await prisma.cRMInteraction.deleteMany({});
  await prisma.cRMWorkflowExecution.deleteMany({});
  console.log('    ✓ CRM leaf data deleted');

  // Lead Leaf Tables
  console.log('  Deleting Lead leaf data...');
  await prisma.leadActivity.deleteMany({});
  await prisma.leadTask.deleteMany({});
  console.log('    ✓ Lead leaf data deleted');

  // Support Leaf Tables
  console.log('  Deleting Support leaf data...');
  await prisma.ticketWorkflowLog.deleteMany({});
  await prisma.ticketTimeEntry.deleteMany({});
  await prisma.ticketMessage.deleteMany({});
  console.log('    ✓ Support leaf data deleted');

  // Analytics Leaf Tables
  console.log('  Deleting Analytics leaf data...');
  await prisma.linkClick.deleteMany({});
  await prisma.mobileHubLinkClick.deleteMany({});
  await prisma.mobileHubShare.deleteMany({});
  await prisma.mobileHubStats.deleteMany({});
  await prisma.pageAnalytics.deleteMany({});
  await prisma.contentPerformance.deleteMany({});
  await prisma.referralAnalytics.deleteMany({});
  console.log('    ✓ Analytics leaf data deleted');

  // Form Leaf Tables
  console.log('  Deleting Form leaf data...');
  await prisma.formSignature.deleteMany({});
  await prisma.taxFormEdit.deleteMany({});
  console.log('    ✓ Form leaf data deleted');

  // General Leaf Tables
  console.log('  Deleting general leaf data...');
  await prisma.fileOperation.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.accessAttemptLog.deleteMany({});
  console.log('    ✓ General leaf data deleted');

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: Intermediate Tables
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📦 TIER 2: Deleting intermediate tables...\n');

  console.log('  Deleting CRM intermediate data...');
  await prisma.cRMWorkflowAction.deleteMany({});
  await prisma.cRMEmailSequence.deleteMany({});
  console.log('    ✓ CRM intermediate data deleted');

  console.log('  Deleting Financial intermediate data...');
  await prisma.commission.deleteMany({});
  await prisma.payment.deleteMany({});
  console.log('    ✓ Financial intermediate data deleted');

  console.log('  Deleting Tax Form intermediate data...');
  await prisma.clientTaxForm.deleteMany({});
  await prisma.taxFormShare.deleteMany({});
  console.log('    ✓ Tax Form intermediate data deleted');

  console.log('  Deleting Document intermediate data...');
  await prisma.document.deleteMany({});
  console.log('    ✓ Document intermediate data deleted');

  console.log('  Deleting Chat intermediate data...');
  await prisma.chatMessage.deleteMany({});
  await prisma.chatParticipant.deleteMany({});
  console.log('    ✓ Chat intermediate data deleted');

  console.log('  Deleting other intermediate data...');
  await prisma.folderUploadLink.deleteMany({});
  await prisma.followUpLog.deleteMany({});
  console.log('    ✓ Other intermediate data deleted');

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: Parent Tables
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📦 TIER 3: Deleting parent tables...\n');

  console.log('  Deleting CRM parent data...');
  await prisma.cRMContact.deleteMany({});
  await prisma.cRMWorkflow.deleteMany({});
  await prisma.cRMEmailCampaign.deleteMany({});
  await prisma.cRMTag.deleteMany({});
  console.log('    ✓ CRM parent data deleted');

  console.log('  Deleting Lead parent data...');
  await prisma.taxIntakeLead.deleteMany({});
  await prisma.lead.deleteMany({});
  console.log('    ✓ Lead parent data deleted');

  console.log('  Deleting Support parent data...');
  await prisma.supportTicket.deleteMany({});
  await prisma.ticketWorkflow.deleteMany({});
  console.log('    ✓ Support parent data deleted');

  console.log('  Deleting Appointment data...');
  await prisma.appointment.deleteMany({});
  console.log('    ✓ Appointment data deleted');

  console.log('  Deleting Tax Return data...');
  await prisma.taxReturn.deleteMany({});
  console.log('    ✓ Tax Return data deleted');

  console.log('  Deleting Folder data (recursive)...');
  // Delete folders in batches to handle self-referential hierarchy
  let deletedFolders = 1;
  while (deletedFolders > 0) {
    // Delete leaf folders first (those with no children)
    const result = await prisma.folder.deleteMany({
      where: {
        children: {
          none: {},
        },
      },
    });
    deletedFolders = result.count;
  }
  console.log('    ✓ Folder data deleted');

  console.log('  Deleting Chat Room data...');
  await prisma.chatRoom.deleteMany({});
  console.log('    ✓ Chat Room data deleted');

  console.log('  Deleting Order data...');
  await prisma.order.deleteMany({});
  console.log('    ✓ Order data deleted');

  console.log('  Deleting Referral data...');
  await prisma.referral.deleteMany({});
  console.log('    ✓ Referral data deleted');

  console.log('  Deleting Payout Request data...');
  await prisma.payoutRequest.deleteMany({});
  console.log('    ✓ Payout Request data deleted');

  console.log('  Deleting AI Assistant data...');
  await prisma.taxAssistantMessage.deleteMany({});
  await prisma.taxAssistantThread.deleteMany({});
  console.log('    ✓ AI Assistant data deleted');

  console.log('  Deleting Client Intake data...');
  await prisma.clientIntake.deleteMany({});
  console.log('    ✓ Client Intake data deleted');

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4: User Cleanup - Remove client users
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📦 TIER 4: Cleaning up client users...\n');

  console.log('  Deleting ClientPreparer relationships...');
  await prisma.clientPreparer.deleteMany({});
  console.log('    ✓ ClientPreparer relationships deleted');

  console.log('  Deleting AffiliateBonding relationships...');
  await prisma.affiliateBonding.deleteMany({});
  console.log('    ✓ AffiliateBonding relationships deleted');

  // Get client profile IDs before deletion
  const clientProfiles = await prisma.profile.findMany({
    where: { role: 'client' },
    select: { id: true, userId: true },
  });
  console.log(`  Found ${clientProfiles.length} client profiles to delete...`);

  // Delete client profiles
  console.log('  Deleting client Profiles...');
  await prisma.profile.deleteMany({
    where: { role: 'client' },
  });
  console.log('    ✓ Client profiles deleted');

  // Delete orphaned users (users without profiles)
  console.log('  Deleting orphaned User accounts...');
  const userIdsToKeep = await prisma.profile.findMany({
    select: { userId: true },
  });
  const userIdsToKeepSet = new Set(userIdsToKeep.map(p => p.userId));

  const orphanedUsers = await prisma.user.findMany({
    where: {
      id: {
        notIn: Array.from(userIdsToKeepSet),
      },
    },
    select: { id: true, email: true },
  });

  if (orphanedUsers.length > 0) {
    console.log(`    Found ${orphanedUsers.length} orphaned users to delete`);

    // Delete associated accounts and sessions first
    await prisma.account.deleteMany({
      where: { userId: { in: orphanedUsers.map(u => u.id) } },
    });
    await prisma.session.deleteMany({
      where: { userId: { in: orphanedUsers.map(u => u.id) } },
    });
    await prisma.magicLink.deleteMany({
      where: { userId: { in: orphanedUsers.map(u => u.id) } },
    });

    // Now delete the orphaned users
    await prisma.user.deleteMany({
      where: { id: { in: orphanedUsers.map(u => u.id) } },
    });
    console.log('    ✓ Orphaned users deleted');
  } else {
    console.log('    ✓ No orphaned users found');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: Verification
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('📊 VERIFICATION: Final Data Counts');
  console.log('═'.repeat(60) + '\n');

  const finalCounts = await Promise.all([
    prisma.user.count().then(c => ({ model: 'User', count: c })),
    prisma.profile.count().then(c => ({ model: 'Profile', count: c })),
    prisma.profile.count({ where: { role: 'admin' } }).then(c => ({ model: '  └─ admin', count: c })),
    prisma.profile.count({ where: { role: 'tax_preparer' } }).then(c => ({ model: '  └─ tax_preparer', count: c })),
    prisma.profile.count({ where: { role: 'client' } }).then(c => ({ model: '  └─ client', count: c })),
    prisma.marketingLink.count().then(c => ({ model: 'MarketingLink', count: c })),
    prisma.lead.count().then(c => ({ model: 'Lead', count: c })),
    prisma.taxIntakeLead.count().then(c => ({ model: 'TaxIntakeLead', count: c })),
    prisma.appointment.count().then(c => ({ model: 'Appointment', count: c })),
    prisma.commission.count().then(c => ({ model: 'Commission', count: c })),
    prisma.order.count().then(c => ({ model: 'Order', count: c })),
    prisma.referral.count().then(c => ({ model: 'Referral', count: c })),
  ]);

  let allClean = true;
  for (const { model, count } of finalCounts) {
    const isPreserved = ['User', 'Profile', '  └─ admin', '  └─ tax_preparer', 'MarketingLink'].includes(model);
    if (isPreserved) {
      console.log(`  ✅ ${model}: ${count}`);
    } else if (count === 0) {
      console.log(`  ✅ ${model}: ${count} (cleared)`);
    } else {
      console.log(`  ⚠️  ${model}: ${count} (should be 0)`);
      allClean = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  if (allClean) {
    console.log('✅ FRESH START RESET COMPLETE!');
  } else {
    console.log('⚠️  RESET COMPLETE WITH WARNINGS');
  }
  console.log('═'.repeat(60) + '\n');

  console.log('PRESERVED:');
  console.log(`  ✓ ${finalCounts.find(c => c.model === '  └─ admin')?.count || 0} admin user(s)`);
  console.log(`  ✓ ${finalCounts.find(c => c.model === '  └─ tax_preparer')?.count || 0} tax preparer(s)`);
  console.log(`  ✓ ${finalCounts.find(c => c.model === 'MarketingLink')?.count || 0} marketing link(s)`);
  console.log('  ✓ All preparer settings (avatars, QR codes, tracking codes)');
  console.log('  ✓ BookingServices & PreparerAvailability');
  console.log('  ✓ SystemSettings & Products');

  console.log('\nDELETED:');
  console.log(`  ✓ ${clientProfiles.length} client account(s)`);
  console.log('  ✓ All leads, appointments, commissions');
  console.log('  ✓ All documents, folders, tax returns');
  console.log('  ✓ All support tickets, chat messages');
  console.log('  ✓ All analytics data, notifications');

  console.log('\n🎉 System is ready for testing!\n');
}

resetForNewClient()
  .catch((error) => {
    console.error('\n❌ Error during reset:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
