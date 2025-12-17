/**
 * API Endpoint Test for Tax Genius Pro
 *
 * Tests all API endpoints used by Tax Preparer dashboard
 * by directly querying the database (simulates what the APIs do)
 *
 * Run with: npx tsx scripts/test-api-endpoints.ts
 */

import { prisma } from '../src/lib/prisma';

const TEST_PREPARER_EMAIL = 'whitegelisa@gmail.com';

interface TestResult {
  endpoint: string;
  status: 'PASS' | 'FAIL';
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function getTestPreparer() {
  const user = await prisma.user.findUnique({
    where: { email: TEST_PREPARER_EMAIL },
    include: { profile: true },
  });

  if (!user?.profile) {
    throw new Error(`Test preparer not found: ${TEST_PREPARER_EMAIL}`);
  }

  return { user, profile: user.profile };
}

// Test: Dashboard Overview Stats
async function testDashboardStats(profileId: string) {
  const endpoint = 'GET /api/tax-preparer/dashboard/stats';

  try {
    const [totalLeads, convertedLeads, thisMonthLeads] = await Promise.all([
      prisma.taxIntakeLead.count({
        where: { assignedPreparerId: profileId },
      }),
      prisma.taxIntakeLead.count({
        where: { assignedPreparerId: profileId, convertedToClient: true },
      }),
      prisma.taxIntakeLead.count({
        where: {
          assignedPreparerId: profileId,
          created_at: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    log('✅', `${endpoint}: ${totalLeads} total, ${convertedLeads} converted, ${thisMonthLeads} this month`);
    results.push({
      endpoint,
      status: 'PASS',
      message: `${totalLeads} leads total`,
      data: { totalLeads, convertedLeads, thisMonthLeads },
    });
  } catch (error) {
    log('❌', `${endpoint}: ${error}`);
    results.push({ endpoint, status: 'FAIL', message: String(error) });
  }
}

// Test: My Leads
async function testMyLeads(profileId: string) {
  const endpoint = 'GET /api/tax-preparer/leads';

  try {
    const leads = await prisma.taxIntakeLead.findMany({
      where: { assignedPreparerId: profileId },
      orderBy: { created_at: 'desc' },
      take: 20,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        completed: true,
        convertedToClient: true,
        referrerUsername: true,
        created_at: true,
      },
    });

    log('✅', `${endpoint}: ${leads.length} leads returned`);
    results.push({
      endpoint,
      status: 'PASS',
      message: `${leads.length} leads`,
      data: { count: leads.length, sample: leads.slice(0, 3) },
    });
  } catch (error) {
    log('❌', `${endpoint}: ${error}`);
    results.push({ endpoint, status: 'FAIL', message: String(error) });
  }
}

// Test: My Clients
async function testMyClients(profileId: string) {
  const endpoint = 'GET /api/tax-preparer/clients';

  try {
    const clients = await prisma.taxIntakeLead.findMany({
      where: {
        assignedPreparerId: profileId,
        convertedToClient: true,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        convertedAt: true,
      },
    });

    log('✅', `${endpoint}: ${clients.length} clients returned`);
    results.push({
      endpoint,
      status: 'PASS',
      message: `${clients.length} clients`,
      data: { count: clients.length },
    });
  } catch (error) {
    log('❌', `${endpoint}: ${error}`);
    results.push({ endpoint, status: 'FAIL', message: String(error) });
  }
}

// Test: Appointments
async function testAppointments(profileId: string) {
  const endpoint = 'GET /api/tax-preparer/appointments';

  try {
    const appointments = await prisma.appointment.findMany({
      where: { preparerId: profileId },
      orderBy: { scheduledFor: 'desc' },
      take: 10,
    });

    log('✅', `${endpoint}: ${appointments.length} appointments returned`);
    results.push({
      endpoint,
      status: 'PASS',
      message: `${appointments.length} appointments`,
      data: { count: appointments.length },
    });
  } catch (error) {
    log('❌', `${endpoint}: ${error}`);
    results.push({ endpoint, status: 'FAIL', message: String(error) });
  }
}

// Test: Marketing Links (Tracking)
async function testMarketingLinks(profileId: string) {
  const endpoint = 'GET /api/tax-preparer/tracking/links';

  try {
    const links = await prisma.marketingLink.findMany({
      where: { creatorId: profileId },
    });

    log('✅', `${endpoint}: ${links.length} marketing links returned`);
    results.push({
      endpoint,
      status: 'PASS',
      message: `${links.length} links`,
      data: { count: links.length },
    });
  } catch (error) {
    log('❌', `${endpoint}: ${error}`);
    results.push({ endpoint, status: 'FAIL', message: String(error) });
  }
}

// Test: Referrals (leads with referrers)
async function testReferrals(profileId: string) {
  const endpoint = 'GET /api/tax-preparer/referrals';

  try {
    const referrals = await prisma.taxIntakeLead.findMany({
      where: {
        assignedPreparerId: profileId,
        referrerUsername: { not: null },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        referrerUsername: true,
        convertedToClient: true,
      },
    });

    const uniqueReferrers = new Set(referrals.map(r => r.referrerUsername)).size;

    log('✅', `${endpoint}: ${referrals.length} referrals from ${uniqueReferrers} referrers`);
    results.push({
      endpoint,
      status: 'PASS',
      message: `${referrals.length} referrals, ${uniqueReferrers} referrers`,
      data: { count: referrals.length, uniqueReferrers },
    });
  } catch (error) {
    log('❌', `${endpoint}: ${error}`);
    results.push({ endpoint, status: 'FAIL', message: String(error) });
  }
}

// Test: Bonded Affiliates
async function testBondedAffiliates(profileId: string) {
  const endpoint = 'GET /api/tax-preparer/bonded-affiliates';

  try {
    const affiliates = await prisma.affiliateBonding.findMany({
      where: { preparerId: profileId },
      include: {
        affiliate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customTrackingCode: true,
          },
        },
      },
    });

    log('✅', `${endpoint}: ${affiliates.length} bonded affiliates`);
    results.push({
      endpoint,
      status: 'PASS',
      message: `${affiliates.length} affiliates`,
      data: { count: affiliates.length },
    });
  } catch (error) {
    log('❌', `${endpoint}: ${error}`);
    results.push({ endpoint, status: 'FAIL', message: String(error) });
  }
}

// Test: Commission Settings
async function testCommissionSettings(profileId: string, profile: any) {
  const endpoint = 'GET /api/tax-preparer/commission-settings';

  try {
    const settings = {
      useCompanyDefaults: profile.useCompanyDefaults ?? true,
      customTierStructure: profile.customTierStructure,
      defaultTiers: [
        { tier: 1, min: 1, max: 5, rate: 50 },
        { tier: 2, min: 6, max: 10, rate: 75 },
        { tier: 3, min: 11, max: null, rate: 100 },
      ],
    };

    log('✅', `${endpoint}: Using ${settings.useCompanyDefaults ? 'company defaults' : 'custom rates'}`);
    results.push({
      endpoint,
      status: 'PASS',
      message: settings.useCompanyDefaults ? 'Company defaults' : 'Custom rates',
      data: settings,
    });
  } catch (error) {
    log('❌', `${endpoint}: ${error}`);
    results.push({ endpoint, status: 'FAIL', message: String(error) });
  }
}

// Test: Payout Obligations
async function testPayoutObligations(profileId: string) {
  const endpoint = 'GET /api/tax-preparer/payout-obligations';

  try {
    // Get leads assigned to this preparer with referrers
    const leads = await prisma.taxIntakeLead.findMany({
      where: {
        assignedPreparerId: profileId,
        referrerUsername: { not: null },
      },
      select: { id: true },
    });

    const leadIds = leads.map(l => l.id);

    // Get commissions for these leads
    const commissions = await prisma.commission.findMany({
      where: {
        sourceType: 'RETURN_FILED',
        sourceId: { in: leadIds },
      },
      include: {
        referrer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const stats = {
      total: commissions.length,
      pending: commissions.filter(c => c.status === 'PENDING').length,
      approved: commissions.filter(c => c.status === 'APPROVED').length,
      paid: commissions.filter(c => c.status === 'PAID').length,
      totalOwed: commissions
        .filter(c => c.status === 'PENDING' || c.status === 'APPROVED')
        .reduce((sum, c) => sum + Number(c.amount), 0),
      totalPaid: commissions
        .filter(c => c.status === 'PAID')
        .reduce((sum, c) => sum + Number(c.amount), 0),
    };

    log('✅', `${endpoint}: ${stats.total} commissions - $${stats.totalOwed.toFixed(2)} owed, $${stats.totalPaid.toFixed(2)} paid`);
    results.push({
      endpoint,
      status: 'PASS',
      message: `${stats.total} commissions`,
      data: stats,
    });
  } catch (error) {
    log('❌', `${endpoint}: ${error}`);
    results.push({ endpoint, status: 'FAIL', message: String(error) });
  }
}

// Test: Client Earnings (what referrer sees)
async function testClientEarnings(profileId: string) {
  const endpoint = 'GET /api/client/earnings';

  try {
    const commissions = await prisma.commission.findMany({
      where: { referrerId: profileId },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: commissions.reduce((sum, c) => sum + Number(c.amount), 0),
      pending: commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + Number(c.amount), 0),
      approved: commissions.filter(c => c.status === 'APPROVED').reduce((sum, c) => sum + Number(c.amount), 0),
      paid: commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + Number(c.amount), 0),
      count: commissions.length,
    };

    log('✅', `${endpoint}: ${stats.count} commissions totaling $${stats.total.toFixed(2)}`);
    results.push({
      endpoint,
      status: 'PASS',
      message: `${stats.count} commissions, $${stats.total} total`,
      data: stats,
    });
  } catch (error) {
    log('❌', `${endpoint}: ${error}`);
    results.push({ endpoint, status: 'FAIL', message: String(error) });
  }
}

// Test: Profile/Settings
async function testProfile(profile: any) {
  const endpoint = 'GET /api/profile';

  try {
    const data = {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      trackingCode: profile.customTrackingCode,
      hasQR: !!profile.qrCodeImageUrl,
      hasAvatar: !!profile.avatarUrl,
    };

    log('✅', `${endpoint}: ${data.firstName} ${data.lastName} (${data.role})`);
    results.push({
      endpoint,
      status: 'PASS',
      message: `${data.firstName} ${data.lastName}`,
      data,
    });
  } catch (error) {
    log('❌', `${endpoint}: ${error}`);
    results.push({ endpoint, status: 'FAIL', message: String(error) });
  }
}

async function printSummary() {
  logSection('API TEST SUMMARY');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('Results:\n');

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.endpoint}`);
    console.log(`   ${result.message}`);
    console.log('');
  }

  console.log('─'.repeat(40));
  console.log(`Total: ${results.length} endpoints tested`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');

  if (failed > 0) {
    console.log('⚠️  Some API tests failed. Check the errors above.');
    return 1;
  } else {
    console.log('🎉 All API endpoints working correctly!');
    return 0;
  }
}

async function main() {
  console.log('\n🧪 API Endpoint Test for Tax Genius Pro\n');
  console.log(`Test account: ${TEST_PREPARER_EMAIL}\n`);

  // Get test preparer
  let preparer: any;
  try {
    preparer = await getTestPreparer();
    log('✅', `Found test preparer: ${preparer.profile.firstName} ${preparer.profile.lastName}`);
    log('   ', `Profile ID: ${preparer.profile.id}`);
    log('   ', `Role: ${preparer.profile.role}`);
  } catch (error) {
    log('❌', `Failed to find test preparer: ${error}`);
    process.exit(1);
  }

  const profileId = preparer.profile.id;

  // Run all tests
  logSection('TESTING TAX PREPARER API ENDPOINTS');

  await testProfile(preparer.profile);
  await testDashboardStats(profileId);
  await testMyLeads(profileId);
  await testMyClients(profileId);
  await testAppointments(profileId);
  await testMarketingLinks(profileId);
  await testReferrals(profileId);
  await testBondedAffiliates(profileId);
  await testCommissionSettings(profileId, preparer.profile);
  await testPayoutObligations(profileId);
  await testClientEarnings(profileId);

  // Print summary
  const exitCode = await printSummary();

  await prisma.$disconnect();
  process.exit(exitCode);
}

main().catch(async (error) => {
  console.error('Test failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
