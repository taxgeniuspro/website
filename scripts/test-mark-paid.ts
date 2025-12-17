/**
 * Test Mark Commission as Paid Flow
 *
 * Tests the payout flow:
 * 1. Find an APPROVED commission
 * 2. Mark it as PAID with payment method
 * 3. Verify the status changed
 *
 * Run with: npx tsx scripts/test-mark-paid.ts
 */

import { prisma } from '../src/lib/prisma';
import { PaymentStatus } from '@prisma/client';

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('\n🧪 Test Mark Commission as Paid Flow\n');

  // Step 1: Find an APPROVED commission
  logSection('STEP 1: Find APPROVED Commission');

  const approvedCommission = await prisma.commission.findFirst({
    where: { status: PaymentStatus.APPROVED },
    include: {
      referrer: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!approvedCommission) {
    log('ℹ️', 'No APPROVED commissions found. Nothing to pay.');
    await prisma.$disconnect();
    return;
  }

  log('✅', `Found APPROVED commission:`);
  log('   ', `ID: ${approvedCommission.id}`);
  log('   ', `Amount: $${Number(approvedCommission.amount).toFixed(2)}`);
  log('   ', `Referrer: ${approvedCommission.referrer?.firstName} ${approvedCommission.referrer?.lastName}`);
  log('   ', `Client: ${approvedCommission.clientName}`);

  // Step 2: Mark as PAID
  logSection('STEP 2: Mark as PAID');

  const paymentMethod = 'ZELLE';
  const paymentRef = `TEST-${Date.now()}`;

  const updatedCommission = await prisma.commission.update({
    where: { id: approvedCommission.id },
    data: {
      status: PaymentStatus.PAID,
      paidAt: new Date(),
      paymentMethod: paymentMethod,
      paymentRef: paymentRef,
    },
  });

  log('✅', `Commission marked as PAID!`);
  log('   ', `Payment Method: ${paymentMethod}`);
  log('   ', `Payment Reference: ${paymentRef}`);
  log('   ', `Paid At: ${updatedCommission.paidAt?.toISOString()}`);

  // Step 3: Verify status
  logSection('STEP 3: Verify Status');

  const verifiedCommission = await prisma.commission.findUnique({
    where: { id: approvedCommission.id },
  });

  if (verifiedCommission?.status === 'PAID') {
    log('✅', `Status verified: ${verifiedCommission.status}`);
  } else {
    log('❌', `Status mismatch! Expected PAID, got ${verifiedCommission?.status}`);
  }

  // Step 4: Summary
  logSection('FINAL SUMMARY');

  const allCommissions = await prisma.commission.groupBy({
    by: ['status'],
    _count: { id: true },
    _sum: { amount: true },
  });

  log('📊', 'Commission Status Summary:');
  for (const stat of allCommissions) {
    const amount = Number(stat._sum.amount || 0).toFixed(2);
    log('   ', `${stat.status}: ${stat._count.id} commissions, $${amount} total`);
  }

  log('', '');
  log('🎉', 'Mark as paid flow completed successfully!');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Test failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
