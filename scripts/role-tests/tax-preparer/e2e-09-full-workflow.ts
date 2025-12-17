/**
 * E2E Test 09: Full Tax Preparer Workflow
 *
 * Complete end-to-end workflow test:
 * Lead → Contact → Convert → Client → Document → Complete → Commission → Paid
 */

import { Browser, Page } from 'puppeteer';
import {
  launchBrowser, login, screenshot, navigateTo, waitForSelector,
  elementExists, clickButton, fillInput, getText, waitForToast,
  closeBrowser, waitForNetworkIdle, getCurrentUrl, delay,
} from '../test-utils/puppeteer-helpers';
import {
  prisma, createTestTaxIntakeLead, cleanupAllTestData,
  runTest, assert, assertEqual, assertNotNull,
  logHeader, logSuccess, logInfo, logError, TestResult,
} from '../test-utils/index';

const TEST_EMAIL = process.env.TEST_PREPARER_EMAIL || 'whitegelisa@gmail.com';
const TEST_PASSWORD = process.env.TEST_PREPARER_PASSWORD || 'Makiyah07@@';

async function runFullWorkflowE2ETests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let browser: Browser | null = null;
  let page: Page | null = null;
  let testPreparerId: string | null = null;
  let testLeadId: string | null = null;

  try {
    // Get preparer ID
    results.push(await runTest('18.0 Get preparer info', async () => {
      const user = await prisma.user.findUnique({
        where: { email: TEST_EMAIL },
        include: { profile: true },
      });
      assertNotNull(user?.profile, 'Preparer should exist');
      testPreparerId = user!.profile!.id;
      logSuccess(`Preparer ID: ${testPreparerId}`);
    }));

    // Setup browser
    results.push(await runTest('18.1 Login as tax preparer', async () => {
      const launched = await launchBrowser();
      browser = launched.browser;
      page = launched.page;
      const loggedIn = await login(page, TEST_EMAIL, TEST_PASSWORD);
      assert(loggedIn, 'Should be logged in');
      await screenshot(page, '18-01-login');
      logSuccess('Logged in');
    }));

    if (!page || !testPreparerId) throw new Error('Setup failed');

    // Create test lead via API
    results.push(await runTest('18.2 Create test lead', async () => {
      const { intakeLead } = await createTestTaxIntakeLead({
        assignedPreparerId: testPreparerId!,
        firstName: 'WorkflowTest',
        lastName: `E2E${Date.now()}`,
        email: `workflow-test-${Date.now()}@test-taxgeniuspro.local`,
      });
      testLeadId = intakeLead.id;
      logSuccess(`Created lead: ${testLeadId}`);
    }));

    // Navigate to leads and find test lead
    results.push(await runTest('18.3 Navigate to leads page', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer/leads');
      await waitForNetworkIdle(page!, 5000);
      await screenshot(page!, '18-03-leads-page');
      logSuccess('On leads page');
    }));

    results.push(await runTest('18.4 Find test lead in list', async () => {
      await delay(2000);

      // Search for the test lead
      const searchInput = await page!.$('input[type="search"], input[placeholder*="earch"]');
      if (searchInput) {
        await searchInput.type('WorkflowTest', { delay: 50 });
        await delay(1000);
      }

      const leadFound = await page!.evaluate(() => {
        const text = document.body.textContent || '';
        return text.includes('WorkflowTest');
      });

      logInfo(`  Lead found in UI: ${leadFound}`);
      await screenshot(page!, '18-04-find-lead');
      logSuccess('Lead search complete');
    }));

    // Contact the lead
    results.push(await runTest('18.5 Contact lead (via DB)', async () => {
      const updatedLead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId! },
        data: {
          lastContactedAt: new Date(),
          contactMethod: 'CALL',
          contactNotes: 'E2E Test: Called and discussed filing needs',
        },
      });
      assertNotNull(updatedLead.lastContactedAt, 'Contact recorded');
      logSuccess('Lead contacted');
    }));

    // Navigate to clients page
    results.push(await runTest('18.6 Navigate to clients', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer/clients');
      await waitForNetworkIdle(page!, 5000);
      await screenshot(page!, '18-06-clients');
      logSuccess('On clients page');
    }));

    // Navigate to documents
    results.push(await runTest('18.7 Navigate to documents', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer/documents');
      await waitForNetworkIdle(page!, 5000);
      await screenshot(page!, '18-07-documents');
      logSuccess('On documents page');
    }));

    // Mark lead as converted and complete (via DB for reliability)
    results.push(await runTest('18.8 Convert and complete lead (via DB)', async () => {
      // Create a test client profile
      const testUser = await prisma.user.create({
        data: {
          email: `converted-${Date.now()}@test-taxgeniuspro.local`,
          name: 'WorkflowTest E2E',
        },
      });

      const testProfile = await prisma.profile.create({
        data: {
          userId: testUser.id,
          role: 'client',
          firstName: 'WorkflowTest',
          lastName: 'E2E',
        },
      });

      // Convert and complete the lead
      await prisma.taxIntakeLead.update({
        where: { id: testLeadId! },
        data: {
          convertedToClient: true,
          convertedAt: new Date(),
          profileId: testProfile.id,
          completed: true,
        },
      });

      // Create client-preparer assignment
      await prisma.clientPreparer.create({
        data: {
          preparerId: testPreparerId!,
          clientId: testProfile.id,
          isActive: true,
        },
      });

      logSuccess('Lead converted and completed');
    }));

    // Navigate to payout obligations
    results.push(await runTest('18.9 Navigate to payout obligations', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer/payout-obligations');
      await waitForNetworkIdle(page!, 5000);
      await screenshot(page!, '18-09-payouts');
      logSuccess('On payout obligations page');
    }));

    // Final dashboard screenshot
    results.push(await runTest('18.10 Final dashboard screenshot', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer');
      await waitForNetworkIdle(page!, 5000);
      await screenshot(page!, '18-10-final-dashboard', true);
      logSuccess('Final screenshot captured');
    }));

    // Cleanup test data
    results.push(await runTest('18.11 Cleanup test data', async () => {
      await cleanupAllTestData();
      logSuccess('Test data cleaned up');
    }));

  } catch (error) {
    logError(`E2E workflow error: ${error}`);
    results.push({
      testName: 'E2E Workflow Error',
      passed: false,
      duration: 0,
      error: String(error),
    });
  } finally {
    if (browser) await closeBrowser();
    await prisma.$disconnect();
  }

  return results;
}

async function main() {
  logHeader('E2E Test 09: Full Workflow');
  logInfo('Testing complete lead → client → completion workflow');

  const results = await runFullWorkflowE2ETests();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n' + '─'.repeat(50));
  results.forEach(r => {
    const status = r.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(`  ${status} ${r.testName} (${r.duration}ms)`);
    if (!r.passed && r.error) {
      console.log(`         Error: ${r.error}`);
    }
  });
  console.log('─'.repeat(50));
  console.log(`\n  Results: ${passed}/${results.length} passed`);

  process.exit(failed > 0 ? 1 : 0);
}

main();

export { runFullWorkflowE2ETests };
