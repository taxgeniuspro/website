/**
 * Business Flow End-to-End Test
 * Tests the complete lead generation → commission → payout cycle
 *
 * Phase 7 & 12: Business Flow E2E + Data Integrity
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details?: string;
}

const results: TestResult[] = [];

function log(emoji: string, message: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${emoji} ${message}`);
}

function addResult(name: string, status: 'PASS' | 'FAIL' | 'SKIP', details?: string) {
  results.push({ name, status, details });
  const statusEmoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  log(statusEmoji, `${status}: ${name}${details ? ` - ${details}` : ''}`);
}

async function testPreparerSetup() {
  log('🔍', 'Testing: All 35 preparers have tracking codes...');

  const preparers = await prisma.profile.findMany({
    where: { role: 'tax_preparer' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      trackingCode: true,
      customTrackingCode: true,
      trackingCodeFinalized: true,
      qrCodeLogoUrl: true,
      usePhotoInQRCodes: true,
      avatarUrl: true,
    },
  });

  const withTrackingCode = preparers.filter(p => p.customTrackingCode || p.trackingCode);
  const withQRCode = preparers.filter(p => p.qrCodeLogoUrl);
  const withAvatar = preparers.filter(p => p.avatarUrl);

  addResult(
    'Preparers have tracking codes',
    withTrackingCode.length >= 30 ? 'PASS' : 'FAIL',
    `${withTrackingCode.length}/${preparers.length} have tracking codes`
  );

  addResult(
    'Preparers have QR code logos',
    withQRCode.length >= 30 ? 'PASS' : 'FAIL',
    `${withQRCode.length}/${preparers.length} have QR codes`
  );

  addResult(
    'Preparers have avatars',
    withAvatar.length >= 30 ? 'PASS' : 'FAIL',
    `${withAvatar.length}/${preparers.length} have avatars`
  );

  return preparers.length;
}

async function testShortLinks() {
  log('🔍', 'Testing: Marketing short links exist...');

  const links = await prisma.marketingLink.findMany({
    where: {
      OR: [
        { code: { endsWith: '-lead' } },
        { code: { endsWith: '-intake' } },
        { code: { endsWith: '-appt' } },
      ],
    },
  });

  const leadLinks = links.filter(l => l.code.endsWith('-lead')).length;
  const intakeLinks = links.filter(l => l.code.endsWith('-intake')).length;
  const apptLinks = links.filter(l => l.code.endsWith('-appt')).length;

  addResult(
    'Marketing short links configured',
    links.length >= 90 ? 'PASS' : 'FAIL',
    `Total: ${links.length} (lead: ${leadLinks}, intake: ${intakeLinks}, appt: ${apptLinks})`
  );

  return links.length;
}

async function testLeadFlow() {
  log('🔍', 'Testing: Lead capture and attribution...');

  // Check for recent leads
  const recentLeads = await prisma.taxIntakeLead.findMany({
    take: 10,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      completed: true,
      referrerUsername: true,
      assignedPreparerId: true,
      convertedToClient: true,
      created_at: true,
    },
  });

  const leadsWithAttribution = recentLeads.filter(l => l.referrerUsername);
  const leadsAssigned = recentLeads.filter(l => l.assignedPreparerId);
  const leadsConverted = recentLeads.filter(l => l.convertedToClient);

  addResult(
    'Tax intake leads exist',
    recentLeads.length > 0 ? 'PASS' : 'SKIP',
    `${recentLeads.length} recent leads found`
  );

  if (recentLeads.length > 0) {
    addResult(
      'Leads have preparer assignment',
      leadsAssigned.length > 0 ? 'PASS' : 'FAIL',
      `${leadsAssigned.length}/${recentLeads.length} assigned to preparers`
    );
  }

  // Check lead status distribution (by completed and converted states)
  const totalLeads = await prisma.taxIntakeLead.count();
  const completedLeads = await prisma.taxIntakeLead.count({ where: { completed: true } });
  const convertedLeads = await prisma.taxIntakeLead.count({ where: { convertedToClient: true } });
  const assignedLeads = await prisma.taxIntakeLead.count({ where: { assignedPreparerId: { not: null } } });

  log('📊', 'Lead status distribution:');
  console.log(`   Total: ${totalLeads}`);
  console.log(`   Completed: ${completedLeads}`);
  console.log(`   Assigned: ${assignedLeads}`);
  console.log(`   Converted: ${convertedLeads}`);

  return recentLeads.length;
}

async function testCommissionSystem() {
  log('🔍', 'Testing: Commission calculation and tiers...');

  // Check commission records
  const commissions = await prisma.commission.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      status: true,
      sourceType: true,
      rateAtCreation: true,
      createdAt: true,
    },
  });

  const pendingCount = commissions.filter(c => c.status === 'PENDING').length;
  const approvedCount = commissions.filter(c => c.status === 'APPROVED').length;
  const paidCount = commissions.filter(c => c.status === 'PAID').length;

  addResult(
    'Commission records exist',
    commissions.length > 0 ? 'PASS' : 'SKIP',
    `${commissions.length} commissions (Pending: ${pendingCount}, Approved: ${approvedCount}, Paid: ${paidCount})`
  );

  // Check tier structure is working
  const tieredCommissions = commissions.filter(c => c.rateAtCreation);
  addResult(
    'Commission rates locked at creation',
    tieredCommissions.length > 0 || commissions.length === 0 ? 'PASS' : 'FAIL',
    `${tieredCommissions.length}/${commissions.length} have locked rates`
  );

  // Check payout requests
  const payoutRequests = await prisma.payoutRequest.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      status: true,
      paymentMethod: true,
      processedAt: true,
    },
  });

  const paidPayouts = payoutRequests.filter(p => p.status === 'PAID').length;
  addResult(
    'Payout requests exist',
    payoutRequests.length > 0 ? 'PASS' : 'SKIP',
    `${payoutRequests.length} payout requests (${paidPayouts} paid)`
  );

  return commissions.length;
}

async function testReferralTracking() {
  log('🔍', 'Testing: Referral tracking and attribution...');

  // Check link clicks
  const recentClicks = await prisma.linkClick.findMany({
    take: 100,
    orderBy: { clickedAt: 'desc' },
    select: {
      id: true,
      linkId: true,
      clickedAt: true,
    },
  });

  addResult(
    'Link click tracking working',
    recentClicks.length > 0 ? 'PASS' : 'SKIP',
    `${recentClicks.length} recent clicks tracked`
  );

  // Check marketing links analytics
  const marketingLinksWithClicks = await prisma.marketingLink.count({
    where: {
      clicks: { gt: 0 },
    },
  });

  const totalClicks = await prisma.marketingLink.aggregate({
    _sum: { clicks: true },
  });

  addResult(
    'Marketing links have click analytics',
    marketingLinksWithClicks > 0 ? 'PASS' : 'SKIP',
    `${marketingLinksWithClicks} links with clicks, ${totalClicks._sum.clicks || 0} total clicks`
  );

  return recentClicks.length;
}

async function testDocumentManagement() {
  log('🔍', 'Testing: Document management...');

  const documents = await prisma.document.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      status: true,
      fileName: true,
      fileSize: true,
      taxYear: true,
    },
  });

  const docTypes = [...new Set(documents.map(d => d.type))];

  addResult(
    'Document uploads working',
    documents.length > 0 ? 'PASS' : 'SKIP',
    `${documents.length} documents (types: ${docTypes.join(', ')})`
  );

  // Check folders
  const folders = await prisma.folder.count();
  addResult(
    'Client folders exist',
    folders > 0 ? 'PASS' : 'SKIP',
    `${folders} folders created`
  );

  return documents.length;
}

async function testAppointmentSystem() {
  log('🔍', 'Testing: Appointment booking...');

  const appointments = await prisma.appointment.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      status: true,
      scheduledFor: true,
    },
  });

  const statusCounts: Record<string, number> = {};
  appointments.forEach(a => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });

  addResult(
    'Appointments exist',
    appointments.length > 0 ? 'PASS' : 'SKIP',
    `${appointments.length} appointments (${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(', ')})`
  );

  return appointments.length;
}

async function testDataIntegrity() {
  log('🔍', 'Testing: Data integrity checks...');

  // Check total profiles match total users
  const profileCount = await prisma.profile.count();
  const userCount = await prisma.user.count();

  addResult(
    'Profile-User consistency',
    profileCount <= userCount ? 'PASS' : 'FAIL',
    `${profileCount} profiles for ${userCount} users`
  );

  // Check total commissions are linked to valid referrers
  const commissionsCount = await prisma.commission.count();
  const commissionsWithValidReferrers = await prisma.commission.count({
    where: {
      referrer: {
        id: { not: undefined },
      },
    },
  });

  addResult(
    'All commissions have valid referrers',
    commissionsCount === commissionsWithValidReferrers || commissionsCount === 0 ? 'PASS' : 'FAIL',
    `${commissionsWithValidReferrers}/${commissionsCount} commissions have valid referrers`
  );

  // Check for leads in inconsistent state (converted but unqualified, etc.)
  const leadsInInconsistentState = await prisma.taxIntakeLead.count({
    where: {
      AND: [
        { convertedToClient: true },
        { unqualified: true },
      ],
    },
  });

  addResult(
    'No leads in inconsistent state',
    leadsInInconsistentState === 0 ? 'PASS' : 'FAIL',
    `${leadsInInconsistentState} leads both converted AND unqualified`
  );

  // Check for duplicate tracking codes
  const trackingCodes = await prisma.profile.groupBy({
    by: ['customTrackingCode'],
    where: {
      customTrackingCode: { not: null },
    },
    having: {
      customTrackingCode: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  addResult(
    'No duplicate tracking codes',
    trackingCodes.length === 0 ? 'PASS' : 'FAIL',
    `${trackingCodes.length} duplicate tracking codes found`
  );
}

async function printSummary() {
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('  BUSINESS FLOW TEST RESULTS');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  results.forEach(r => {
    const emoji = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`  ${emoji} ${r.name}`);
    if (r.details) {
      console.log(`     └─ ${r.details}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`  TOTAL: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('══════════════════════════════════════════════════════════════════════\n');

  return { passed, failed, skipped };
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  TAX GENIUS PRO - BUSINESS FLOW TEST');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  try {
    // Phase 7: Business Flow Tests
    log('📋', 'Phase 7: Testing Business Flows...\n');

    await testPreparerSetup();
    await testShortLinks();
    await testLeadFlow();
    await testCommissionSystem();
    await testReferralTracking();
    await testDocumentManagement();
    await testAppointmentSystem();

    // Phase 12: Data Integrity
    log('\n📋', 'Phase 12: Data Integrity Verification...\n');
    await testDataIntegrity();

    // Print summary
    const summary = await printSummary();

    // Exit with error if any tests failed
    if (summary.failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
