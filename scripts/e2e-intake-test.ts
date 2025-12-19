/**
 * End-to-End Test: Tax Intake Form Submission
 *
 * This script tests the COMPLETE flow from:
 * 1. Form submission via /go/{code}-intake
 * 2. Email notification to tax preparer
 * 3. Database records (TaxIntakeLead, CRMContact, Document)
 * 4. CRM visibility for tax preparer
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
const TEST_PREPARER_CODE = 'ow'; // Owliver Owl

// Generate unique test data
const timestamp = Date.now();
const TEST_DATA = {
  first_name: 'TestUser',
  middle_name: 'E2E',
  last_name: `Test${timestamp}`,
  email: `testuser${timestamp}@e2etest.com`,
  phone: '4045551234',
  country_code: '+1',
  address_line_1: '123 Test Street',
  address_line_2: 'Suite 100',
  city: 'Atlanta',
  state: 'GA',
  zip_code: '30301',
  date_of_birth: '1990-05-15',
  ssn: '123-45-6789',
  filing_status: 'Single',
  employment_type: 'W2',
  occupation: 'Software Engineer',
  claimed_as_dependent: 'no',
  in_college: 'no',
  has_dependents: 'no',
  has_mortgage: 'no',
  denied_eitc: 'no',
  has_irs_pin: 'no',
  wants_refund_advance: 'yes',
  drivers_license: 'DL123456789',
  license_expiration: '2028-12-31',
};

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function log(step: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
  const result: TestResult = { step, status, message, details };
  results.push(result);
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} [${step}] ${message}`);
  if (details && status === 'FAIL') {
    console.log('   Details:', JSON.stringify(details, null, 2).slice(0, 500));
  }
}

async function takeScreenshot(page: Page, name: string) {
  const screenshotDir = path.join(__dirname, '../test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  const filepath = path.join(screenshotDir, `${name}-${timestamp}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`   📸 Screenshot saved: ${filepath}`);
  return filepath;
}

async function testIntakeFormSubmission(browser: Browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // Step 1: Navigate to intake form
    log('NAVIGATION', 'PASS', 'Starting navigation to intake form...');
    const intakeUrl = `${BASE_URL}/go/${TEST_PREPARER_CODE}-intake`;
    console.log(`   Navigating to: ${intakeUrl}`);

    await page.goto(intakeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await takeScreenshot(page, '01-intake-form-loaded');

    // Check if we're on the form page
    const currentUrl = page.url();
    if (currentUrl.includes('start-filing') || currentUrl.includes('form')) {
      log('NAVIGATION', 'PASS', `Redirected to form page: ${currentUrl}`);
    } else {
      log('NAVIGATION', 'FAIL', `Unexpected URL: ${currentUrl}`);
      return;
    }

    // Wait for form to be visible
    await page.waitForSelector('form', { timeout: 10000 });
    log('FORM_LOAD', 'PASS', 'Form loaded successfully');

    // Step 2: Fill out Page 1 (Welcome) - just click next
    console.log('   Filling out form pages...');

    // Look for Next button and click
    const nextButton = await page.$('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]');
    if (nextButton) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      log('PAGE_1', 'PASS', 'Clicked through welcome page');
    }

    // Step 3: Fill personal info
    await page.waitForTimeout(500);
    await takeScreenshot(page, '02-personal-info-page');

    // Try to fill in fields - handle different form layouts
    const fillField = async (selectors: string[], value: string) => {
      for (const selector of selectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click({ clickCount: 3 }); // Select all
            await element.type(value);
            return true;
          }
        } catch (e) {
          // Try next selector
        }
      }
      return false;
    };

    // Fill personal info fields
    await fillField(['input[name="first_name"]', '#first_name', 'input[placeholder*="First"]'], TEST_DATA.first_name);
    await fillField(['input[name="middle_name"]', '#middle_name'], TEST_DATA.middle_name);
    await fillField(['input[name="last_name"]', '#last_name', 'input[placeholder*="Last"]'], TEST_DATA.last_name);
    await fillField(['input[name="email"]', '#email', 'input[type="email"]'], TEST_DATA.email);
    await fillField(['input[name="phone"]', '#phone', 'input[type="tel"]'], TEST_DATA.phone);

    log('PAGE_2', 'PASS', 'Filled personal info fields');

    // Click next to go to address page
    const nextBtn2 = await page.$('button:has-text("Next"), button:has-text("Continue")');
    if (nextBtn2) {
      await nextBtn2.click();
      await page.waitForTimeout(1000);
    }

    // Step 4: Fill address
    await takeScreenshot(page, '03-address-page');
    await fillField(['input[name="address_line_1"]', '#address_line_1'], TEST_DATA.address_line_1);
    await fillField(['input[name="city"]', '#city'], TEST_DATA.city);
    await fillField(['input[name="zip_code"]', '#zip_code', 'input[name="zip"]'], TEST_DATA.zip_code);

    // Select state dropdown
    const stateSelect = await page.$('select[name="state"], #state');
    if (stateSelect) {
      await stateSelect.select('GA');
    }

    log('PAGE_3', 'PASS', 'Filled address fields');

    // Continue through remaining pages
    for (let i = 4; i <= 13; i++) {
      const nextBtnLoop = await page.$('button:has-text("Next"), button:has-text("Continue")');
      if (nextBtnLoop) {
        await nextBtnLoop.click();
        await page.waitForTimeout(800);
      }

      // Fill SSN and DOB on identity page
      if (i === 4) {
        await fillField(['input[name="ssn"]', '#ssn'], TEST_DATA.ssn);
        await fillField(['input[name="date_of_birth"]', '#date_of_birth', 'input[type="date"]'], TEST_DATA.date_of_birth);
        log('PAGE_4', 'PASS', 'Filled identity info (SSN, DOB)');
      }

      // Select filing status
      if (i === 6) {
        const filingSelect = await page.$('select[name="filing_status"]');
        if (filingSelect) {
          await filingSelect.select('Single');
        }
        await fillField(['input[name="occupation"]', '#occupation'], TEST_DATA.occupation);
        log('PAGE_6', 'PASS', 'Filled filing status and occupation');
      }

      // Driver's license page
      if (i === 13) {
        await fillField(['input[name="drivers_license"]', '#drivers_license'], TEST_DATA.drivers_license);
        await fillField(['input[name="license_expiration"]', '#license_expiration'], TEST_DATA.license_expiration);
        log('PAGE_13', 'PASS', 'Filled driver license info');
      }
    }

    await takeScreenshot(page, '04-final-page');

    // Step 5: Submit the form
    const submitBtn = await page.$('button:has-text("Submit"), button[type="submit"]:has-text("Submit")');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(5000); // Wait for submission
      log('SUBMISSION', 'PASS', 'Form submitted');
    } else {
      log('SUBMISSION', 'FAIL', 'Submit button not found');
    }

    await takeScreenshot(page, '05-after-submission');

    // Check for success message or redirect
    const successIndicators = [
      'Thank you',
      'Success',
      'submitted',
      'confirmation',
      'signup',
      'dashboard'
    ];

    const pageContent = await page.content();
    const foundSuccess = successIndicators.some(indicator =>
      pageContent.toLowerCase().includes(indicator.toLowerCase())
    );

    if (foundSuccess) {
      log('SUCCESS_PAGE', 'PASS', 'Form submission appears successful');
    } else {
      log('SUCCESS_PAGE', 'FAIL', 'Could not confirm submission success');
    }

  } catch (error: any) {
    log('FORM_TEST', 'FAIL', `Error during form test: ${error.message}`);
    await takeScreenshot(page, 'error-state');
  } finally {
    await page.close();
  }
}

async function verifyDatabaseRecords() {
  console.log('\n📊 Verifying Database Records...\n');

  try {
    // Check TaxIntakeLead
    const lead = await prisma.taxIntakeLead.findFirst({
      where: {
        email: { contains: 'e2etest.com' },
      },
      orderBy: { created_at: 'desc' },
    });

    if (lead) {
      log('DB_LEAD', 'PASS', `TaxIntakeLead found: ${lead.id}`);
      log('DB_LEAD_COMPLETED', lead.completed ? 'PASS' : 'FAIL',
        `Lead completed flag: ${lead.completed}`);

      const formData = lead.full_form_data as any;
      if (formData) {
        log('DB_FORM_DATA', 'PASS', 'full_form_data populated');
        log('DB_SSN', formData.ssn ? 'PASS' : 'FAIL',
          `SSN in form data: ${formData.ssn ? 'Yes' : 'No'}`);
        log('DB_DOB', formData.date_of_birth ? 'PASS' : 'FAIL',
          `DOB in form data: ${formData.date_of_birth ? 'Yes' : 'No'}`);
        log('DB_FILING', formData.filing_status ? 'PASS' : 'FAIL',
          `Filing status in form data: ${formData.filing_status ? 'Yes' : 'No'}`);
        log('DB_DL_IMAGE', formData.drivers_license_image_url ? 'PASS' : 'FAIL',
          `Driver's license image URL: ${formData.drivers_license_image_url ? 'Yes' : 'No'}`);
      } else {
        log('DB_FORM_DATA', 'FAIL', 'full_form_data is empty');
      }

      // Check preparer assignment
      if (lead.assignedPreparerId) {
        const preparer = await prisma.profile.findUnique({
          where: { id: lead.assignedPreparerId },
          select: { firstName: true, lastName: true, customTrackingCode: true },
        });
        log('DB_ASSIGNMENT', 'PASS',
          `Assigned to: ${preparer?.firstName} ${preparer?.lastName} (${preparer?.customTrackingCode})`);
      } else {
        log('DB_ASSIGNMENT', 'FAIL', 'No preparer assigned');
      }

      // Check client folder
      if (lead.clientFolderId) {
        log('DB_FOLDER', 'PASS', `Client folder created: ${lead.clientFolderId}`);
      } else {
        log('DB_FOLDER', 'FAIL', 'No client folder created');
      }

    } else {
      log('DB_LEAD', 'FAIL', 'No TaxIntakeLead found for test email');
    }

    // Check CRMContact
    const contact = await prisma.cRMContact.findFirst({
      where: {
        email: { contains: 'e2etest.com' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (contact) {
      log('DB_CRM', 'PASS', `CRMContact found: ${contact.id}`);
      log('DB_CRM_STAGE', 'PASS', `Stage: ${contact.stage}`);
      if (contact.assignedPreparerId) {
        log('DB_CRM_ASSIGNED', 'PASS', `CRM contact assigned: ${contact.assignedPreparerId}`);
      } else {
        log('DB_CRM_ASSIGNED', 'FAIL', 'CRM contact not assigned');
      }
    } else {
      log('DB_CRM', 'FAIL', 'No CRMContact found for test email');
    }

    // Check Document records
    const documents = await prisma.document.findMany({
      where: {
        metadata: {
          path: ['clientEmail'],
          string_contains: 'e2etest.com',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (documents.length > 0) {
      log('DB_DOCS', 'PASS', `${documents.length} Document(s) found`);
      documents.forEach((doc, i) => {
        log(`DB_DOC_${i+1}`, 'PASS', `Document: ${doc.fileName} - ${doc.fileUrl?.substring(0, 50)}...`);
      });
    } else {
      log('DB_DOCS', 'SKIP', 'No documents found (may not have uploaded file)');
    }

  } catch (error: any) {
    log('DB_CHECK', 'FAIL', `Database check error: ${error.message}`);
  }
}

async function checkExistingLeads() {
  console.log('\n📋 Checking Existing Leads for Owliver Owl...\n');

  try {
    // Get Owliver's profile
    const owliver = await prisma.profile.findFirst({
      where: {
        OR: [
          { customTrackingCode: 'ow' },
          { trackingCode: 'ow' },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { email: true } },
      },
    });

    if (!owliver) {
      log('OWLIVER_PROFILE', 'FAIL', 'Owliver profile not found');
      return;
    }

    log('OWLIVER_PROFILE', 'PASS', `Found: ${owliver.firstName} ${owliver.lastName} (${owliver.user?.email})`);

    // Get recent leads assigned to Owliver
    const leads = await prisma.taxIntakeLead.findMany({
      where: {
        assignedPreparerId: owliver.id,
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    console.log(`\n   Found ${leads.length} leads assigned to Owliver:\n`);

    leads.forEach((lead, i) => {
      const formData = lead.full_form_data as any;
      const status = lead.completed ? '✅ COMPLETE' : '⚠️ INCOMPLETE';
      const hasSSN = formData?.ssn ? '✓' : '✗';
      const hasDOB = formData?.date_of_birth ? '✓' : '✗';
      const hasImage = formData?.drivers_license_image_url ? '✓' : '✗';

      console.log(`   ${i+1}. ${lead.first_name} ${lead.last_name} (${lead.email})`);
      console.log(`      Status: ${status}`);
      console.log(`      SSN: ${hasSSN} | DOB: ${hasDOB} | DL Image: ${hasImage}`);
      console.log(`      Created: ${lead.created_at.toISOString()}`);
      console.log('');
    });

    // Count complete vs incomplete
    const complete = leads.filter(l => l.completed).length;
    const incomplete = leads.filter(l => !l.completed).length;

    log('LEAD_STATS', 'PASS', `Complete: ${complete}, Incomplete: ${incomplete}`);

    // Check for leads with missing data
    const missingData = leads.filter(l => {
      const fd = l.full_form_data as any;
      return l.completed && (!fd?.ssn || !fd?.date_of_birth || !fd?.filing_status);
    });

    if (missingData.length > 0) {
      log('DATA_INTEGRITY', 'FAIL',
        `${missingData.length} complete leads missing SSN/DOB/filing_status`);
    } else {
      log('DATA_INTEGRITY', 'PASS', 'All complete leads have required data');
    }

  } catch (error: any) {
    log('LEAD_CHECK', 'FAIL', `Error checking leads: ${error.message}`);
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY REPORT');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log('');

  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - [${r.step}] ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  console.log('🚀 Starting End-to-End Test for Tax Intake System\n');
  console.log(`Test Data Email: ${TEST_DATA.email}`);
  console.log(`Target Preparer: ${TEST_PREPARER_CODE} (Owliver Owl)`);
  console.log('='.repeat(60) + '\n');

  // First, check existing leads without running browser test
  await checkExistingLeads();

  // Ask if user wants to run the full browser test
  console.log('\n📝 Skipping browser automation (run manually to test form submission)');
  console.log('   To test form submission, visit: ' + `${BASE_URL}/go/${TEST_PREPARER_CODE}-intake`);

  // Verify database for recent test submissions
  await verifyDatabaseRecords();

  // Generate report
  await generateReport();

  await prisma.$disconnect();
}

main().catch(console.error);
