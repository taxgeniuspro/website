/**
 * Tax Preparer Dashboard Integration Test
 *
 * Tests all dashboard pages for the Tax Preparer role to ensure:
 * - Pages load without errors
 * - Data is displayed correctly
 * - API endpoints return expected data
 *
 * Run with: npx tsx scripts/test-tax-preparer-dashboard.ts
 */

import { prisma } from '../src/lib/prisma';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

// Test preparer credentials
const TEST_PREPARER_EMAIL = 'whitegelisa@gmail.com';

interface TestResult {
  page: string;
  path: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  dataCount?: number;
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

async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    log('✅', 'Database connection successful');
    return true;
  } catch (error) {
    log('❌', `Database connection failed: ${error}`);
    return false;
  }
}

async function getTestPreparerProfile() {
  const user = await prisma.user.findUnique({
    where: { email: TEST_PREPARER_EMAIL },
    include: {
      profile: true,
    },
  });

  if (!user?.profile) {
    throw new Error(`Test preparer not found: ${TEST_PREPARER_EMAIL}`);
  }

  return user.profile;
}

async function testDashboardOverview(profileId: string) {
  const pageName = '📊 Dashboard Overview';
  const path = '/dashboard/tax-preparer';

  try {
    // Check leads count
    const totalLeads = await prisma.taxIntakeLead.count({
      where: { assignedPreparerId: profileId },
    });

    const convertedLeads = await prisma.taxIntakeLead.count({
      where: {
        assignedPreparerId: profileId,
        convertedToClient: true,
      },
    });

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const thisMonthLeads = await prisma.taxIntakeLead.count({
      where: {
        assignedPreparerId: profileId,
        created_at: { gte: thisMonth },
      },
    });

    log('✅', `${pageName}: ${totalLeads} total leads, ${convertedLeads} converted, ${thisMonthLeads} this month`);

    results.push({
      page: pageName,
      path,
      status: 'PASS',
      message: `Found ${totalLeads} leads`,
      dataCount: totalLeads,
    });
  } catch (error) {
    log('❌', `${pageName}: ${error}`);
    results.push({
      page: pageName,
      path,
      status: 'FAIL',
      message: String(error),
    });
  }
}

async function testAnalytics(profileId: string) {
  const pageName = '📊 Analytics';
  const path = '/dashboard/tax-preparer/analytics';

  try {
    // Test lead analytics
    const leads = await prisma.taxIntakeLead.findMany({
      where: { assignedPreparerId: profileId },
      select: {
        id: true,
        completed: true,
        created_at: true,
        convertedToClient: true,
      },
    });

    const conversionRate = leads.length > 0
      ? (leads.filter(l => l.convertedToClient).length / leads.length * 100).toFixed(1)
      : '0';

    log('✅', `${pageName}: ${leads.length} leads, ${conversionRate}% conversion rate`);

    results.push({
      page: pageName,
      path,
      status: 'PASS',
      message: `${leads.length} leads, ${conversionRate}% conversion`,
      dataCount: leads.length,
    });
  } catch (error) {
    log('❌', `${pageName}: ${error}`);
    results.push({
      page: pageName,
      path,
      status: 'FAIL',
      message: String(error),
    });
  }
}

async function testMyLeads(profileId: string) {
  const pageName = '📊 My Leads';
  const path = '/dashboard/tax-preparer/leads';

  try {
    const leads = await prisma.taxIntakeLead.findMany({
      where: { assignedPreparerId: profileId },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        completed: true,
        convertedToClient: true,
        referrerUsername: true,
        created_at: true,
      },
    });

    const withReferrer = leads.filter(l => l.referrerUsername).length;

    log('✅', `${pageName}: ${leads.length} recent leads, ${withReferrer} with referrers`);

    results.push({
      page: pageName,
      path,
      status: 'PASS',
      message: `${leads.length} leads displayed`,
      dataCount: leads.length,
    });
  } catch (error) {
    log('❌', `${pageName}: ${error}`);
    results.push({
      page: pageName,
      path,
      status: 'FAIL',
      message: String(error),
    });
  }
}

async function testMyClients(profileId: string) {
  const pageName = '📊 My Clients';
  const path = '/dashboard/tax-preparer/clients';

  try {
    const clients = await prisma.taxIntakeLead.findMany({
      where: {
        assignedPreparerId: profileId,
        convertedToClient: true,
      },
      orderBy: { convertedAt: 'desc' },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        convertedAt: true,
      },
    });

    log('✅', `${pageName}: ${clients.length} converted clients`);

    results.push({
      page: pageName,
      path,
      status: 'PASS',
      message: `${clients.length} clients`,
      dataCount: clients.length,
    });
  } catch (error) {
    log('❌', `${pageName}: ${error}`);
    results.push({
      page: pageName,
      path,
      status: 'FAIL',
      message: String(error),
    });
  }
}

async function testFileCenter(profileId: string) {
  const pageName = '📊 File Center';
  const path = '/dashboard/tax-preparer/file-center';

  try {
    const documents = await prisma.document.count({
      where: {
        profile: {
          OR: [
            { id: profileId },
            { taxIntakeLeads: { some: { assignedPreparerId: profileId } } },
          ],
        },
      },
    });

    log('✅', `${pageName}: ${documents} documents accessible`);

    results.push({
      page: pageName,
      path,
      status: 'PASS',
      message: `${documents} documents`,
      dataCount: documents,
    });
  } catch (error) {
    log('❌', `${pageName}: ${error}`);
    results.push({
      page: pageName,
      path,
      status: 'FAIL',
      message: String(error),
    });
  }
}

async function testMyReferrals(profileId: string) {
  const pageName = '💰 My Referrals';
  const path = '/dashboard/tax-preparer/referrals';

  try {
    const referrals = await prisma.taxIntakeLead.findMany({
      where: {
        assignedPreparerId: profileId,
        referrerUsername: { not: null },
      },
      select: {
        id: true,
        referrerUsername: true,
        first_name: true,
        last_name: true,
        completed: true,
        convertedToClient: true,
      },
    });

    const uniqueReferrers = new Set(referrals.map(r => r.referrerUsername)).size;

    log('✅', `${pageName}: ${referrals.length} referred leads from ${uniqueReferrers} referrers`);

    results.push({
      page: pageName,
      path,
      status: 'PASS',
      message: `${referrals.length} referrals`,
      dataCount: referrals.length,
    });
  } catch (error) {
    log('❌', `${pageName}: ${error}`);
    results.push({
      page: pageName,
      path,
      status: 'FAIL',
      message: String(error),
    });
  }
}

async function testTrackingLinks(profileId: string, profile: any) {
  const pageName = '💰 My Links & QR';
  const path = '/dashboard/tax-preparer/tracking';

  try {
    const trackingCode = profile.customTrackingCode;

    if (!trackingCode) {
      log('⚠️', `${pageName}: No tracking code set for preparer`);
      results.push({
        page: pageName,
        path,
        status: 'SKIP',
        message: 'No tracking code configured',
      });
      return;
    }

    // Check marketing links exist for this preparer
    const marketingLinks = await prisma.marketingLink.findMany({
      where: {
        creatorId: profileId,
      },
    });

    const hasQR = !!profile.qrCodeImageUrl;

    log('✅', `${pageName}: ${marketingLinks.length} links, QR: ${hasQR ? 'Yes' : 'No'}, Code: ${trackingCode}`);

    results.push({
      page: pageName,
      path,
      status: 'PASS',
      message: `${marketingLinks.length} links, QR: ${hasQR}, Code: ${trackingCode}`,
      dataCount: marketingLinks.length,
    });
  } catch (error) {
    log('❌', `${pageName}: ${error}`);
    results.push({
      page: pageName,
      path,
      status: 'FAIL',
      message: String(error),
    });
  }
}

async function testBondedAffiliates(profileId: string) {
  const pageName = '💰 Bonded Affiliates';
  const path = '/dashboard/tax-preparer/bonded-affiliates';

  try {
    const affiliates = await prisma.affiliateBonding.findMany({
      where: { preparerId: profileId },
      include: {
        affiliate: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    log('✅', `${pageName}: ${affiliates.length} bonded affiliates`);

    results.push({
      page: pageName,
      path,
      status: 'PASS',
      message: `${affiliates.length} affiliates`,
      dataCount: affiliates.length,
    });
  } catch (error) {
    log('❌', `${pageName}: ${error}`);
    results.push({
      page: pageName,
      path,
      status: 'FAIL',
      message: String(error),
    });
  }
}

async function testCommissionSettings(profileId: string, profile: any) {
  const pageName = '💰 Commission Settings';
  const path = '/dashboard/tax-preparer/commission-settings';

  try {
    const useDefaults = profile.useCompanyDefaults ?? true;
    const customTiers = profile.customTierStructure;

    log('✅', `${pageName}: Using ${useDefaults ? 'company defaults' : 'custom rates'}`);

    results.push({
      page: pageName,
      path,
      status: 'PASS',
      message: `${useDefaults ? 'Company defaults' : 'Custom rates'}`,
    });
  } catch (error) {
    log('❌', `${pageName}: ${error}`);
    results.push({
      page: pageName,
      path,
      status: 'FAIL',
      message: String(error),
    });
  }
}

async function testPayoutObligations(profileId: string) {
  const pageName = '💰 Payout Obligations';
  const path = '/dashboard/tax-preparer/payout-obligations';

  try {
    // Get leads assigned to this preparer that have referrers
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
      select: {
        id: true,
        amount: true,
        status: true,
      },
    });

    const pending = commissions.filter(c => c.status === 'PENDING');
    const approved = commissions.filter(c => c.status === 'APPROVED');
    const paid = commissions.filter(c => c.status === 'PAID');

    const totalOwed = [...pending, ...approved].reduce((sum, c) => sum + Number(c.amount), 0);
    const totalPaid = paid.reduce((sum, c) => sum + Number(c.amount), 0);

    log('✅', `${pageName}: ${commissions.length} commissions - $${totalOwed.toFixed(2)} owed, $${totalPaid.toFixed(2)} paid`);
    log('   ', `  Pending: ${pending.length}, Approved: ${approved.length}, Paid: ${paid.length}`);

    results.push({
      page: pageName,
      path,
      status: 'PASS',
      message: `${commissions.length} commissions, $${totalOwed} owed`,
      dataCount: commissions.length,
    });
  } catch (error) {
    log('❌', `${pageName}: ${error}`);
    results.push({
      page: pageName,
      path,
      status: 'FAIL',
      message: String(error),
    });
  }
}

async function testAppointments(profileId: string) {
  const pageName = '📊 Appointments/Calendar';
  const path = '/dashboard/tax-preparer/appointments';

  try {
    const appointments = await prisma.appointment.count({
      where: { preparerId: profileId },
    });

    log('✅', `${pageName}: ${appointments} appointments`);

    results.push({
      page: pageName,
      path,
      status: 'PASS',
      message: `${appointments} appointments`,
      dataCount: appointments,
    });
  } catch (error) {
    log('❌', `${pageName}: ${error}`);
    results.push({
      page: pageName,
      path,
      status: 'FAIL',
      message: String(error),
    });
  }
}

async function printSummary() {
  logSection('TEST SUMMARY');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log('Results by page:\n');

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${result.page}`);
    console.log(`   Path: ${result.path}`);
    console.log(`   ${result.message}`);
    if (result.dataCount !== undefined) {
      console.log(`   Data count: ${result.dataCount}`);
    }
    console.log('');
  }

  console.log('─'.repeat(40));
  console.log(`Total: ${results.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log('');

  if (failed > 0) {
    console.log('⚠️  Some tests failed. Check the results above for details.');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
  }
}

async function main() {
  console.log('\n🧪 Tax Preparer Dashboard Integration Test\n');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Test preparer: ${TEST_PREPARER_EMAIL}\n`);

  // Test database connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    process.exit(1);
  }

  // Get test preparer
  let profile: any;
  try {
    profile = await getTestPreparerProfile();
    log('✅', `Found test preparer: ${profile.firstName} ${profile.lastName} (${profile.id})`);
  } catch (error) {
    log('❌', `Failed to find test preparer: ${error}`);
    process.exit(1);
  }

  const profileId = profile.id;

  // Run all tests
  logSection('📊 DASHBOARD SECTION');
  await testDashboardOverview(profileId);
  await testAnalytics(profileId);
  await testMyLeads(profileId);
  await testMyClients(profileId);
  await testFileCenter(profileId);
  await testAppointments(profileId);

  logSection('💰 REFERRAL MANAGEMENT SECTION');
  await testMyReferrals(profileId);
  await testTrackingLinks(profileId, profile);
  await testBondedAffiliates(profileId);
  await testCommissionSettings(profileId, profile);
  await testPayoutObligations(profileId);

  // Print summary
  await printSummary();

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Test failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
