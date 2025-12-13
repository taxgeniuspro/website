import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function testSidebarSimple() {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const resultsDir = '/Users/irawatkins/.claude-worktrees/taxgeniuspro/blissful-wozniak/test-results';
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Navigate to signin
    console.log('Navigating to signin page...');
    await page.goto('https://taxgeniuspro.tax/auth/signin', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fill form using ID selectors
    console.log('Filling credentials...');
    await page.type('#email', 'whitegelisa@gmail.com');
    await page.type('#password', 'Makiyah07@@');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Screenshot before submit
    await page.screenshot({
      path: path.join(resultsDir, 'before-submit.png'),
      fullPage: true
    });

    // Submit
    console.log('Submitting...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Nav timeout:', e.message)),
      page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
        const signInBtn = buttons.find(btn => btn.textContent?.trim() === 'Sign In');
        if (signInBtn) {
          (signInBtn as HTMLButtonElement).click();
        }
      })
    ]);

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Current URL after submit:', page.url());

    // Screenshot after submit
    await page.screenshot({
      path: path.join(resultsDir, 'after-submit.png'),
      fullPage: true
    });

    // If we're on a dashboard page, great
    if (page.url().includes('/dashboard')) {
      console.log('Successfully reached dashboard!');

      // Wait for sidebar
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Take sidebar screenshot
      await page.screenshot({
        path: path.join(resultsDir, 'tax-preparer-sidebar-v2.png'),
        fullPage: true
      });

      // Extract nav items
      const navData = await page.evaluate(() => {
        const navItems: string[] = [];
        const links = Array.from(document.querySelectorAll('a'));

        links.forEach(link => {
          const text = link.textContent?.trim();
          const href = link.href;
          if (text && href.includes('/dashboard')) {
            navItems.push(`${text} -> ${href}`);
          }
        });

        return {
          navItems,
          bodyText: document.body.innerText
        };
      });

      console.log('\n=== NAVIGATION ITEMS ===');
      navData.navItems.forEach((item, i) => {
        console.log(`${i + 1}. ${item}`);
      });

      // Check for expected items
      const expectedItems = [
        'My Clients',
        'Client File Center',
        'IRS Forms Library',
        'Support Tickets',
        'Calendar',
        'Store'
      ];

      console.log('\n=== VERIFICATION ===');
      const bodyTextLower = navData.bodyText.toLowerCase();
      expectedItems.forEach((expectedItem) => {
        const found = navData.navItems.some(item =>
          item.toLowerCase().includes(expectedItem.toLowerCase())
        ) || bodyTextLower.includes(expectedItem.toLowerCase());

        console.log(`${found ? '✅' : '❌'} ${expectedItem}`);
      });
    } else {
      console.log('Did not reach dashboard. Current URL:', page.url());
    }

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

testSidebarSimple().catch(console.error);
