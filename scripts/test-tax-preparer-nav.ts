/**
 * Test Tax Preparer Navigation and Pages
 * Tests all navigation items and pages for tax preparer role
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'https://taxgeniuspro.tax';

// Test credentials for tax preparer
const TEST_EMAIL = 'whitegelisa@gmail.com';
const TEST_PASSWORD = 'Makiyah07@@';

// Expected navigation items in order
const EXPECTED_NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard/tax-preparer' },
  { label: 'Analytics', href: '/dashboard/tax-preparer/analytics' },
  { label: 'Share & Earn', href: '/dashboard/tax-preparer/share-earn' },
  { label: 'My Clients', href: '/dashboard/tax-preparer/clients' },
  { label: 'Calendar', href: '/dashboard/tax-preparer/calendar' },
  { label: 'Client Documents', href: '/dashboard/tax-preparer/documents' },
  { label: 'My Leads', href: '/dashboard/tax-preparer/leads' },
  { label: 'Academy', href: '/app/academy' },
  { label: 'IRS Forms Library', href: '/dashboard/tax-preparer/tax-forms' },
  { label: 'Store', href: '/store' },
];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('🚀 Starting Tax Preparer Navigation Tests\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const results: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];

  try {
    // Step 1: Login
    console.log('📝 Step 1: Logging in as tax preparer...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle2' });
    await delay(2000);

    // Fill login form
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    if (currentUrl.includes('/dashboard/tax-preparer')) {
      results.push({ test: 'Login', status: 'PASS' });
      console.log('   ✅ Login successful\n');
    } else {
      results.push({ test: 'Login', status: 'FAIL', details: `Redirected to ${currentUrl}` });
      console.log(`   ❌ Login failed - redirected to ${currentUrl}\n`);
    }

    // Step 2: Check sidebar navigation items
    console.log('📋 Step 2: Checking sidebar navigation items...');
    await delay(2000);

    // Get all nav items from sidebar
    const navItems = await page.evaluate(() => {
      const items: { label: string; href: string }[] = [];
      // Look for nav links in sidebar
      const links = document.querySelectorAll('nav a, aside a, [role="navigation"] a');
      links.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent?.trim();
        if (href && text && !href.startsWith('#')) {
          items.push({ label: text, href });
        }
      });
      return items;
    });

    console.log(`   Found ${navItems.length} navigation items:`);
    navItems.forEach(item => {
      console.log(`     - ${item.label}: ${item.href}`);
    });

    // Check for expected items
    for (const expected of EXPECTED_NAV_ITEMS) {
      const found = navItems.some(item =>
        item.label.includes(expected.label) || item.href.includes(expected.href)
      );
      if (found) {
        results.push({ test: `Nav: ${expected.label}`, status: 'PASS' });
        console.log(`   ✅ Found: ${expected.label}`);
      } else {
        results.push({ test: `Nav: ${expected.label}`, status: 'FAIL', details: 'Not found in sidebar' });
        console.log(`   ❌ Missing: ${expected.label}`);
      }
    }

    // Step 3: Test Overview page - verify Quick Actions removed
    console.log('\n📄 Step 3: Testing Overview page (Quick Actions should be removed)...');
    await page.goto(`${BASE_URL}/en/dashboard/tax-preparer`, { waitUntil: 'networkidle2' });
    await delay(2000);

    const hasQuickActions = await page.evaluate(() => {
      return document.body.textContent?.includes('Quick Actions') || false;
    });

    if (!hasQuickActions) {
      results.push({ test: 'Quick Actions Removed', status: 'PASS' });
      console.log('   ✅ Quick Actions section removed from Overview\n');
    } else {
      results.push({ test: 'Quick Actions Removed', status: 'FAIL', details: 'Quick Actions still visible' });
      console.log('   ❌ Quick Actions section still visible\n');
    }

    // Take screenshot of Overview
    await page.screenshot({ path: 'test-results/overview-page.png', fullPage: true });

    // Step 4: Test each page loads without error
    console.log('📄 Step 4: Testing each page loads...');

    const pagesToTest = [
      { name: 'Analytics', url: `${BASE_URL}/en/dashboard/tax-preparer/analytics` },
      { name: 'Share & Earn', url: `${BASE_URL}/en/dashboard/tax-preparer/share-earn` },
      { name: 'My Clients', url: `${BASE_URL}/en/dashboard/tax-preparer/clients` },
      { name: 'Calendar', url: `${BASE_URL}/en/dashboard/tax-preparer/calendar` },
      { name: 'Client Documents', url: `${BASE_URL}/en/dashboard/tax-preparer/documents` },
      { name: 'My Leads', url: `${BASE_URL}/en/dashboard/tax-preparer/leads` },
      { name: 'Academy', url: `${BASE_URL}/en/app/academy` },
      { name: 'IRS Forms Library', url: `${BASE_URL}/en/dashboard/tax-preparer/tax-forms` },
    ];

    for (const pageInfo of pagesToTest) {
      try {
        console.log(`   Testing: ${pageInfo.name}...`);
        await page.goto(pageInfo.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(2000);

        // Check for error indicators
        const pageContent = await page.content();
        const hasError = pageContent.includes('Error') && pageContent.includes('500') ||
                        pageContent.includes('forbidden') ||
                        pageContent.includes('Application error');

        const currentPageUrl = page.url();

        if (!hasError && !currentPageUrl.includes('forbidden') && !currentPageUrl.includes('error')) {
          results.push({ test: `Page: ${pageInfo.name}`, status: 'PASS' });
          console.log(`   ✅ ${pageInfo.name} loaded successfully`);

          // Take screenshot
          const filename = pageInfo.name.toLowerCase().replace(/\s+/g, '-');
          await page.screenshot({ path: `test-results/${filename}.png`, fullPage: false });
        } else {
          results.push({ test: `Page: ${pageInfo.name}`, status: 'FAIL', details: `Error or redirect to ${currentPageUrl}` });
          console.log(`   ❌ ${pageInfo.name} failed to load`);
        }
      } catch (error: any) {
        results.push({ test: `Page: ${pageInfo.name}`, status: 'FAIL', details: error.message });
        console.log(`   ❌ ${pageInfo.name} error: ${error.message}`);
      }
    }

    // Step 5: Check Analytics page colors
    console.log('\n🎨 Step 5: Checking Analytics page brand colors...');
    await page.goto(`${BASE_URL}/en/dashboard/tax-preparer/analytics`, { waitUntil: 'networkidle2' });
    await delay(2000);

    const colorClasses = await page.evaluate(() => {
      const html = document.body.innerHTML;
      return {
        hasAmber: html.includes('amber') || html.includes('yellow'),
        hasEmerald: html.includes('emerald') || html.includes('green'),
        hasSlate: html.includes('slate'),
        hasTeal: html.includes('teal'),
      };
    });

    console.log(`   Color classes found:`);
    console.log(`     - Amber/Yellow: ${colorClasses.hasAmber ? '✅' : '❌'}`);
    console.log(`     - Emerald/Green: ${colorClasses.hasEmerald ? '✅' : '❌'}`);
    console.log(`     - Slate: ${colorClasses.hasSlate ? '✅' : '❌'}`);
    console.log(`     - Teal: ${colorClasses.hasTeal ? '✅' : '❌'}`);

    if (colorClasses.hasAmber && colorClasses.hasEmerald) {
      results.push({ test: 'Brand Colors', status: 'PASS' });
    } else {
      results.push({ test: 'Brand Colors', status: 'FAIL', details: 'Missing brand colors' });
    }

    await page.screenshot({ path: 'test-results/analytics-colors.png', fullPage: true });

  } catch (error: any) {
    console.error('Test error:', error.message);
    results.push({ test: 'Overall', status: 'FAIL', details: error.message });
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.test}${r.details ? ` - ${r.details}` : ''}`);
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('-'.repeat(60) + '\n');

  return failed === 0;
}

// Create test-results directory
import { mkdirSync } from 'fs';
try {
  mkdirSync('test-results', { recursive: true });
} catch {}

runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
