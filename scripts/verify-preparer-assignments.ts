/**
 * Verify that leads are correctly assigned to each preparer
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(70));
  console.log('VERIFYING PREPARER ASSIGNMENTS');
  console.log('='.repeat(70));

  // Get all preparers with tracking codes
  const preparers = await prisma.profile.findMany({
    where: { customTrackingCode: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      customTrackingCode: true,
      user: { select: { email: true } },
    },
  });

  const preparerMap = new Map(preparers.map(p => [p.customTrackingCode, p]));

  // Get recent test leads
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const leads = await prisma.taxIntakeLead.findMany({
    where: {
      email: { contains: 'multitest.com' },
      created_at: { gte: fiveMinutesAgo },
    },
    select: {
      email: true,
      first_name: true,
      assignedPreparerId: true,
      referrerUsername: true,
      completed: true,
      full_form_data: true,
    },
    orderBy: { created_at: 'desc' },
  });

  console.log(`\nFound ${leads.length} test leads\n`);

  let passed = 0;
  let failed = 0;

  for (const lead of leads) {
    // Extract preparer code from email (test-{code}-timestamp@multitest.com)
    const match = lead.email.match(/test-([a-z0-9]+)-\d+@/);
    const expectedCode = match ? match[1] : null;
    const expectedPreparer = expectedCode ? preparerMap.get(expectedCode) : null;

    const isCorrect = expectedPreparer?.id === lead.assignedPreparerId;
    const formData = lead.full_form_data as Record<string, unknown> || {};

    console.log(`${lead.first_name} (${lead.email})`);
    console.log(`  Expected Preparer: ${expectedPreparer?.firstName} ${expectedPreparer?.lastName} (${expectedCode})`);
    console.log(`  Assigned ID: ${lead.assignedPreparerId}`);
    console.log(`  Match: ${isCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`  Has SSN: ${formData.ssn ? '✅' : '❌'}`);
    console.log(`  Has DL Image: ${formData.drivers_license_image_url ? '✅' : '❌'}`);
    console.log('');

    if (isCorrect) passed++;
    else failed++;
  }

  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Leads: ${leads.length}`);
  console.log(`Correct Assignments: ${passed}`);
  console.log(`Wrong Assignments: ${failed}`);
  console.log(`\n${failed === 0 ? '✅ ALL PREPARER ASSIGNMENTS CORRECT' : '❌ SOME ASSIGNMENTS FAILED'}`);

  await prisma.$disconnect();
}

main().catch(console.error);
