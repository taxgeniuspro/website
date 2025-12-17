import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test with different preparers to ensure the system works for everyone
const preparersToTest = [
  { code: 'gw', name: 'Gelisa White', email: 'whitegelisa@gmail.com' },
  { code: 'rh', name: 'Ray Hamilton', email: 'rhamiltonfirm@gmail.com' },
  { code: 'ah', name: 'Ale Hamilton', email: 'goldenprotaxes@gmail.com' },
];

async function testContactFormForPreparer(prep: typeof preparersToTest[0]) {
  console.log(`\n=== Testing Contact Form for ${prep.name} (ref=${prep.code}) ===\n`);

  const timestamp = Date.now();
  const testEmail = `test-${prep.code}-${timestamp}@example.com`;

  const testData = {
    name: `Test Client for ${prep.name}`,
    email: testEmail,
    phone: '404-555-0000',
    service: 'individual',
    message: `This is a test message for ${prep.name}'s referral link (${prep.code}-lead).`,
    locale: 'en',
    ref: prep.code
  };

  try {
    const response = await fetch('https://taxgeniuspro.tax/api/contact/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    if (result.success) {
      // Wait a moment for DB to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check CRM contact
      const crmContact = await prisma.cRMContact.findUnique({
        where: { email: testEmail.toLowerCase() },
        select: {
          assignedPreparerId: true,
          referrerUsername: true,
        }
      });

      if (crmContact?.assignedPreparerId) {
        // Get preparer info
        const preparer = await prisma.user.findUnique({
          where: { id: crmContact.assignedPreparerId },
          select: { name: true, email: true }
        });

        const emailMatch = preparer?.email === prep.email;
        console.log(`✅ ${prep.name}: Form submitted, CRM attributed`);
        console.log(`   - Assigned to: ${preparer?.name} (${preparer?.email})`);
        console.log(`   - Referrer Code: ${crmContact.referrerUsername}`);
        console.log(`   - Email Match: ${emailMatch ? '✅ Yes' : '❌ No'}`);

        if (!emailMatch) {
          console.log(`   ⚠️ WARNING: Expected ${prep.email} but got ${preparer?.email}`);
        }
      } else {
        console.log(`❌ ${prep.name}: No preparer assigned!`);
      }
    } else {
      console.log(`❌ ${prep.name}: Form submission failed - ${result.error}`);
    }
  } catch (error) {
    console.error(`❌ ${prep.name}: Error - ${error}`);
  }
}

async function testSummary() {
  console.log('\n\n==========================================');
  console.log('      EMAIL ROUTING TEST SUMMARY');
  console.log('==========================================\n');

  // Get counts of test records created in last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const testContacts = await prisma.cRMContact.findMany({
    where: {
      email: { contains: 'test-' },
      createdAt: { gte: fiveMinutesAgo },
    },
    select: {
      email: true,
      referrerUsername: true,
      assignedPreparerId: true,
      source: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`Total test records created in last 5 min: ${testContacts.length}`);
  console.log('\nRecords by referrer code:');

  const byRef = testContacts.reduce((acc, c) => {
    const ref = c.referrerUsername || 'none';
    acc[ref] = (acc[ref] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(byRef).forEach(([ref, count]) => {
    console.log(`  - ${ref}: ${count} records`);
  });

  console.log('\n==========================================');
  console.log('         ALL TESTS COMPLETE');
  console.log('==========================================\n');
  console.log('To verify emails were delivered, check:');
  console.log('1. Sarah Wilson inbox: hest8133@bellsouth.net');
  console.log('2. Gelisa White inbox: whitegelisa@gmail.com');
  console.log('3. Ray Hamilton inbox: rhamiltonfirm@gmail.com');
  console.log('4. Ale Hamilton inbox: goldenprotaxes@gmail.com');
  console.log('5. Owliver Owl CC inbox: taxgenius.tax@gmail.com (should have all as CC)');
  console.log('\n');
}

async function main() {
  try {
    console.log('==========================================');
    console.log('  TESTING EMAIL ROUTING FOR ALL PREPARERS');
    console.log('==========================================');

    // Test each preparer
    for (const prep of preparersToTest) {
      await testContactFormForPreparer(prep);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await testSummary();
  } finally {
    await prisma.$disconnect();
  }
}

main();
