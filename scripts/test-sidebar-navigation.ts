import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function testSidebarNavigation() {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Step 1: Navigate to signin page
    console.log('Navigating to signin page...');
    await page.goto('https://taxgeniuspro.tax/auth/signin', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Take screenshot of signin page
    const resultsDir = '/Users/irawatkins/.claude-worktrees/taxgeniuspro/blissful-wozniak/test-results';
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    await page.screenshot({
      path: path.join(resultsDir, '01-signin-page-v2.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 01-signin-page-v2.png');

    // Step 2: Fill in login credentials
    console.log('Filling in credentials...');

    // Debug: check what input fields are available
    const inputFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder
      }));
    });
    console.log('Available input fields:', JSON.stringify(inputFields, null, 2));

    // Wait for email input with flexible selector
    await page.waitForSelector('input[type="email"], input[id*="email"], input[placeholder*="mail"]', { timeout: 10000 });

    // Use evaluate to fill form fields directly
    await page.evaluate(() => {
      // Try multiple selectors
      const emailInput = (
        document.querySelector('input[type="email"]') ||
        document.querySelector('input[name="email"]') ||
        document.querySelector('input[id*="email"]') ||
        document.querySelector('input[placeholder*="mail"]')
      ) as HTMLInputElement;

      const passwordInput = (
        document.querySelector('input[type="password"]') ||
        document.querySelector('input[name="password"]') ||
        document.querySelector('input[id*="password"]')
      ) as HTMLInputElement;

      console.log('Email input found:', !!emailInput);
      console.log('Password input found:', !!passwordInput);

      if (emailInput) {
        emailInput.value = 'iradwatkins+iw1@gmail.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (passwordInput) {
        passwordInput.value = 'TaxPreparer2024!';
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot of filled form
    await page.screenshot({
      path: path.join(resultsDir, '02-filled-form-v2.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 02-filled-form-v2.png');

    // Step 3: Submit the form
    console.log('Submitting form...');

    // Debug: check buttons available
    const buttons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map(btn => ({
        text: btn.textContent?.trim(),
        type: btn.type,
        className: btn.className
      }));
    });
    console.log('Available buttons:', JSON.stringify(buttons, null, 2));

    // Click and wait for URL change
    const initialUrl = page.url();

    // Find the "Sign In" button (exact match, credentials login)
    try {
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
        const signInBtn = buttons.find(btn => btn.textContent?.trim() === 'Sign In');
        if (signInBtn) {
          (signInBtn as HTMLButtonElement).click();
          return true;
        }
        return false;
      });

      if (clicked) {
        console.log('Clicked "Sign In" credentials button');
      } else {
        console.log('Sign In button not found, trying any submit button');
        await page.click('button[type="submit"]');
      }
    } catch (error) {
      console.log('Error clicking button:', error);
    }

    // Wait for redirect by checking URL change
    console.log('Waiting for redirect...');
    let redirected = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const currentUrl = page.url();
      if (currentUrl !== initialUrl && currentUrl.includes('/dashboard')) {
        console.log('Redirected to:', currentUrl);
        redirected = true;
        break;
      }
    }

    if (!redirected) {
      console.log('No redirect detected, current URL:', page.url());
    }

    // Wait a bit more for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot after redirect
    await page.screenshot({
      path: path.join(resultsDir, '03-after-signin-v2.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 03-after-signin-v2.png');

    // Step 4: Navigate to tax-preparer dashboard if needed
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (!currentUrl.includes('/dashboard/tax-preparer')) {
      console.log('Navigating to tax-preparer dashboard...');
      await page.goto('https://taxgeniuspro.tax/en/dashboard/tax-preparer', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    }

    // Wait for sidebar to load
    console.log('Waiting for sidebar...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take full page screenshot
    await page.screenshot({
      path: path.join(resultsDir, 'tax-preparer-sidebar-v2.png'),
      fullPage: true
    });
    console.log('Screenshot saved: tax-preparer-sidebar-v2.png');

    // Step 5: Extract navigation items from sidebar
    console.log('Extracting navigation items...');

    // Try multiple selectors to find navigation items
    const navItems = await page.evaluate(() => {
      const items: { text: string; href: string; selector: string }[] = [];

      // Try different selectors for navigation items
      const selectors = [
        'nav a',
        '[role="navigation"] a',
        'aside a',
        '.sidebar a',
        'a[href*="/dashboard"]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((el) => {
            const anchor = el as HTMLAnchorElement;
            const text = anchor.textContent?.trim() || '';
            const href = anchor.href || '';
            if (text && href.includes('/dashboard')) {
              items.push({
                text,
                href,
                selector
              });
            }
          });
          if (items.length > 0) break;
        }
      }

      // Also try to get all visible text in sidebar/nav areas
      const navElements = document.querySelectorAll('nav, aside, [role="navigation"]');
      const allText: string[] = [];
      navElements.forEach((el) => {
        const text = el.textContent?.trim() || '';
        if (text) allText.push(text);
      });

      return {
        items,
        allNavText: allText,
        bodyText: document.body.innerText
      };
    });

    console.log('\n=== NAVIGATION ITEMS FOUND ===');
    console.log('Total items:', navItems.items.length);
    navItems.items.forEach((item, index) => {
      console.log(`${index + 1}. "${item.text}" -> ${item.href}`);
    });

    console.log('\n=== ALL NAVIGATION TEXT ===');
    navItems.allNavText.forEach((text, index) => {
      console.log(`Nav area ${index + 1}:`, text.substring(0, 200));
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
    const bodyTextLower = navItems.bodyText.toLowerCase();
    expectedItems.forEach((expectedItem) => {
      const found = navItems.items.some(item =>
        item.text.toLowerCase().includes(expectedItem.toLowerCase())
      ) || bodyTextLower.includes(expectedItem.toLowerCase());

      console.log(`${found ? '✅' : '❌'} ${expectedItem}`);
    });

    // Get HTML of sidebar for inspection
    const sidebarHTML = await page.evaluate(() => {
      const sidebar = document.querySelector('nav') ||
                     document.querySelector('aside') ||
                     document.querySelector('[role="navigation"]');
      return sidebar?.outerHTML || 'No sidebar found';
    });

    // Save sidebar HTML
    fs.writeFileSync(
      path.join(resultsDir, 'sidebar-html-v2.txt'),
      sidebarHTML
    );
    console.log('Sidebar HTML saved to sidebar-html-v2.txt');

  } catch (error) {
    console.error('Error during test:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

testSidebarNavigation().catch(console.error);
