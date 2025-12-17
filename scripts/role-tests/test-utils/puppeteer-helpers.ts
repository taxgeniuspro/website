/**
 * Puppeteer Helpers
 *
 * Browser automation utilities for E2E testing.
 *
 * Helpers:
 * - 19.1: launchBrowser() - headless Chrome setup
 * - 19.2: login(email, password) - authenticate as user
 * - 19.3: screenshot(name) - capture with timestamp
 * - 19.4: waitForSelector(selector) - wait for element
 * - 19.5: clickButton(text) - click by button text
 * - 19.6: fillInput(selector, value) - type into input
 * - 19.7: selectDropdown(selector, value) - select option
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'tax-preparer-e2e', 'screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Browser instance
let browser: Browser | null = null;
let page: Page | null = null;

/**
 * 19.1: Launch headless Chrome browser
 */
export async function launchBrowser(): Promise<{ browser: Browser; page: Page }> {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  page = await browser.newPage();

  // Set user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Set default timeout
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);

  return { browser, page };
}

/**
 * Helper: delay function (replacement for deprecated waitForTimeout)
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 19.2: Login as user with email and password
 *
 * Note: The sign-in page has multiple login options:
 * 1. Google OAuth (primary button at top)
 * 2. Magic Link
 * 3. Email/Password form (at bottom)
 *
 * This function specifically uses the Email/Password form.
 */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<boolean> {
  try {
    // Navigate to sign-in page
    await page.goto(`${BASE_URL}/en/auth/signin`, {
      waitUntil: 'networkidle2',
    });

    // Wait for the credentials form to load - look for the email input with id="email"
    await page.waitForSelector('input#email', {
      timeout: 10000,
    });

    // Fill email in the credentials form (specifically the input with id="email")
    const emailInput = await page.$('input#email');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 }); // Select all
      await emailInput.type(email, { delay: 50 });
    }

    // Fill password (specifically the input with id="password")
    const passwordInput = await page.$('input#password');
    if (passwordInput) {
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(password, { delay: 50 });
    }

    // Click the submit button within the credentials form
    // The form has a button[type="submit"] that is NOT the Google OAuth button
    await page.evaluate(() => {
      // Find the form that contains the credentials inputs
      const form = document.querySelector('form');
      if (form) {
        // Find the submit button within this form
        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitBtn) {
          submitBtn.click();
          return;
        }
      }

      // Fallback: find any submit button that's not the Google button
      const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
      const credentialsBtn = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('sign in') && !text.includes('google');
      });
      if (credentialsBtn) {
        (credentialsBtn as HTMLButtonElement).click();
      }
    });

    // Wait a moment for the sign-in to process
    await delay(1000);

    // Wait for navigation to dashboard (or error)
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch {
      // May have already navigated or stayed on same page with error
    }

    // Check if we're on the dashboard
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('/dashboard');

    return isLoggedIn;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
}

/**
 * 19.3: Take screenshot with timestamp
 */
export async function screenshot(
  page: Page,
  name: string,
  fullPage: boolean = false
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  await page.screenshot({
    path: filepath,
    fullPage,
  });

  console.log(`  📸 Screenshot saved: ${filename}`);
  return filepath;
}

/**
 * 19.4: Wait for selector with optional visibility check
 */
export async function waitForSelector(
  page: Page,
  selector: string,
  options?: {
    visible?: boolean;
    hidden?: boolean;
    timeout?: number;
  }
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, {
      visible: options?.visible ?? true,
      hidden: options?.hidden ?? false,
      timeout: options?.timeout ?? 10000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 19.5: Click button by text content
 */
export async function clickButton(
  page: Page,
  text: string
): Promise<boolean> {
  try {
    // Try multiple selectors
    const clicked = await page.evaluate((buttonText) => {
      // Find by button text
      const buttons = Array.from(document.querySelectorAll('button'));
      let btn = buttons.find(b =>
        b.textContent?.trim().toLowerCase() === buttonText.toLowerCase()
      );

      // Find by partial match
      if (!btn) {
        btn = buttons.find(b =>
          b.textContent?.toLowerCase().includes(buttonText.toLowerCase())
        );
      }

      // Find by aria-label
      if (!btn) {
        btn = document.querySelector(`button[aria-label*="${buttonText}" i]`) as HTMLButtonElement;
      }

      // Find links styled as buttons
      if (!btn) {
        const links = Array.from(document.querySelectorAll('a[role="button"], a.btn, a.button'));
        const link = links.find(l =>
          l.textContent?.toLowerCase().includes(buttonText.toLowerCase())
        );
        if (link) {
          (link as HTMLElement).click();
          return true;
        }
      }

      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, text);

    return clicked;
  } catch (error) {
    console.error(`Failed to click button "${text}":`, error);
    return false;
  }
}

/**
 * 19.6: Fill input field
 */
export async function fillInput(
  page: Page,
  selector: string,
  value: string,
  options?: {
    clear?: boolean;
    delay?: number;
  }
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { visible: true, timeout: 5000 });

    const input = await page.$(selector);
    if (!input) return false;

    if (options?.clear !== false) {
      // Clear existing content
      await input.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
    }

    await input.type(value, { delay: options?.delay ?? 30 });
    return true;
  } catch (error) {
    console.error(`Failed to fill input "${selector}":`, error);
    return false;
  }
}

/**
 * 19.7: Select dropdown option
 */
export async function selectDropdown(
  page: Page,
  selector: string,
  value: string
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { visible: true, timeout: 5000 });

    // Check if it's a native select or custom dropdown
    const isNativeSelect = await page.evaluate(
      (sel) => document.querySelector(sel)?.tagName === 'SELECT',
      selector
    );

    if (isNativeSelect) {
      await page.select(selector, value);
    } else {
      // Handle custom dropdown (click to open, then click option)
      await page.click(selector);
      await delay(300); // Wait for dropdown to open

      // Click option by value or text
      const clicked = await page.evaluate((val) => {
        const options = document.querySelectorAll('[role="option"], [data-value], li');
        for (const opt of options) {
          if (
            (opt as HTMLElement).dataset.value === val ||
            opt.textContent?.toLowerCase().includes(val.toLowerCase())
          ) {
            (opt as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, value);

      return clicked;
    }

    return true;
  } catch (error) {
    console.error(`Failed to select dropdown "${selector}":`, error);
    return false;
  }
}

/**
 * Navigate to a page
 */
export async function navigateTo(
  page: Page,
  path: string
): Promise<boolean> {
  try {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    await page.goto(url, { waitUntil: 'networkidle2' });
    return true;
  } catch (error) {
    console.error(`Failed to navigate to "${path}":`, error);
    return false;
  }
}

/**
 * Wait for page load
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 30000 }
  );
}

/**
 * Get text content of element
 */
export async function getText(
  page: Page,
  selector: string
): Promise<string | null> {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return await page.$eval(selector, el => el.textContent?.trim() || null);
  } catch {
    return null;
  }
}

/**
 * Check if element exists
 */
export async function elementExists(
  page: Page,
  selector: string
): Promise<boolean> {
  const element = await page.$(selector);
  return element !== null;
}

/**
 * Check if element is visible
 */
export async function isVisible(
  page: Page,
  selector: string
): Promise<boolean> {
  try {
    const element = await page.$(selector);
    if (!element) return false;

    const isVisible = await page.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        el.offsetParent !== null
      );
    }, element);

    return isVisible;
  } catch {
    return false;
  }
}

/**
 * Wait for toast/notification message
 */
export async function waitForToast(
  page: Page,
  message?: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    // Common toast selectors
    const toastSelectors = [
      '[role="alert"]',
      '.toast',
      '.notification',
      '.Toastify__toast',
      '[data-sonner-toast]',
    ];

    for (const selector of toastSelectors) {
      const found = await waitForSelector(page, selector, { timeout: timeout / toastSelectors.length });
      if (found) {
        if (message) {
          const text = await getText(page, selector);
          if (text?.toLowerCase().includes(message.toLowerCase())) {
            return true;
          }
        } else {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Click element and wait for navigation
 */
export async function clickAndWait(
  page: Page,
  selector: string
): Promise<boolean> {
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click(selector),
    ]);
    return true;
  } catch (error) {
    console.error(`Failed to click and wait "${selector}":`, error);
    return false;
  }
}

/**
 * Close browser
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

/**
 * Get current URL
 */
export function getCurrentUrl(page: Page): string {
  return page.url();
}

/**
 * Reload page
 */
export async function reloadPage(page: Page): Promise<void> {
  await page.reload({ waitUntil: 'networkidle2' });
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  try {
    await page.waitForNetworkIdle({ timeout });
  } catch {
    // Ignore timeout
  }
}

export {
  BASE_URL,
  SCREENSHOT_DIR,
  browser,
  page,
};
