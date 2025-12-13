const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TEST_RESULTS_DIR = '/Users/irawatkins/.claude-worktrees/taxgeniuspro/blissful-wozniak/test-results';

// Ensure test results directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

const TEST_PAGES = [
  { url: 'https://taxgeniuspro.tax/en/dashboard/tax-preparer/analytics', name: 'Analytics', filename: 'nav-test-1-analytics.png' },
  { url: 'https://taxgeniuspro.tax/en/quick-share', name: 'Quick Share', filename: 'nav-test-2-share-earn.png' },
  { url: 'https://taxgeniuspro.tax/en/dashboard/tax-preparer', name: 'Overview', filename: 'nav-test-3-overview.png' },
  { url: 'https://taxgeniuspro.tax/en/dashboard/tax-preparer/clients', name: 'Clients', filename: 'nav-test-4-clients.png' },
  { url: 'https://taxgeniuspro.tax/en/dashboard/tax-preparer/calendar', name: 'Calendar', filename: 'nav-test-5-calendar.png' },
  { url: 'https://taxgeniuspro.tax/en/admin/file-center', name: 'File Center', filename: 'nav-test-6-file-center.png' },
  { url: 'https://taxgeniuspro.tax/en/dashboard/tax-preparer/tax-forms', name: 'Tax Forms', filename: 'nav-test-7-tax-forms.png' },
  { url: 'https://taxgeniuspro.tax/en/dashboard/tax-preparer/training', name: 'Training', filename: 'nav-test-8-training.png' },
  { url: 'https://taxgeniuspro.tax/en/store', name: 'Store', filename: 'nav-test-9-store.png' }
];

async function testNavigation() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const results = [];

  try {
    console.log('🔐 Logging in to Tax Genius Pro...');

    // Navigate to login page
    await page.goto('https://taxgeniuspro.tax/auth/signin', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for page to fully render
    await page.screenshot({ path: path.join(TEST_RESULTS_DIR, 'login-page.png') });

    // Fill in credentials using the form - look for the email/password form (not magic link)
    console.log('Looking for login form...');
    await page.waitForSelector('form', { visible: true, timeout: 10000 });

    // Find the email input with id="email" (the form one, not magic link)
    await page.waitForSelector('input#email[type="email"]', { visible: true, timeout: 10000 });
    console.log('Found email field');

    // Fill email field
    await page.click('input#email');
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.type('input#email', 'whitegelisa@gmail.com', { delay: 30 });
    console.log('✓ Filled email field');

    // Find and fill password field
    await page.waitForSelector('input#password[type="password"]', { visible: true, timeout: 10000 });
    await page.click('input#password');
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.type('input#password', 'Makiyah07@@', { delay: 30 });
    console.log('✓ Filled password field');

    // Verify fields are filled
    const fieldsCheck = await page.evaluate(() => {
      const email = document.querySelector('input#email');
      const password = document.querySelector('input#password');
      return {
        emailValue: email?.value || '',
        passwordValue: password?.value || '',
        emailLength: email?.value?.length || 0,
        passwordLength: password?.value?.length || 0
      };
    });

    console.log(`Email: ${fieldsCheck.emailValue}`);
    console.log(`Password length: ${fieldsCheck.passwordLength}`);

    if (fieldsCheck.emailLength === 0 || fieldsCheck.passwordLength === 0) {
      throw new Error('Fields were not filled properly');
    }

    await page.screenshot({ path: path.join(TEST_RESULTS_DIR, 'login-filled.png') });

    // Click sign in button - find the submit button in the form (not the Google or Magic Link buttons)
    console.log('Clicking sign in button...');

    // Since this is a React form with client-side handling, we need to click and wait for client-side navigation
    // Find the submit button within the form
    const submitButton = await page.evaluateHandle(() => {
      const form = document.querySelector('form');
      if (form) {
        const buttons = form.querySelectorAll('button[type="submit"]');
        return buttons[buttons.length - 1]; // Get the last submit button (the form one, not others)
      }
      return null;
    });

    if (!submitButton) {
      throw new Error('Could not find submit button in form');
    }

    // Click and wait for either navigation or error message
    await Promise.all([
      page.waitForFunction(
        () => {
          // Check if we've navigated away OR an error appeared
          return !window.location.href.includes('/auth/signin') ||
                 document.querySelector('[role="alert"]') !== null;
        },
        { timeout: 15000 }
      ),
      submitButton.asElement().click()
    ]);

    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for any redirect to complete

    // Check current state
    const currentUrl = page.url();
    console.log(`Current URL after login attempt: ${currentUrl}`);

    if (currentUrl.includes('/auth/signin')) {
      // Still on sign-in page - check for error
      const errorMessage = await page.evaluate(() => {
        const alert = document.querySelector('[role="alert"]');
        return alert ? alert.textContent : 'Unknown error';
      });
      await page.screenshot({ path: path.join(TEST_RESULTS_DIR, 'login-error.png') });
      throw new Error(`Login failed: ${errorMessage}`);
    }

    await page.screenshot({ path: path.join(TEST_RESULTS_DIR, 'login-success.png') });
    console.log(`✅ Login successful! Redirected to: ${currentUrl}\n`);

    // Test each page
    for (const testPage of TEST_PAGES) {
      console.log(`📄 Testing: ${testPage.name} (${testPage.url})`);

      try {
        const response = await page.goto(testPage.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait a bit for any client-side rendering
        await new Promise(resolve => setTimeout(resolve, 2000));

        const statusCode = response.status();
        const finalUrl = page.url();

        // Check for error indicators
        const pageTitle = await page.title();
        const bodyText = await page.evaluate(() => document.body.innerText);

        const has404 = bodyText.includes('404') || bodyText.includes('Not Found') || pageTitle.includes('404');
        const hasError = bodyText.includes('Error') || bodyText.includes('error occurred');
        const wasRedirected = finalUrl !== testPage.url;

        // Take screenshot
        await page.screenshot({
          path: path.join(TEST_RESULTS_DIR, testPage.filename),
          fullPage: true
        });

        const result = {
          name: testPage.name,
          url: testPage.url,
          statusCode,
          finalUrl,
          success: statusCode === 200 && !has404 && !hasError,
          has404,
          hasError,
          wasRedirected,
          pageTitle,
          screenshot: testPage.filename
        };

        results.push(result);

        if (result.success) {
          console.log(`   ✅ Success (${statusCode})`);
        } else {
          console.log(`   ❌ Failed (${statusCode})`);
          if (has404) console.log(`      - 404 error detected`);
          if (hasError) console.log(`      - Error message detected`);
          if (wasRedirected) console.log(`      - Redirected to: ${finalUrl}`);
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({
          name: testPage.name,
          url: testPage.url,
          success: false,
          error: error.message,
          screenshot: testPage.filename
        });
      }

      console.log('');
    }

  } catch (error) {
    console.error('❌ Login failed:', error.message);
    results.push({
      error: 'Login failed',
      message: error.message
    });
  } finally {
    await browser.close();
  }

  // Generate summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total Pages Tested: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('Failed Pages:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error || r.has404 ? '404 Error' : r.hasError ? 'Page Error' : 'Unknown Error'}`);
    });
  }

  // Save detailed results to JSON
  fs.writeFileSync(
    path.join(TEST_RESULTS_DIR, 'navigation-test-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log(`\n📁 Results saved to: ${TEST_RESULTS_DIR}/navigation-test-results.json`);
  console.log(`📸 Screenshots saved to: ${TEST_RESULTS_DIR}/\n`);

  return results;
}

testNavigation().catch(console.error);
