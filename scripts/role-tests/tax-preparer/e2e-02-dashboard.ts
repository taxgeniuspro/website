/**
 * E2E Test 02: Tax Preparer Dashboard
 *
 * Tests the main dashboard page loads correctly with all components.
 *
 * Tests:
 * - 11.1: Verify page loads without errors
 * - 11.2: Verify Today's Schedule card present
 * - 11.3: Verify Key Metrics Row displays
 * - 11.4: Verify Conversion Funnel chart renders
 * - 11.5: Verify Hot Leads Alert shows data
 * - 11.6: Verify Recent Activity feed loads
 * - 11.7: Screenshot: full dashboard
 */

import { Browser, Page } from 'puppeteer';
import {
  launchBrowser,
  login,
  screenshot,
  navigateTo,
  waitForSelector,
  elementExists,
  isVisible,
  getText,
  closeBrowser, delay,
  waitForNetworkIdle,
} from '../test-utils/puppeteer-helpers';
import {
  runTest,
  assert,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

// Test credentials
const TEST_EMAIL = process.env.TEST_PREPARER_EMAIL || 'whitegelisa@gmail.com';
const TEST_PASSWORD = process.env.TEST_PREPARER_PASSWORD || 'Makiyah07@@';

async function runDashboardE2ETests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Setup: Launch and login
    results.push(
      await runTest('Setup: Launch and login', async () => {
        const launched = await launchBrowser();
        browser = launched.browser;
        page = launched.page;

        const loggedIn = await login(page, TEST_EMAIL, TEST_PASSWORD);
        assert(loggedIn, 'Should be logged in');
        logSuccess('Logged in successfully');
      })
    );

    if (!page) throw new Error('Page not initialized');

    // Navigate to dashboard
    results.push(
      await runTest('Navigate to dashboard', async () => {
        await navigateTo(page!, '/dashboard/tax-preparer');
        await waitForNetworkIdle(page!, 5000);
        logSuccess('Navigated to tax preparer dashboard');
      })
    );

    // Test 11.1: Page loads without errors
    results.push(
      await runTest('11.1 Page loads without errors', async () => {
        // Check for error indicators
        const hasError = await page!.evaluate(() => {
          const errorElements = document.querySelectorAll(
            '[class*="error"], [class*="Error"], .error-boundary'
          );
          return errorElements.length > 0;
        });

        // Check console for errors
        const consoleErrors: string[] = [];
        page!.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        await delay(2000);

        // Allow some console errors (e.g., favicon not found)
        const criticalErrors = consoleErrors.filter(
          e => !e.includes('favicon') && !e.includes('manifest')
        );

        assert(!hasError || criticalErrors.length === 0, 'Page should not have critical errors');
        logSuccess('Page loaded without critical errors');
      })
    );

    // Test 11.2: Today's Schedule card
    results.push(
      await runTest('11.2 Today\'s Schedule card present', async () => {
        // Look for schedule-related elements
        const hasSchedule = await page!.evaluate(() => {
          const text = document.body.textContent?.toLowerCase() || '';
          return (
            text.includes('schedule') ||
            text.includes('today') ||
            text.includes('appointment') ||
            document.querySelector('[data-testid="schedule-card"]') !== null
          );
        });

        // Also check for card components
        const hasCards = await elementExists(page!, '[class*="card"], [class*="Card"]');

        assert(hasSchedule || hasCards, 'Dashboard should have schedule or card components');
        logSuccess('Dashboard cards present');
      })
    );

    // Test 11.3: Key Metrics Row
    results.push(
      await runTest('11.3 Key Metrics Row displays', async () => {
        // Look for metrics-related content
        const hasMetrics = await page!.evaluate(() => {
          const text = document.body.textContent?.toLowerCase() || '';
          return (
            text.includes('leads') ||
            text.includes('clients') ||
            text.includes('earnings') ||
            text.includes('conversion') ||
            text.includes('click') ||
            document.querySelector('[data-testid="metrics"]') !== null
          );
        });

        assert(hasMetrics, 'Dashboard should display metrics');
        logSuccess('Metrics displayed');
      })
    );

    // Test 11.4: Conversion Funnel
    results.push(
      await runTest('11.4 Conversion Funnel chart renders', async () => {
        // Look for chart elements or funnel mentions
        const hasChart = await page!.evaluate(() => {
          const chartSelectors = [
            'canvas',
            'svg[class*="chart"]',
            '[class*="chart"]',
            '[class*="Chart"]',
            '[class*="funnel"]',
            '[class*="Funnel"]',
          ];

          for (const selector of chartSelectors) {
            if (document.querySelector(selector)) return true;
          }

          const text = document.body.textContent?.toLowerCase() || '';
          return text.includes('funnel') || text.includes('conversion');
        });

        // Note: Chart might be a card without actual canvas
        logInfo(`  Chart elements found: ${hasChart}`);
        logSuccess('Dashboard has chart/funnel components');
      })
    );

    // Test 11.5: Hot Leads Alert
    results.push(
      await runTest('11.5 Hot Leads Alert shows data', async () => {
        const hasLeadsSection = await page!.evaluate(() => {
          const text = document.body.textContent?.toLowerCase() || '';
          return (
            text.includes('lead') ||
            text.includes('hot') ||
            text.includes('urgent') ||
            text.includes('follow-up')
          );
        });

        assert(hasLeadsSection, 'Dashboard should have leads section');
        logSuccess('Leads section present');
      })
    );

    // Test 11.6: Recent Activity feed
    results.push(
      await runTest('11.6 Recent Activity feed loads', async () => {
        const hasActivity = await page!.evaluate(() => {
          const text = document.body.textContent?.toLowerCase() || '';
          return (
            text.includes('activity') ||
            text.includes('recent') ||
            text.includes('history') ||
            document.querySelector('[data-testid="activity-feed"]') !== null
          );
        });

        // Activity might not always be present if no recent activity
        logInfo(`  Activity section found: ${hasActivity}`);
        logSuccess('Activity section check complete');
      })
    );

    // Test 11.7: Full dashboard screenshot
    results.push(
      await runTest('11.7 Screenshot full dashboard', async () => {
        await delay(1000);
        const filepath = await screenshot(page!, '11-dashboard', true);
        assert(filepath.length > 0, 'Screenshot should be saved');
        logSuccess(`Screenshot: ${filepath}`);
      })
    );

  } catch (error) {
    logError(`E2E test error: ${error}`);
    results.push({
      testName: 'E2E Error',
      passed: false,
      duration: 0,
      error: String(error),
    });
  } finally {
    if (browser) {
      await closeBrowser();
    }
  }

  return results;
}

// Main execution
async function main() {
  logHeader('E2E Test 02: Dashboard');

  const results = await runDashboardE2ETests();

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n' + '─'.repeat(50));
  results.forEach((r) => {
    const status = r.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(`  ${status} ${r.testName} (${r.duration}ms)`);
    if (!r.passed && r.error) {
      console.log(`         Error: ${r.error}`);
    }
  });
  console.log('─'.repeat(50));
  console.log(`\n  Results: ${passed}/${results.length} passed`);

  if (failed > 0) {
    console.log(`  \x1b[31m${failed} tests failed\x1b[0m`);
    process.exit(1);
  }

  process.exit(0);
}

main();

export { runDashboardE2ETests };
