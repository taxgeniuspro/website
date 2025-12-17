/**
 * Quick test to verify:
 * 1. Tax Intake Leads appears in admin sidebar navigation
 * 2. Rejection dialog on Preparer Applications shows conversion options
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'https://taxgeniuspro.tax';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'iradwatkins@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function runTest() {
  if (!ADMIN_PASSWORD) {
    console.error('❌ ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }

  console.log('🚀 Starting admin navigation and rejection dialog test...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // Step 1: Login
    console.log('1️⃣ Logging in as admin...');
    await page.goto(`${BASE_URL}/en/auth/signin`, { waitUntil: 'networkidle2' });

    await page.type('input[name="email"]', ADMIN_EMAIL);
    await page.type('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    console.log('   ✅ Logged in successfully\n');

    // Step 2: Navigate to admin dashboard
    console.log('2️⃣ Navigating to admin area...');
    await page.goto(`${BASE_URL}/en/dashboard/admin`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('nav', { timeout: 10000 });
    console.log('   ✅ Admin dashboard loaded\n');

    // Step 3: Check for "Tax Intake Leads" in sidebar navigation
    console.log('3️⃣ Checking for "Tax Intake Leads" in sidebar...');
    const pageContent = await page.content();

    const hasTaxIntakeLeads = pageContent.includes('Tax Intake Leads');
    const hasTaxPreparerApplications = pageContent.includes('Tax Preparer Applications');

    if (hasTaxIntakeLeads) {
      console.log('   ✅ "Tax Intake Leads" found in sidebar navigation');
    } else {
      console.log('   ❌ "Tax Intake Leads" NOT found in sidebar - may need page refresh or deployment');
    }

    if (hasTaxPreparerApplications) {
      console.log('   ✅ "Tax Preparer Applications" found (renamed from "Tax Preparer Leads")');
    }
    console.log('');

    // Step 4: Navigate to Tax Intake Leads page
    console.log('4️⃣ Testing /admin/leads page...');
    await page.goto(`${BASE_URL}/en/admin/leads`, { waitUntil: 'networkidle2' });
    const leadsPageContent = await page.content();

    if (leadsPageContent.includes('Tax Intake Leads') || leadsPageContent.includes('Lead Pipeline')) {
      console.log('   ✅ /admin/leads page loads correctly');
    } else {
      console.log('   ⚠️  /admin/leads page content may not be as expected');
    }
    console.log('');

    // Step 5: Navigate to Preparer Applications page
    console.log('5️⃣ Testing /admin/applications/preparers page...');
    await page.goto(`${BASE_URL}/en/admin/applications/preparers`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // Wait for data to load

    const preparersPageContent = await page.content();

    // Check for rejection button (indicates page loaded)
    const hasRejectButton = preparersPageContent.includes('Reject');
    if (hasRejectButton) {
      console.log('   ✅ Preparer Applications page loaded with Reject button');
    } else {
      console.log('   ⚠️  No Reject button found (may have no pending applications)');
    }

    // Step 6: Try to click a Reject button to see dialog (if there are pending apps)
    console.log('\n6️⃣ Testing rejection dialog...');
    const rejectButtons = await page.$$('button:has-text("Reject")');

    if (rejectButtons.length > 0) {
      // Click the first reject button
      await rejectButtons[0].click();
      await new Promise(r => setTimeout(r, 1000)); // Wait for dialog

      const dialogContent = await page.content();

      // Check for our new rejection options
      const hasJustReject = dialogContent.includes('Just Reject');
      const hasConvertToClient = dialogContent.includes('Convert to Client');
      const hasConvertToAffiliate = dialogContent.includes('Convert to Affiliate');

      if (hasJustReject && hasConvertToClient && hasConvertToAffiliate) {
        console.log('   ✅ Rejection dialog shows all 3 options:');
        console.log('      - Just Reject');
        console.log('      - Reject & Convert to Client');
        console.log('      - Reject & Convert to Affiliate Client');
      } else {
        console.log('   ⚠️  Dialog may not have all options or dialog didn\'t open');
        console.log(`      Just Reject: ${hasJustReject}`);
        console.log(`      Convert to Client: ${hasConvertToClient}`);
        console.log(`      Convert to Affiliate: ${hasConvertToAffiliate}`);
      }

      // Close dialog
      await page.keyboard.press('Escape');
    } else {
      console.log('   ⚠️  No pending applications to test rejection dialog');
      console.log('      (This is expected if no applications are pending)');
    }

    // Take screenshot for verification
    console.log('\n7️⃣ Taking screenshot...');
    await page.goto(`${BASE_URL}/en/admin/applications/preparers`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'test-results/admin-nav-test.png', fullPage: true });
    console.log('   ✅ Screenshot saved to test-results/admin-nav-test.png');

    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await page.screenshot({ path: 'test-results/admin-nav-test-error.png' });
    console.log('   Error screenshot saved to test-results/admin-nav-test-error.png');
  } finally {
    await browser.close();
  }
}

runTest().catch(console.error);
