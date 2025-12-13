const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    console.log('Step 1: Navigating to signin page...');
    await page.goto('https://taxgeniuspro.tax/auth/signin', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Step 2: Taking screenshot of signin page...');
    await page.screenshot({ path: 'signin-page.png', fullPage: true });
    console.log('Screenshot saved: signin-page.png');

    // Check for and close any modals or overlays
    console.log('Step 3: Checking for modals...');
    const modalCloseButton = await page.$('button[aria-label="Close"], [data-testid="modal-close"], .modal-close');
    if (modalCloseButton) {
      console.log('Found modal, closing it...');
      await modalCloseButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Get page HTML to debug selectors
    console.log('Step 4: Analyzing form structure...');
    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        ariaLabel: input.getAttribute('aria-label')
      }));
    });
    console.log('Found inputs:', JSON.stringify(formInfo, null, 2));

    console.log('Step 5: Looking for email field...');
    // Use the ID from the form info - we know it's "email"
    const emailSelector = 'input#email';
    await page.waitForSelector(emailSelector, { timeout: 10000 });
    console.log('Using email selector:', emailSelector);

    console.log('Step 6: Entering email...');
    await page.click(emailSelector);
    await page.type(emailSelector, 'whitegelisa@gmail.com', { delay: 50 });

    console.log('Step 7: Looking for password field...');
    // Use the ID from the form info - we know it's "password"
    const passwordSelector = 'input#password';
    await page.waitForSelector(passwordSelector, { timeout: 10000 });
    console.log('Using password selector:', passwordSelector);

    console.log('Step 8: Entering password...');
    await page.click(passwordSelector);
    await page.type(passwordSelector, 'Makiyah07@@', { delay: 50 });

    // Wait a moment for any validation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for any error messages
    const errorMessages = await page.evaluate(() => {
      const errors = Array.from(document.querySelectorAll('.text-red-500, .text-destructive, [role="alert"]'));
      return errors.map(el => el.textContent.trim()).filter(text => text.length > 0);
    });

    if (errorMessages.length > 0) {
      console.log('⚠️  Found validation errors:', errorMessages);
    }

    console.log('Step 9: Clicking sign in button...');
    // Find and click the submit button
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      const buttonText = await page.evaluate(el => el.textContent, submitButton);
      console.log('Found submit button with text:', buttonText.trim());
      await submitButton.click();
    } else {
      throw new Error('Could not find submit button');
    }

    console.log('Step 10: Waiting for redirect...');
    // Wait for navigation with a 10 second timeout
    await page.waitForNavigation({
      waitUntil: 'networkidle2',
      timeout: 10000
    }).catch(err => {
      console.log('Navigation timeout - page may have already loaded');
    });

    // Additional wait to ensure page is fully loaded
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Step 11: Taking screenshot of redirect page...');
    const finalUrl = page.url();
    await page.screenshot({ path: 'after-login.png', fullPage: true });
    console.log('Screenshot saved: after-login.png');

    console.log('\n=== RESULTS ===');
    console.log('Final URL:', finalUrl);

    if (finalUrl.includes('/dashboard/tax-preparer')) {
      console.log('✅ SUCCESS: Redirected to /dashboard/tax-preparer');
    } else if (finalUrl.includes('/dashboard/lead')) {
      console.log('❌ FAILURE: Incorrectly redirected to /dashboard/lead');
    } else if (finalUrl.includes('/dashboard')) {
      console.log('⚠️  WARNING: Redirected to dashboard but not the specific tax-preparer route');
    } else if (finalUrl.includes('/forbidden')) {
      console.log('❌ FAILURE: Redirected to /forbidden (Access Denied)');
      console.log('\nDIAGNOSIS:');
      console.log('This indicates the user logged in successfully but authorization failed.');
      console.log('The tax preparer page checks for role === "TAX_PREPARER" (uppercase)');
      console.log('but the Prisma enum uses "tax_preparer" (lowercase).');
      console.log('\nBUG FOUND: Case mismatch in role comparison!');
    } else {
      console.log('❌ FAILURE: Did not redirect to dashboard at all');
    }

  } catch (error) {
    console.error('Error during test:', error.message);
    await page.screenshot({ path: 'error-state.png', fullPage: true });
    console.log('Error screenshot saved: error-state.png');
  } finally {
    await browser.close();
  }
})();
