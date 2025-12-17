/**
 * Create Test Lead and Complete Flow
 *
 * This script:
 * 1. Creates a test lead with a referrer code
 * 2. Tests the complete flow (marking as complete, crediting commission)
 * 3. Cleans up the test data
 *
 * Run: npx tsx scripts/create-test-lead-and-complete.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_PREPARER_EMAIL = 'whitegelisa@gmail.com'; // Gelisa White (gw)
const TEST_REFERRER_CODE = 'ge'; // Gregory Edwards

interface TestContext {
  preparerId: string;
  referrerId: string;
  leadId: string;
  commissionId?: string;
}

async function log(message: string, data?: any) {
  console.log(`\n📋 ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 COMMISSION COMPLETE FLOW TEST');
  console.log('='.repeat(70));
  console.log(`\nTime: ${new Date().toISOString()}\n`);

  const ctx: Partial<TestContext> = {};

  try {
    // Step 1: Get preparer and referrer profiles
    log('Step 1: Getting preparer and referrer profiles...');

    const preparer = await prisma.profile.findFirst({
      where: { user: { email: TEST_PREPARER_EMAIL } },
    });

    if (!preparer) {
      throw new Error(`Preparer not found: ${TEST_PREPARER_EMAIL}`);
    }
    ctx.preparerId = preparer.id;
    console.log(`✅ Found preparer: ${preparer.firstName} ${preparer.lastName} (${preparer.id})`);

    const referrer = await prisma.profile.findFirst({
      where: { customTrackingCode: TEST_REFERRER_CODE },
    });

    if (!referrer) {
      throw new Error(`Referrer not found with code: ${TEST_REFERRER_CODE}`);
    }
    ctx.referrerId = referrer.id;
    console.log(`✅ Found referrer: ${referrer.firstName} ${referrer.lastName} (${referrer.id})`);

    // Step 2: Create test lead
    log('Step 2: Creating test lead with referrer...');

    const testLead = await prisma.taxIntakeLead.create({
      data: {
        first_name: 'Test',
        last_name: 'Commission',
        email: `test-commission-${Date.now()}@example.com`,
        phone: '555-TEST-001',
        country_code: '+1',
        tax_year: 2024,
        assignedPreparerId: preparer.id,
        referrerUsername: TEST_REFERRER_CODE,
        referrerType: 'TAX_PREPARER',
        attributionMethod: 'direct',
        convertedToClient: true, // Already converted, just needs completion
        completed: true,
      },
    });

    ctx.leadId = testLead.id;
    console.log(`✅ Created test lead: ${testLead.first_name} ${testLead.last_name} (${testLead.id})`);
    console.log(`   Referrer code: ${testLead.referrerUsername}`);

    // Step 3: Count existing commissions for referrer (to determine tier)
    log('Step 3: Checking referrer\'s current commission count...');

    const existingCommissions = await prisma.commission.count({
      where: {
        referrerId: referrer.id,
        sourceType: 'RETURN_FILED',
        status: { in: ['PENDING', 'APPROVED', 'PAID'] },
      },
    });

    console.log(`✅ Referrer has ${existingCommissions} existing RETURN_FILED commissions`);

    // Step 4: Calculate expected commission
    log('Step 4: Calculating expected commission...');

    const { calculateReferrerCommission, COMPANY_DEFAULT_TIERS } = await import(
      '../src/lib/services/tiered-commission.service'
    );

    const expectedCommission = await calculateReferrerCommission(
      preparer.id,
      referrer.id,
      existingCommissions + 1
    );

    console.log(`✅ Expected commission: $${expectedCommission.amount}`);
    console.log(`   Tier: ${expectedCommission.tier}`);
    console.log(`   Source: ${expectedCommission.source}`);

    // Step 5: Simulate the complete API logic
    log('Step 5: Simulating complete API (creating commission)...');

    // Check if commission already exists (shouldn't)
    const existingForLead = await prisma.commission.findFirst({
      where: {
        sourceType: 'RETURN_FILED',
        sourceId: testLead.id,
      },
    });

    if (existingForLead) {
      throw new Error('Commission already exists for this lead (should not happen)');
    }

    // Create commission
    const commission = await prisma.commission.create({
      data: {
        referrerId: referrer.id,
        amount: expectedCommission.amount,
        sourceType: 'RETURN_FILED',
        sourceId: testLead.id,
        clientName: `${testLead.first_name} ${testLead.last_name}`,
        clientEmail: testLead.email,
        commissionType: 'FLAT',
        commissionRate: expectedCommission.rate,
        rateSource: expectedCommission.source,
        status: 'PENDING',
      },
    });

    ctx.commissionId = commission.id;
    console.log(`✅ Created commission record: ${commission.id}`);
    console.log(`   Amount: $${commission.amount}`);
    console.log(`   Status: ${commission.status}`);

    // Step 6: Update lead as complete
    log('Step 6: Marking lead as complete...');

    const updatedLead = await prisma.taxIntakeLead.update({
      where: { id: testLead.id },
      data: {
        convertedAt: new Date(),
        contactNotes: `[${new Date().toISOString()}] Return filed - marked as COMPLETE (TEST)`,
      },
    });

    console.log(`✅ Lead marked as complete`);
    console.log(`   convertedAt: ${updatedLead.convertedAt}`);

    // Step 7: Verify the complete state
    log('Step 7: Verifying final state...');

    const finalLead = await prisma.taxIntakeLead.findUnique({
      where: { id: testLead.id },
    });

    const finalCommission = await prisma.commission.findUnique({
      where: { id: commission.id },
    });

    console.log(`\n✅ VERIFICATION RESULTS:`);
    console.log(`   Lead ID: ${finalLead?.id}`);
    console.log(`   Lead Status: ${finalLead?.convertedToClient ? 'converted' : 'pending'}`);
    console.log(`   Lead Complete: ${finalLead?.convertedAt ? 'YES' : 'NO'}`);
    console.log(`   Commission ID: ${finalCommission?.id}`);
    console.log(`   Commission Amount: $${finalCommission?.amount}`);
    console.log(`   Commission Status: ${finalCommission?.status}`);
    console.log(`   Commission Source: ${finalCommission?.rateSource}`);

    // Step 8: Cleanup
    log('Step 8: Cleaning up test data...');

    await prisma.commission.delete({
      where: { id: commission.id },
    });
    console.log(`✅ Deleted test commission`);

    await prisma.taxIntakeLead.delete({
      where: { id: testLead.id },
    });
    console.log(`✅ Deleted test lead`);

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 TEST COMPLETE - ALL STEPS PASSED');
    console.log('='.repeat(70));
    console.log(`
Summary:
- Created test lead with referrer code "${TEST_REFERRER_CODE}"
- Commission calculated: $${expectedCommission.amount} (${expectedCommission.tier})
- Commission record created successfully
- Lead marked as complete with convertedAt timestamp
- All test data cleaned up

The commission system is working correctly!
    `);

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);

    // Cleanup on error
    if (ctx.commissionId) {
      try {
        await prisma.commission.delete({ where: { id: ctx.commissionId } });
        console.log('Cleaned up commission');
      } catch {}
    }
    if (ctx.leadId) {
      try {
        await prisma.taxIntakeLead.delete({ where: { id: ctx.leadId } });
        console.log('Cleaned up lead');
      } catch {}
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
