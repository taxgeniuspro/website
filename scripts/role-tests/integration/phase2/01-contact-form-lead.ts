/**
 * Integration Test: Phase 2.1 - Contact Form with Tracking Code
 *
 * Tests lead creation via contact form with referral attribution.
 */

import {
  prisma,
  createTestUser,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  logHeader,
  logSuccess,
  logInfo,
  logError,
  TestResult,
  cleanupAllTestData,
} from '../../test-utils/index';

async function runContactFormLeadTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testPreparerId: string;
  let testTrackingCode: string;
  let testContactId: string;

  // Setup: Create test preparer with tracking code
  results.push(
    await runTest('Setup: Create preparer with tracking code', async () => {
      const { profile } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Contact',
        lastName: 'Preparer',
        shortLinkUsername: `cp${Date.now()}`,
      });

      testPreparerId = profile.id;
      testTrackingCode = profile.customTrackingCode || profile.trackingCode || '';

      assertNotNull(testTrackingCode, 'Tracking code should exist');
      logSuccess(`Preparer created: ${testPreparerId}`);
      logInfo(`  Tracking Code: ${testTrackingCode}`);
    })
  );

  // Test 2.1.1: Create CRMContact with tracking attribution
  results.push(
    await runTest('2.1.1 Create contact with tracking code', async () => {
      const testEmail = `contact-${Date.now()}@test-taxgeniuspro.local`;
      const contact = await prisma.cRMContact.create({
        data: {
          firstName: 'ContactTest',
          lastName: `Lead${Date.now()}`,
          email: testEmail,
          phone: '555-1234',
          contactType: 'LEAD',
          source: 'CONTACT_FORM',
          referrerUsername: testTrackingCode,
          attributionMethod: 'ref_param',
          attributionConfidence: 100,
        },
      });

      testContactId = contact.id;
      assertNotNull(contact.id, 'Contact should be created');
      assertEqual(contact.referrerUsername, testTrackingCode, 'Referrer should match');

      logSuccess(`Contact created: ${contact.id}`);
      logInfo(`  Email: ${contact.email}`);
      logInfo(`  Referrer: ${contact.referrerUsername}`);
    })
  );

  // Test 2.1.2: Verify attribution method recorded
  results.push(
    await runTest('2.1.2 Attribution method is ref_param', async () => {
      const contact = await prisma.cRMContact.findUnique({
        where: { id: testContactId },
      });

      assertNotNull(contact, 'Contact should exist');
      assertEqual(contact!.attributionMethod, 'ref_param', 'Attribution method');
      assertEqual(contact!.attributionConfidence, 100, 'Attribution confidence');

      logSuccess('Attribution verified');
      logInfo(`  Method: ${contact!.attributionMethod}`);
      logInfo(`  Confidence: ${contact!.attributionConfidence}%`);
    })
  );

  // Test 2.1.3: Verify referrer can be looked up
  results.push(
    await runTest('2.1.3 Referrer profile lookup', async () => {
      const contact = await prisma.cRMContact.findUnique({
        where: { id: testContactId },
      });

      // Look up preparer by tracking code (as attribution service would)
      const preparer = await prisma.profile.findFirst({
        where: {
          OR: [
            { trackingCode: contact!.referrerUsername },
            { customTrackingCode: contact!.referrerUsername },
            { shortLinkUsername: contact!.referrerUsername },
          ],
        },
      });

      assertNotNull(preparer, 'Referrer profile should be found');
      assertEqual(preparer!.id, testPreparerId, 'Should find correct preparer');

      logSuccess('Referrer lookup verified');
      logInfo(`  Preparer: ${preparer!.firstName} ${preparer!.lastName}`);
    })
  );

  // Test 2.1.4: Create interaction record
  results.push(
    await runTest('2.1.4 Create CRM interaction', async () => {
      const interaction = await prisma.cRMInteraction.create({
        data: {
          contactId: testContactId,
          type: 'NOTE',
          subject: 'Contact Form Submission',
          body: `Contact form submitted via tracking link. Source: contact_form. Ref: ${testTrackingCode}`,
        },
      });

      assertNotNull(interaction.id, 'Interaction should be created');
      logSuccess(`Interaction logged: ${interaction.id}`);
    })
  );

  return results;
}

async function main() {
  logHeader('Phase 2.1: Contact Form with Tracking Code');

  try {
    const results = await runContactFormLeadTests();
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log('\n' + '─'.repeat(50));
    results.forEach((r) => {
      const status = r.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
      console.log(`  ${status} ${r.testName} (${r.duration}ms)`);
      if (!r.passed && r.error) console.log(`         Error: ${r.error}`);
    });
    console.log('─'.repeat(50));
    console.log(`\n  Results: ${passed}/${results.length} passed`);

    if (failed > 0) process.exit(1);

    logInfo('Cleaning up test data...');
    await cleanupAllTestData();
    process.exit(0);
  } catch (error) {
    logError(`Test suite error: ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
export { runContactFormLeadTests };
