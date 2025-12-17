/**
 * Test Create Commission Flow
 *
 * This script tests the complete commission creation flow:
 * 1. Find a lead with a referrer
 * 2. Simulate marking it as complete
 * 3. Create a commission with APPROVED status
 * 4. Verify it appears in payout obligations
 * 5. Mark it as PAID
 * 6. Verify the referrer can see it
 *
 * Run with: npx tsx scripts/test-create-commission.ts
 */

import { prisma } from '../src/lib/prisma';
import { PaymentStatus } from '@prisma/client';

const TEST_PREPARER_EMAIL = 'whitegelisa@gmail.com';

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('\n🧪 Test Commission Creation Flow\n');

  // Step 1: Get test preparer
  logSection('STEP 1: Get Test Preparer');
  const preparer = await prisma.user.findUnique({
    where: { email: TEST_PREPARER_EMAIL },
    include: { profile: true },
  });

  if (!preparer?.profile) {
    log('❌', `Test preparer not found: ${TEST_PREPARER_EMAIL}`);
    process.exit(1);
  }

  log('✅', `Found preparer: ${preparer.profile.firstName} ${preparer.profile.lastName}`);
  const preparerProfileId = preparer.profile.id;

  // Step 2: Find or create a test lead with referrer
  logSection('STEP 2: Find Lead with Referrer');
  let lead = await prisma.taxIntakeLead.findFirst({
    where: {
      assignedPreparerId: preparerProfileId,
      referrerUsername: { not: null },
      convertedToClient: false, // Not yet completed
    },
  });

  if (!lead) {
    log('ℹ️', 'No unconverted lead with referrer found. Creating one...');

    // Find a profile to use as referrer
    const referrer = await prisma.profile.findFirst({
      where: {
        customTrackingCode: { not: null },
        id: { not: preparerProfileId }, // Not the preparer themselves
      },
    });

    if (!referrer) {
      log('❌', 'No suitable referrer found');
      process.exit(1);
    }

    lead = await prisma.taxIntakeLead.create({
      data: {
        first_name: 'Test',
        last_name: `Commission${Date.now()}`,
        email: `test-commission-${Date.now()}@test.com`,
        phone: '555-TEST',
        tax_year: 2024,
        assignedPreparerId: preparerProfileId,
        referrerUsername: referrer.customTrackingCode!,
        referrerType: 'CLIENT',
        attributionMethod: 'direct',
        completed: true,
      },
    });

    log('✅', `Created test lead: ${lead.first_name} ${lead.last_name}`);
    log('   ', `Referrer: ${referrer.customTrackingCode} (${referrer.firstName} ${referrer.lastName})`);
  } else {
    log('✅', `Found lead: ${lead.first_name} ${lead.last_name}`);
    log('   ', `Referrer: ${lead.referrerUsername}`);
  }

  // Step 3: Find the referrer profile
  logSection('STEP 3: Find Referrer Profile');
  const referrerProfile = await prisma.profile.findFirst({
    where: { customTrackingCode: lead.referrerUsername! },
  });

  if (!referrerProfile) {
    log('❌', `Referrer profile not found for code: ${lead.referrerUsername}`);
    process.exit(1);
  }

  log('✅', `Found referrer: ${referrerProfile.firstName} ${referrerProfile.lastName}`);

  // Step 4: Check for existing commission
  logSection('STEP 4: Check Existing Commission');
  const existingCommission = await prisma.commission.findFirst({
    where: {
      sourceType: 'RETURN_FILED',
      sourceId: lead.id,
    },
  });

  if (existingCommission) {
    log('ℹ️', `Commission already exists for this lead`);
    log('   ', `Amount: $${Number(existingCommission.amount).toFixed(2)}`);
    log('   ', `Status: ${existingCommission.status}`);

    // If not paid, mark it as paid for testing
    if (existingCommission.status !== 'PAID') {
      log('', '');
      log('🔄', 'Marking commission as PAID for testing...');

      await prisma.commission.update({
        where: { id: existingCommission.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          paymentMethod: 'TEST_PAYMENT',
        },
      });

      log('✅', 'Commission marked as PAID');
    }
  } else {
    // Step 5: Create new commission (simulating mark complete)
    logSection('STEP 5: Create Commission');

    // Count existing completed referrals for tier calculation
    const completedCount = await prisma.commission.count({
      where: {
        referrerId: referrerProfile.id,
        sourceType: 'RETURN_FILED',
        status: { in: [PaymentStatus.APPROVED, PaymentStatus.PAID] },
      },
    });

    const referralNumber = completedCount + 1;
    let tier = 'Tier 1';
    let rate = 50;
    if (referralNumber > 10) {
      tier = 'Tier 3';
      rate = 100;
    } else if (referralNumber > 5) {
      tier = 'Tier 2';
      rate = 75;
    }

    log('📊', `This is referral #${referralNumber} → ${tier} ($${rate})`);

    const commission = await prisma.commission.create({
      data: {
        referrerId: referrerProfile.id,
        amount: rate,
        sourceType: 'RETURN_FILED',
        sourceId: lead.id,
        clientName: `${lead.first_name} ${lead.last_name}`,
        clientEmail: lead.email,
        commissionType: 'FLAT',
        commissionRate: rate,
        rateSource: tier,
        status: PaymentStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    log('✅', `Commission created!`);
    log('   ', `ID: ${commission.id}`);
    log('   ', `Amount: $${rate}`);
    log('   ', `Status: APPROVED (ready for payout)`);

    // Mark lead as converted
    await prisma.taxIntakeLead.update({
      where: { id: lead.id },
      data: {
        convertedToClient: true,
        convertedAt: new Date(),
      },
    });

    log('✅', 'Lead marked as converted');
  }

  // Step 6: Verify payout obligations
  logSection('STEP 6: Verify Payout Obligations');

  const payoutObligations = await prisma.commission.findMany({
    where: {
      sourceType: 'RETURN_FILED',
      sourceId: { in: [lead.id] },
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

  log('📊', `Payout obligations for this lead:`);
  for (const commission of payoutObligations) {
    log('   ', `- $${Number(commission.amount).toFixed(2)} to ${commission.referrer?.firstName} ${commission.referrer?.lastName}`);
    log('   ', `  Status: ${commission.status}`);
    if (commission.paidAt) {
      log('   ', `  Paid: ${commission.paidAt.toISOString()} via ${commission.paymentMethod}`);
    }
  }

  // Step 7: Summary
  logSection('FINAL SUMMARY');

  const allCommissions = await prisma.commission.findMany({
    where: { referrerId: referrerProfile.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  log('📊', `Referrer ${referrerProfile.firstName} ${referrerProfile.lastName}'s commissions:`);
  for (const c of allCommissions) {
    const status = c.status === 'PAID' ? '💰 PAID' : c.status === 'APPROVED' ? '✅ APPROVED' : '⏳ PENDING';
    log('   ', `- $${Number(c.amount).toFixed(2)} | ${status} | ${c.clientName}`);
  }

  const totals = {
    total: allCommissions.reduce((sum, c) => sum + Number(c.amount), 0),
    paid: allCommissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + Number(c.amount), 0),
    pending: allCommissions.filter(c => c.status !== 'PAID').reduce((sum, c) => sum + Number(c.amount), 0),
  };

  log('', '');
  log('💵', `Total earnings: $${totals.total.toFixed(2)}`);
  log('💰', `Already paid: $${totals.paid.toFixed(2)}`);
  log('⏳', `Pending payout: $${totals.pending.toFixed(2)}`);

  log('', '');
  log('🔗', 'Test URLs:');
  log('   ', `Payout Obligations: https://taxgeniuspro.tax/en/dashboard/tax-preparer/payout-obligations`);
  log('   ', `Client Earnings: https://taxgeniuspro.tax/en/dashboard/client/earnings`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Test failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
