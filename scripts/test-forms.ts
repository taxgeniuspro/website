/**
 * Comprehensive Form Testing Script
 * Tests all public forms with proper attribution
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'https://taxgeniuspro.tax';
const TEST_DATA = {
  client: {
    firstName: 'Test',
    lastName: 'Client',
    email: 'ira@irawatkins.com',
    phone: '555-123-4567'
  },
  preparer: {
    firstName: 'Cely',
    lastName: 'Crypto',
    email: 'celycrypto@gmail.com',
    phone: '555-567-8901'
  }
};

async function testContactForm() {
  console.log('\n=== TESTING CONTACT FORM ===');
  console.log(`URL: ${BASE_URL}/contact?ref=ow`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/contact?ref=ow`, { waitUntil: 'networkidle0' });

    // Check if ref cookie is set
    const cookies = await page.cookies();
    const refCookie = cookies.find(c => c.name === '__tgp_ref');
    console.log(`✓ Ref cookie: ${refCookie ? refCookie.value : 'NOT SET'}`);

    // Fill out form
    await page.type('input[name="name"]', `${TEST_DATA.client.firstName} ${TEST_DATA.client.lastName}`);
    await page.type('input[name="email"]', TEST_DATA.client.email);
    await page.type('input[name="phone"]', TEST_DATA.client.phone);

    // Select service if dropdown exists
    const serviceSelect = await page.$('select[name="service"]');
    if (serviceSelect) {
      await page.select('select[name="service"]', 'personal');
    }

    // Enter message
    const messageField = await page.$('textarea[name="message"]');
    if (messageField) {
      await page.type('textarea[name="message"]', 'Testing contact form with ref=ow attribution');
    }

    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});

    // Check for success
    const successMessage = await page.$('.success, .toast-success, [role="alert"]');
    console.log(`✓ Form submitted: ${successMessage ? 'SUCCESS' : 'Check manually'}`);

    await browser.close();
    return true;
  } catch (error) {
    console.error(`✗ Error: ${error}`);
    await browser.close();
    return false;
  }
}

async function testCashAdvanceForm() {
  console.log('\n=== TESTING CASH ADVANCE FORM ===');
  console.log(`URL: ${BASE_URL}/cash-advance?ref=ow`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/cash-advance?ref=ow`, { waitUntil: 'networkidle0' });

    // Check cookies
    const cookies = await page.cookies();
    const refCookie = cookies.find(c => c.name === '__tgp_ref');
    console.log(`✓ Ref cookie: ${refCookie ? refCookie.value : 'NOT SET'}`);

    // Get page content for debugging
    const pageContent = await page.content();
    console.log(`✓ Page loaded (${pageContent.length} bytes)`);

    await browser.close();
    return true;
  } catch (error) {
    console.error(`✗ Error: ${error}`);
    await browser.close();
    return false;
  }
}

async function checkMarketingLinks() {
  console.log('\n=== CHECKING MARKETING LINKS ===');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const links = [
    { code: 'ow-lead', expected: '/contact?ref=ow' },
    { code: 'ow-intake', expected: '/start-filing/form?ref=ow' },
    { code: 'ow-appt', expected: '/book?ref=ow' }
  ];

  for (const link of links) {
    try {
      const response = await page.goto(`${BASE_URL}/go/${link.code}`, {
        waitUntil: 'networkidle0',
        timeout: 15000
      });

      const finalUrl = page.url();
      const hasExpectedPath = finalUrl.includes(link.expected.split('?')[0]);
      console.log(`${hasExpectedPath ? '✓' : '✗'} /go/${link.code} → ${finalUrl}`);
    } catch (error) {
      console.log(`✗ /go/${link.code} failed: ${error}`);
    }
  }

  await browser.close();
}

async function main() {
  console.log('==============================================');
  console.log('TAX GENIUS PRO - COMPREHENSIVE FORM TESTING');
  console.log('==============================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Client: ${TEST_DATA.client.email}`);
  console.log(`Test Preparer: ${TEST_DATA.preparer.email}`);

  // Test marketing links first
  await checkMarketingLinks();

  // Test contact form
  await testContactForm();

  // Test cash advance form
  await testCashAdvanceForm();

  console.log('\n==============================================');
  console.log('TESTING COMPLETE');
  console.log('==============================================');
  console.log('\nNext steps:');
  console.log('1. Check email inbox at taxgenius.tax@gmail.com');
  console.log('2. Verify CRMContact created in database');
  console.log('3. Check attribution: referrerUsername should be "ow"');
}

main().catch(console.error);
