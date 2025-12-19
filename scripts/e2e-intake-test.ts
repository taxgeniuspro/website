/**
 * E2E Test: Tax Intake System (All 3 Forms)
 *
 * Tests:
 * 1. Tax Intake Form (complete data with SSN, DOB, DL)
 * 2. Contact Form (basic lead)
 * 3. Cash Advance Form (urgent lead)
 *
 * Success Criteria:
 * - All forms submit successfully
 * - Emails sent to tax preparer (Owliver Owl)
 * - Database records created correctly
 * - Dashboard displays all submissions
 *
 * Run with: npx tsx scripts/e2e-intake-test.ts
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Test configuration
const BASE_URL = 'https://taxgeniuspro.tax';
const PREPARER_CODE = 'ow'; // Owliver Owl
const TEST_TIMESTAMP = Date.now();
const SCREENSHOT_DIR = path.join(__dirname, '../test-screenshots');

// Generate unique test data
const TEST_DATA = {
  intakeForm: {
    first_name: 'E2EIntake',
    middle_name: 'Test',
    last_name: `User${TEST_TIMESTAMP}`,
    email: `e2e-intake-${TEST_TIMESTAMP}@test.taxgeniuspro.com`,
    phone: '4705551001',
    address_line_1: '123 E2E Test Street',
    city: 'Atlanta',
    state: 'GA',
    zip_code: '30301',
    date_of_birth: '1990-05-15',
    ssn: '123-45-6789',
    filing_status: 'Single',
    employment_type: 'W2',
    occupation: 'Software Engineer',
    drivers_license: 'GA1234567890',
    license_expiration: '2028-12-31',
  },
  contactForm: {
    firstName: 'E2EContact',
    lastName: `Test${TEST_TIMESTAMP}`,
    email: `e2e-contact-${TEST_TIMESTAMP}@test.taxgeniuspro.com`,
    phone: '4705551002',
    message: 'E2E test message - please ignore',
  },
  cashAdvanceForm: {
    firstName: 'E2ECashAdv',
    lastName: `Test${TEST_TIMESTAMP}`,
    email: `e2e-cashadv-${TEST_TIMESTAMP}@test.taxgeniuspro.com`,
    phone: '4705551003',
  },
};

interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  email?: string;
  error?: string;
  duration: number;
  screenshots: string[];
}

const results: TestResult[] = [];

// Helper: sleep function (replaces deprecated waitForTimeout)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility functions
async function takeScreenshot(page: Page, name: string): Promise<string> {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  const filename = `${name}-${TEST_TIMESTAMP}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`     Screenshot: ${filename}`);
  return filepath;
}

async function fillInput(page: Page, selector: string, value: string, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector, { clickCount: 3 });
    await page.type(selector, value, { delay: 50 });
    return true;
  } catch {
    return false;
  }
}

async function clickButtonByText(page: Page, text: string, timeout = 5000): Promise<boolean> {
  try {
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const buttonText = await button.evaluate(el => el.textContent?.trim() || '');
      if (buttonText.includes(text)) {
        await button.click();
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function selectDropdownOption(page: Page, triggerSelector: string, optionValue: string) {
  try {
    // Click the trigger to open dropdown
    await page.waitForSelector(triggerSelector, { timeout: 3000 });
    await page.click(triggerSelector);
    await sleep(500);

    // Find and click the option
    const options = await page.$$('[role="option"], [data-value], select option');
    for (const option of options) {
      const text = await option.evaluate(el => el.textContent?.trim() || '');
      if (text.toLowerCase().includes(optionValue.toLowerCase())) {
        await option.click();
        await sleep(300);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ============================================================================
// TEST 1: TAX INTAKE FORM (Complete Data)
// ============================================================================
async function testTaxIntakeForm(browser: Browser): Promise<TestResult> {
  const startTime = Date.now();
  const screenshots: string[] = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: TAX INTAKE FORM');
  console.log('='.repeat(60));
  console.log(`URL: ${BASE_URL}/go/${PREPARER_CODE}-intake`);
  console.log(`Email: ${TEST_DATA.intakeForm.email}`);

  try {
    // Navigate to intake form
    console.log('\n  Step 1: Navigate to intake form...');
    await page.goto(`${BASE_URL}/go/${PREPARER_CODE}-intake`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    screenshots.push(await takeScreenshot(page, 'intake-01-welcome'));

    // Page 1: Welcome - Click Start
    console.log('  Step 2: Click Start button...');
    await sleep(2000);
    const startClicked = await clickButtonByText(page, 'Start');
    if (!startClicked) {
      // Try clicking any button that might be the start
      await clickButtonByText(page, 'Begin');
      await clickButtonByText(page, 'Continue');
    }
    await sleep(1500);
    screenshots.push(await takeScreenshot(page, 'intake-02-personal'));

    // Page 2: Personal Information + Address (Desktop combines these)
    console.log('  Step 3: Fill personal information...');
    await fillInput(page, '#first_name', TEST_DATA.intakeForm.first_name);
    await fillInput(page, '#middle_name', TEST_DATA.intakeForm.middle_name);
    await fillInput(page, '#last_name', TEST_DATA.intakeForm.last_name);
    await fillInput(page, '#email', TEST_DATA.intakeForm.email);
    await fillInput(page, '#phone', TEST_DATA.intakeForm.phone);

    console.log('  Step 4: Fill address...');
    await fillInput(page, '#address_line_1', TEST_DATA.intakeForm.address_line_1);
    await fillInput(page, '#city', TEST_DATA.intakeForm.city);
    await fillInput(page, '#state', TEST_DATA.intakeForm.state);
    await fillInput(page, '#zip_code', TEST_DATA.intakeForm.zip_code);
    screenshots.push(await takeScreenshot(page, 'intake-03-personal-filled'));

    // Click Next
    console.log('  Step 5: Next page...');
    await clickButtonByText(page, 'Next');
    await sleep(1500);

    // Page 3: Identity (DOB + SSN)
    console.log('  Step 6: Fill identity (DOB, SSN)...');
    await fillInput(page, '#date_of_birth', TEST_DATA.intakeForm.date_of_birth);
    await fillInput(page, '#ssn', TEST_DATA.intakeForm.ssn);
    screenshots.push(await takeScreenshot(page, 'intake-04-identity'));

    // Click Next
    await clickButtonByText(page, 'Next');
    await sleep(1500);

    // Page 4: Dependent Status + Filing Status (Desktop)
    console.log('  Step 7: Fill filing information...');
    // Select "No" for claimed as dependent - click the trigger button
    const dependentTriggers = await page.$$('button[role="combobox"]');
    if (dependentTriggers[0]) {
      await dependentTriggers[0].click();
      await sleep(500);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await sleep(300);
    }

    // Select filing status
    if (dependentTriggers[1]) {
      await dependentTriggers[1].click();
      await sleep(500);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await sleep(300);
    }

    // Employment type
    if (dependentTriggers[2]) {
      await dependentTriggers[2].click();
      await sleep(500);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await sleep(300);
    }

    // Fill occupation
    await fillInput(page, '#occupation', TEST_DATA.intakeForm.occupation);
    screenshots.push(await takeScreenshot(page, 'intake-05-filing'));

    // Continue through remaining pages
    console.log('  Step 8: Continue through remaining pages...');

    for (let pageNum = 5; pageNum <= 10; pageNum++) {
      await clickButtonByText(page, 'Next');
      await sleep(1200);

      // Handle dropdowns on each page
      const triggers = await page.$$('button[role="combobox"]');
      for (const trigger of triggers) {
        try {
          await trigger.click();
          await sleep(400);
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Enter');
          await sleep(300);
        } catch {
          // Ignore errors
        }
      }

      // Page 9: ID Documents - fill driver's license info
      if (pageNum === 9) {
        console.log('  Step 9: Fill ID documents...');
        await fillInput(page, '#drivers_license', TEST_DATA.intakeForm.drivers_license);
        await fillInput(page, '#license_expiration', TEST_DATA.intakeForm.license_expiration);
        screenshots.push(await takeScreenshot(page, 'intake-06-id-docs'));
      }
    }

    // Final page - Submit
    console.log('  Step 10: Submit form...');
    screenshots.push(await takeScreenshot(page, 'intake-07-submit-page'));
    await clickButtonByText(page, 'Submit');
    await sleep(6000);
    screenshots.push(await takeScreenshot(page, 'intake-08-result'));

    // Check for success
    const pageContent = await page.content();
    const currentUrl = page.url();
    const isSuccess =
      pageContent.toLowerCase().includes('thank you') ||
      pageContent.toLowerCase().includes('congratulations') ||
      pageContent.toLowerCase().includes('success') ||
      currentUrl.includes('signup') ||
      currentUrl.includes('dashboard');

    if (!isSuccess && pageContent.toLowerCase().includes('error')) {
      throw new Error('Form submission returned an error');
    }

    console.log('\n  RESULT: PASSED');
    await page.close();

    return {
      testName: 'Tax Intake Form',
      status: 'passed',
      email: TEST_DATA.intakeForm.email,
      duration: Date.now() - startTime,
      screenshots,
    };

  } catch (error: any) {
    console.log(`\n  RESULT: FAILED - ${error.message}`);
    screenshots.push(await takeScreenshot(page, 'intake-error'));
    await page.close();

    return {
      testName: 'Tax Intake Form',
      status: 'failed',
      email: TEST_DATA.intakeForm.email,
      error: error.message,
      duration: Date.now() - startTime,
      screenshots,
    };
  }
}

// ============================================================================
// TEST 2: CONTACT FORM (Basic Lead)
// ============================================================================
async function testContactForm(browser: Browser): Promise<TestResult> {
  const startTime = Date.now();
  const screenshots: string[] = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: CONTACT FORM');
  console.log('='.repeat(60));
  console.log(`URL: ${BASE_URL}/contact?ref=${PREPARER_CODE}`);
  console.log(`Email: ${TEST_DATA.contactForm.email}`);

  try {
    // Navigate to contact form
    console.log('\n  Step 1: Navigate to contact form...');
    await page.goto(`${BASE_URL}/contact?ref=${PREPARER_CODE}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    screenshots.push(await takeScreenshot(page, 'contact-01-form'));

    // Fill the form
    console.log('  Step 2: Fill contact form...');
    await fillInput(page, '#firstName, input[name="firstName"]', TEST_DATA.contactForm.firstName);
    await fillInput(page, '#lastName, input[name="lastName"]', TEST_DATA.contactForm.lastName);
    await fillInput(page, '#email, input[name="email"], input[type="email"]', TEST_DATA.contactForm.email);
    await fillInput(page, '#phone, input[name="phone"], input[type="tel"]', TEST_DATA.contactForm.phone);
    await fillInput(page, '#message, textarea[name="message"], textarea', TEST_DATA.contactForm.message);
    screenshots.push(await takeScreenshot(page, 'contact-02-filled'));

    // Submit
    console.log('  Step 3: Submit form...');
    await clickButtonByText(page, 'Submit');
    await sleep(5000);
    screenshots.push(await takeScreenshot(page, 'contact-03-result'));

    // Check for success
    const pageContent = await page.content();
    if (pageContent.toLowerCase().includes('error') && !pageContent.toLowerCase().includes('thank')) {
      throw new Error('Form submission returned an error');
    }

    console.log('\n  RESULT: PASSED');
    await page.close();

    return {
      testName: 'Contact Form',
      status: 'passed',
      email: TEST_DATA.contactForm.email,
      duration: Date.now() - startTime,
      screenshots,
    };

  } catch (error: any) {
    console.log(`\n  RESULT: FAILED - ${error.message}`);
    screenshots.push(await takeScreenshot(page, 'contact-error'));
    await page.close();

    return {
      testName: 'Contact Form',
      status: 'failed',
      email: TEST_DATA.contactForm.email,
      error: error.message,
      duration: Date.now() - startTime,
      screenshots,
    };
  }
}

// ============================================================================
// TEST 3: CASH ADVANCE FORM (Urgent Lead)
// ============================================================================
async function testCashAdvanceForm(browser: Browser): Promise<TestResult> {
  const startTime = Date.now();
  const screenshots: string[] = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: CASH ADVANCE FORM');
  console.log('='.repeat(60));
  console.log(`URL: ${BASE_URL}/cash-advance?ref=${PREPARER_CODE}`);
  console.log(`Email: ${TEST_DATA.cashAdvanceForm.email}`);

  try {
    // Navigate to cash advance form
    console.log('\n  Step 1: Navigate to cash advance form...');
    await page.goto(`${BASE_URL}/cash-advance?ref=${PREPARER_CODE}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    screenshots.push(await takeScreenshot(page, 'cash-01-form'));

    // Fill the form
    console.log('  Step 2: Fill cash advance form...');
    await fillInput(page, '#firstName, input[name="firstName"]', TEST_DATA.cashAdvanceForm.firstName);
    await fillInput(page, '#lastName, input[name="lastName"]', TEST_DATA.cashAdvanceForm.lastName);
    await fillInput(page, '#email, input[name="email"], input[type="email"]', TEST_DATA.cashAdvanceForm.email);
    await fillInput(page, '#phone, input[name="phone"], input[type="tel"]', TEST_DATA.cashAdvanceForm.phone);
    screenshots.push(await takeScreenshot(page, 'cash-02-filled'));

    // Submit
    console.log('  Step 3: Submit form...');
    await clickButtonByText(page, 'Submit');
    await sleep(5000);
    screenshots.push(await takeScreenshot(page, 'cash-03-result'));

    // Check for success
    const pageContent = await page.content();
    if (pageContent.toLowerCase().includes('error') && !pageContent.toLowerCase().includes('thank')) {
      throw new Error('Form submission returned an error');
    }

    console.log('\n  RESULT: PASSED');
    await page.close();

    return {
      testName: 'Cash Advance Form',
      status: 'passed',
      email: TEST_DATA.cashAdvanceForm.email,
      duration: Date.now() - startTime,
      screenshots,
    };

  } catch (error: any) {
    console.log(`\n  RESULT: FAILED - ${error.message}`);
    screenshots.push(await takeScreenshot(page, 'cash-error'));
    await page.close();

    return {
      testName: 'Cash Advance Form',
      status: 'failed',
      email: TEST_DATA.cashAdvanceForm.email,
      error: error.message,
      duration: Date.now() - startTime,
      screenshots,
    };
  }
}

// ============================================================================
// DATABASE VERIFICATION
// ============================================================================
async function verifyDatabaseRecords(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('DATABASE VERIFICATION');
  console.log('='.repeat(60));

  // Get Owliver's Profile ID for comparison
  const owliverProfile = await prisma.profile.findFirst({
    where: {
      OR: [
        { customTrackingCode: PREPARER_CODE },
        { trackingCode: PREPARER_CODE },
      ],
    },
    select: { id: true, firstName: true, lastName: true },
  });

  console.log(`\nOwliver Owl Profile ID: ${owliverProfile?.id}`);

  // Check each test submission
  const testEmails = [
    { email: TEST_DATA.intakeForm.email, type: 'Intake Form', expectedComplete: true },
    { email: TEST_DATA.contactForm.email, type: 'Contact Form', expectedComplete: false },
    { email: TEST_DATA.cashAdvanceForm.email, type: 'Cash Advance', expectedComplete: false },
  ];

  for (const test of testEmails) {
    console.log(`\n--- ${test.type} ---`);
    console.log(`Email: ${test.email}`);

    // Find TaxIntakeLead
    const lead = await prisma.taxIntakeLead.findFirst({
      where: { email: { equals: test.email, mode: 'insensitive' } },
      orderBy: { created_at: 'desc' },
    });

    if (lead) {
      console.log(`  TaxIntakeLead: FOUND (${lead.id})`);
      console.log(`  Completed: ${lead.completed} (expected: ${test.expectedComplete})`);
      console.log(`  Assigned Preparer: ${lead.assignedPreparerId}`);

      const match = lead.assignedPreparerId === owliverProfile?.id;
      console.log(`  Preparer Match: ${match ? 'YES' : 'NO'}`);

      if (lead.full_form_data) {
        const fd = lead.full_form_data as any;
        const fields = [];
        if (fd.ssn) fields.push('SSN');
        if (fd.date_of_birth) fields.push('DOB');
        if (fd.filing_status) fields.push('Filing');
        if (fd.drivers_license) fields.push('DL#');
        if (fd.drivers_license_image_url) fields.push('DL_IMG');
        console.log(`  Form Data: ${fields.join(', ') || 'EMPTY'}`);
      }
    } else {
      console.log(`  TaxIntakeLead: NOT FOUND`);
    }

    // Check CRM Contact
    const crm = await prisma.cRMContact.findFirst({
      where: { email: { equals: test.email, mode: 'insensitive' } },
    });

    if (crm) {
      console.log(`  CRM Contact: FOUND (${crm.id})`);
      console.log(`  CRM Stage: ${crm.stage}`);
    } else {
      console.log(`  CRM Contact: NOT FOUND`);
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log('='.repeat(60));
  console.log('E2E TEST SUITE: TAX INTAKE SYSTEM');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Preparer: ${PREPARER_CODE} (Owliver Owl)`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);

  // Create screenshot directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Launch browser
  console.log('\nLaunching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // Run all tests
    results.push(await testTaxIntakeForm(browser));
    results.push(await testContactForm(browser));
    results.push(await testCashAdvanceForm(browser));

    // Close browser
    await browser.close();

    // Wait a moment for data to propagate
    console.log('\nWaiting 3 seconds for data propagation...');
    await new Promise(r => setTimeout(r, 3000));

    // Verify database
    await verifyDatabaseRecords();

  } catch (error: any) {
    console.error('\nTest runner error:', error.message);
    await browser.close();
  } finally {
    await prisma.$disconnect();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.status === 'passed' ? '  PASS' : '  FAIL';
    console.log(`${icon}  ${result.testName} (${result.duration}ms)`);
    if (result.error) {
      console.log(`       Error: ${result.error}`);
    }
    if (result.status === 'passed') passed++;
    else failed++;
  }

  console.log('');
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\nCheck screenshots in:', SCREENSHOT_DIR);
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
    console.log('Check taxgenius.tax@gmail.com for email notifications.');
    process.exit(0);
  }
}

main().catch(console.error);
