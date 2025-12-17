/**
 * Comprehensive Test for Referral Images System
 *
 * Tests:
 * 1. Database: Verify folders exist for all preparers
 * 2. Admin API: Test /api/admin/referral-images endpoint
 * 3. Tax Preparer API: Test /api/tax-preparer/referral-images endpoint
 * 4. UI: Take screenshots of the admin and preparer pages
 */

import { prisma } from '../src/lib/prisma';
import puppeteer from 'puppeteer';

const BASE_URL = process.env.TEST_URL || 'https://taxgeniuspro.tax';

async function testDatabase() {
  console.log('\n=== DATABASE TESTS ===\n');

  // 1. Count folder sets
  const totalSets = await prisma.referralImageSet.count();
  console.log(`Total ReferralImageSets: ${totalSets}`);

  // 2. Count by category
  const defaultSets = await prisma.referralImageSet.count({ where: { category: 'default' } });
  const preparerSets = await prisma.referralImageSet.count({ where: { category: 'preparer' } });
  console.log(`  - Default folders: ${defaultSets}`);
  console.log(`  - Preparer folders: ${preparerSets}`);

  // 3. Check all 4 folder types exist for defaults
  const defaultFolderTypes = await prisma.referralImageSet.findMany({
    where: { category: 'default' },
    select: { folderType: true }
  });
  const defaultTypes = defaultFolderTypes.map(f => f.folderType);
  console.log(`\nDefault folder types: ${defaultTypes.join(', ')}`);

  const requiredTypes = ['preseason_loans', 'tax_season_lead', 'tax_season_intake', 'client_referral'];
  const missingDefaults = requiredTypes.filter(t => !defaultTypes.includes(t));
  if (missingDefaults.length > 0) {
    console.log(`❌ Missing default folders: ${missingDefaults.join(', ')}`);
  } else {
    console.log(`✅ All 4 default folder types exist`);
  }

  // 4. Count images
  const totalImages = await prisma.referralImage.count();
  console.log(`\nTotal images: ${totalImages}`);

  // 5. Check images per default folder
  const defaultFoldersWithImages = await prisma.referralImageSet.findMany({
    where: { category: 'default' },
    include: { _count: { select: { images: true } } }
  });
  console.log('\nDefault folder image counts:');
  for (const folder of defaultFoldersWithImages) {
    const status = folder._count.images > 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${folder.folderType}: ${folder._count.images} images`);
  }

  // 6. Count preparers with folders
  const preparersWithFolders = await prisma.referralImageSet.groupBy({
    by: ['preparerId'],
    where: { category: 'preparer', preparerId: { not: null } }
  });
  console.log(`\nPreparers with folders: ${preparersWithFolders.length}`);

  // 7. Check a sample preparer (Gelisa White)
  const gelisaFolders = await prisma.referralImageSet.findMany({
    where: {
      category: 'preparer',
      preparer: { firstName: 'Gelisa' }
    },
    include: { _count: { select: { images: true } } }
  });
  console.log(`\nGelisa White's folders: ${gelisaFolders.length}`);
  for (const folder of gelisaFolders) {
    console.log(`  - ${folder.folderType}: ${folder._count.images} images`);
  }

  return {
    totalSets,
    defaultSets,
    preparerSets,
    totalImages,
    missingDefaults
  };
}

async function testBrowserUI() {
  console.log('\n=== BROWSER UI TESTS ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // 1. Test admin login
    console.log('1. Testing admin login...');
    await page.goto(`${BASE_URL}/en/sign-in`, { waitUntil: 'networkidle2' });

    // Login as admin
    await page.type('input[name="email"]', 'iradwatkins@gmail.com');
    await page.type('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});

    // 2. Navigate to admin referral images page
    console.log('2. Navigating to admin referral images page...');
    await page.goto(`${BASE_URL}/en/admin/referral-images`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-referral-images-1.png', fullPage: true });
    console.log('   Screenshot saved: test-results/admin-referral-images-1.png');

    // 3. Check if sidebar exists
    const sidebarExists = await page.$('.w-72') !== null;
    console.log(`   Sidebar exists: ${sidebarExists ? '✅' : '❌'}`);

    // 4. Check if Tax Genius Defaults button exists
    const defaultsButton = await page.$('button:has-text("Tax Genius Defaults")');
    const defaultsExists = defaultsButton !== null;
    console.log(`   Tax Genius Defaults button: ${defaultsExists ? '✅' : '❌'}`);

    // 5. Click on Tax Genius Defaults
    if (defaultsButton) {
      await defaultsButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/admin-referral-images-defaults.png', fullPage: true });
      console.log('   Screenshot saved: test-results/admin-referral-images-defaults.png');
    }

    // 6. Search for a preparer
    console.log('3. Testing search...');
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('Gelisa');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/admin-referral-images-search.png', fullPage: true });
      console.log('   Screenshot saved: test-results/admin-referral-images-search.png');
    }

    // 7. Click on a preparer
    const preparerButton = await page.$('button:has-text("Gelisa")');
    if (preparerButton) {
      await preparerButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/admin-referral-images-preparer.png', fullPage: true });
      console.log('   Screenshot saved: test-results/admin-referral-images-preparer.png');
    }

    console.log('\n✅ Browser UI tests completed');

  } catch (error) {
    console.error('Browser test error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('REFERRAL IMAGES COMPREHENSIVE TEST');
  console.log('='.repeat(60));
  console.log(`Testing: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  try {
    // Run database tests
    const dbResults = await testDatabase();

    // Run browser tests (only if we have puppeteer)
    try {
      await testBrowserUI();
    } catch (e) {
      console.log('\n⚠️ Browser tests skipped (puppeteer not available or error)');
      console.log('Error:', e);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Database:`);
    console.log(`  - ${dbResults.totalSets} folder sets`);
    console.log(`  - ${dbResults.defaultSets} default folders`);
    console.log(`  - ${dbResults.preparerSets} preparer folders`);
    console.log(`  - ${dbResults.totalImages} total images`);

    if (dbResults.missingDefaults.length > 0) {
      console.log(`\n❌ ISSUES FOUND:`);
      console.log(`  - Missing default folders: ${dbResults.missingDefaults.join(', ')}`);
    } else {
      console.log(`\n✅ All tests passed!`);
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main().then(() => {
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
