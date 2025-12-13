/**
 * Test to verify tax preparer clients page loads correctly
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'https://taxgeniuspro.tax';
const TEST_EMAIL = 'whitegelisa@gmail.com';
const TEST_PASSWORD = 'Makiyah07@@';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Testing clients page...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Login
    console.log('1. Logging in...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    const emailInput = await page.$('input[placeholder="you@example.com"]');
    const passwordInput = await page.$('input[type="password"]');

    if (emailInput && passwordInput) {
      await emailInput.type(TEST_EMAIL);
      await passwordInput.type(TEST_PASSWORD);
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
        } catch (e) {}
        await delay(3000);
      }
    }

    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard')) {
      console.log('   ❌ Login failed');
      await browser.close();
      return;
    }
    console.log('   ✅ Logged in\n');

    // Navigate to clients page
    console.log('2. Navigating to clients page...');
    await page.goto(`${BASE_URL}/en/dashboard/tax-preparer/clients`, { waitUntil: 'networkidle2', timeout: 60000 });
    await delay(3000);

    const finalUrl = page.url();
    console.log(`   URL: ${finalUrl}`);

    // Check for error messages
    const pageContent = await page.content();
    const hasError = pageContent.includes('Something went wrong') ||
                     pageContent.includes('error occurred') ||
                     pageContent.includes('Error ID:');

    if (hasError) {
      console.log('   ❌ Page has error!');
      await page.screenshot({ path: 'test-results/clients-error.png', fullPage: true });
      console.log('   Screenshot saved to test-results/clients-error.png');
    } else {
      console.log('   ✅ Page loaded without error');

      // Check for expected content
      const hasClientsTitle = pageContent.includes('My Clients');
      const hasTotalClients = pageContent.includes('Total Clients');

      console.log(`   Has "My Clients" title: ${hasClientsTitle ? '✅' : '❌'}`);
      console.log(`   Has "Total Clients" stat: ${hasTotalClients ? '✅' : '❌'}`);

      await page.screenshot({ path: 'test-results/clients-success.png', fullPage: true });
      console.log('   Screenshot saved to test-results/clients-success.png');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'test-results/clients-error.png' });
  } finally {
    await browser.close();
  }

  console.log('\n✨ Test complete.');
}

import { mkdirSync } from 'fs';
try { mkdirSync('test-results', { recursive: true }); } catch {}

runTest().catch(console.error);
