/**
 * Simple test to verify site is accessible and login works
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'https://taxgeniuspro.tax';
const TEST_EMAIL = 'whitegelisa@gmail.com';
const TEST_PASSWORD = 'Makiyah07@@';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Starting simple test...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Go to signin page
    console.log('1. Navigating to signin page...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    console.log(`   URL: ${page.url()}`);
    await page.screenshot({ path: 'test-results/01-signin-page.png' });

    // Check if we see the signin form - target the credential form specifically
    // The email field in the credential form has placeholder "you@example.com"
    const emailInput = await page.$('input[placeholder="you@example.com"]');
    const passwordInput = await page.$('input[type="password"]');

    if (emailInput && passwordInput) {
      console.log('   ✅ Found login form\n');

      // Fill form - use specific selectors
      console.log('2. Filling login form...');
      await emailInput.click();
      await emailInput.type(TEST_EMAIL);
      await passwordInput.click();
      await passwordInput.type(TEST_PASSWORD);
      await delay(500);
      await page.screenshot({ path: 'test-results/02-filled-form.png' });
      console.log('   ✅ Form filled\n');

      // Submit
      console.log('3. Submitting form...');
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        console.log('   Waiting for navigation...');

        // Wait up to 60 seconds for redirect
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
        } catch (e) {
          console.log('   (Navigation wait timed out, checking current state...)');
        }

        await delay(3000);
        const finalUrl = page.url();
        console.log(`   Final URL: ${finalUrl}`);
        await page.screenshot({ path: 'test-results/03-after-submit.png' });

        if (finalUrl.includes('/dashboard')) {
          console.log('   ✅ Successfully logged in!\n');

          // Now check navigation
          console.log('4. Checking sidebar navigation...');
          const navHtml = await page.evaluate(() => {
            // Try different selectors for sidebar
            const sidebar = document.querySelector('aside') ||
                           document.querySelector('[data-sidebar]') ||
                           document.querySelector('nav');
            return sidebar ? sidebar.innerHTML : 'No sidebar found';
          });

          // Check for expected items
          const expectedItems = ['Overview', 'Analytics', 'Share & Earn', 'My Clients',
                                'Calendar', 'Client Documents', 'My Leads', 'Academy',
                                'IRS Forms', 'Store'];

          console.log('   Checking for navigation items:');
          for (const item of expectedItems) {
            const found = navHtml.includes(item);
            console.log(`     ${found ? '✅' : '❌'} ${item}`);
          }

          // Check for Quick Actions removal
          console.log('\n5. Checking Overview page...');
          await page.goto(`${BASE_URL}/en/dashboard/tax-preparer`, { waitUntil: 'networkidle2', timeout: 30000 });
          await delay(2000);

          const pageContent = await page.content();
          const hasQuickActions = pageContent.includes('Quick Actions');
          console.log(`   Quick Actions section: ${hasQuickActions ? '❌ Still present' : '✅ Removed'}`);
          await page.screenshot({ path: 'test-results/04-overview.png', fullPage: true });

          // Check Analytics page
          console.log('\n6. Checking Analytics page colors...');
          await page.goto(`${BASE_URL}/en/dashboard/tax-preparer/analytics`, { waitUntil: 'networkidle2', timeout: 30000 });
          await delay(2000);

          const analyticsHtml = await page.content();
          console.log(`   Has amber classes: ${analyticsHtml.includes('amber') ? '✅' : '❌'}`);
          console.log(`   Has emerald classes: ${analyticsHtml.includes('emerald') ? '✅' : '❌'}`);
          console.log(`   Has slate classes: ${analyticsHtml.includes('slate') ? '✅' : '❌'}`);
          await page.screenshot({ path: 'test-results/05-analytics.png', fullPage: true });

        } else if (finalUrl.includes('signin') || finalUrl.includes('error')) {
          console.log('   ❌ Login failed - still on signin page\n');

          // Check for error message
          const errorMsg = await page.evaluate(() => {
            const errorEl = document.querySelector('[role="alert"]') ||
                           document.querySelector('.text-red') ||
                           document.querySelector('.error');
            return errorEl ? errorEl.textContent : null;
          });

          if (errorMsg) {
            console.log(`   Error: ${errorMsg}`);
          }
        }
      }
    } else {
      console.log('   ❌ Login form not found');
      console.log('   Page content preview:');
      const bodyText = await page.evaluate(() => document.body?.textContent?.slice(0, 500));
      console.log(`   ${bodyText}`);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'test-results/error.png' });
  } finally {
    await browser.close();
  }

  console.log('\n✨ Test complete. Check test-results/ folder for screenshots.');
}

import { mkdirSync } from 'fs';
try { mkdirSync('test-results', { recursive: true }); } catch {}

runTest().catch(console.error);
