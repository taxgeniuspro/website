/**
 * Dashboard Screenshot Capture Script
 *
 * Captures screenshots of admin and preparer dashboards to verify
 * analytics data is displaying correctly.
 *
 * Run: npx tsx scripts/capture-dashboard-screenshots.ts
 *
 * Note: Requires login credentials in environment or command line
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { resolve } from 'path';
import * as fs from 'fs';

const BASE_URL = 'https://taxgeniuspro.tax';
const RESULTS_DIR = resolve(__dirname, '../test-results/analytics/dashboards');

// Credentials from environment or defaults
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'iradwatkins@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const PREPARER_EMAIL = process.env.PREPARER_EMAIL || 'taxgenius.tax@gmail.com'; // Owliver
const PREPARER_PASSWORD = process.env.PREPARER_PASSWORD || '';

interface ScreenshotTask {
  name: string;
  url: string;
  role: 'admin' | 'preparer';
  waitFor?: string; // CSS selector to wait for
  delay?: number; // Additional delay after page load
}

const SCREENSHOT_TASKS: ScreenshotTask[] = [
  // Admin Dashboard Screenshots
  {
    name: 'admin-dashboard-overview',
    url: '/en/dashboard/admin',
    role: 'admin',
    waitFor: '[data-testid="dashboard"], .dashboard, main',
    delay: 2000,
  },
  {
    name: 'admin-analytics-overview',
    url: '/en/dashboard/admin/analytics',
    role: 'admin',
    waitFor: '[data-testid="analytics"], .analytics, main',
    delay: 3000,
  },
  {
    name: 'admin-users-list',
    url: '/en/dashboard/admin/users',
    role: 'admin',
    waitFor: 'table, [data-testid="users-list"]',
    delay: 2000,
  },
  {
    name: 'admin-preparer-applications',
    url: '/en/dashboard/admin/applications',
    role: 'admin',
    waitFor: 'table, [data-testid="applications"]',
    delay: 2000,
  },

  // Preparer Dashboard Screenshots
  {
    name: 'preparer-dashboard-overview',
    url: '/en/dashboard/tax-preparer',
    role: 'preparer',
    waitFor: '[data-testid="dashboard"], .dashboard, main',
    delay: 2000,
  },
  {
    name: 'preparer-analytics',
    url: '/en/dashboard/tax-preparer/analytics',
    role: 'preparer',
    waitFor: '[data-testid="analytics"], .analytics, main',
    delay: 3000,
  },
  {
    name: 'preparer-clients',
    url: '/en/dashboard/tax-preparer/clients',
    role: 'preparer',
    waitFor: 'table, [data-testid="clients-list"]',
    delay: 2000,
  },
  {
    name: 'preparer-marketing',
    url: '/en/dashboard/tax-preparer/marketing',
    role: 'preparer',
    waitFor: '[data-testid="marketing"], .marketing, main',
    delay: 2000,
  },
];

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const icons = { info: '📋', success: '✅', error: '❌', warn: '⚠️' };
  console.log(`${icons[type]} ${message}`);
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(page: Page, email: string, password: string): Promise<boolean> {
  try {
    log(`Logging in as ${email}...`, 'info');

    await page.goto(`${BASE_URL}/en/auth/signin`, { waitUntil: 'networkidle2' });
    await delay(2000);

    // Fill in email
    await page.type('input[name="email"], input[type="email"]', email);
    await page.type('input[name="password"], input[type="password"]', password);

    // Click submit
    await page.click('button[type="submit"]');
    await delay(5000);

    // Check if we're redirected to dashboard
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      log(`Login successful, redirected to: ${currentUrl}`, 'success');
      return true;
    } else {
      log(`Login may have failed, current URL: ${currentUrl}`, 'warn');
      return false;
    }
  } catch (error) {
    log(`Login failed: ${error}`, 'error');
    return false;
  }
}

async function captureScreenshot(page: Page, task: ScreenshotTask): Promise<string | null> {
  try {
    log(`Capturing: ${task.name}`, 'info');

    await page.goto(`${BASE_URL}${task.url}`, { waitUntil: 'networkidle2' });

    // Wait for specific element if specified
    if (task.waitFor) {
      try {
        await page.waitForSelector(task.waitFor, { timeout: 10000 });
      } catch {
        log(`  Warning: Could not find ${task.waitFor}`, 'warn');
      }
    }

    // Additional delay
    if (task.delay) {
      await delay(task.delay);
    }

    // Take screenshot
    const filename = `${task.name}-${Date.now()}.png`;
    const filepath = resolve(RESULTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });

    log(`  Saved: ${filename}`, 'success');
    return filename;
  } catch (error) {
    log(`  Failed to capture ${task.name}: ${error}`, 'error');
    return null;
  }
}

async function captureApiData(page: Page): Promise<void> {
  log('\nCapturing API data...', 'info');

  const apiEndpoints = [
    '/api/admin/analytics/overview',
    '/api/admin/analytics/top-performers?category=all',
    '/api/analytics/source-breakdown',
  ];

  for (const endpoint of apiEndpoints) {
    try {
      const response = await page.goto(`${BASE_URL}${endpoint}`, { waitUntil: 'networkidle2' });
      const data = await response?.json();

      const filename = endpoint.replace(/\//g, '-').replace(/\?/g, '_') + '.json';
      const filepath = resolve(RESULTS_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

      log(`  Saved API data: ${filename}`, 'success');
    } catch (error) {
      log(`  Failed to fetch ${endpoint}: ${error}`, 'warn');
    }
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  DASHBOARD SCREENSHOT CAPTURE');
  console.log('='.repeat(60) + '\n');

  if (!ADMIN_PASSWORD || !PREPARER_PASSWORD) {
    console.log(`
Usage: Set environment variables before running:

  ADMIN_EMAIL=iradwatkins@gmail.com \\
  ADMIN_PASSWORD=your_password \\
  PREPARER_EMAIL=taxgenius.tax@gmail.com \\
  PREPARER_PASSWORD=preparer_password \\
  npx tsx scripts/capture-dashboard-screenshots.ts

Or run without login to capture public pages only.
    `);

    // Still run but skip login-required pages
    log('Running in unauthenticated mode (limited screenshots)', 'warn');
  }

  ensureDir(RESULTS_DIR);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results: { task: string; filename: string | null; role: string }[] = [];

  try {
    // Admin screenshots
    if (ADMIN_PASSWORD) {
      const adminPage = await browser.newPage();
      await adminPage.setViewport({ width: 1920, height: 1080 });

      const adminLoggedIn = await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);

      if (adminLoggedIn) {
        for (const task of SCREENSHOT_TASKS.filter(t => t.role === 'admin')) {
          const filename = await captureScreenshot(adminPage, task);
          results.push({ task: task.name, filename, role: 'admin' });
        }

        // Also capture API data while logged in as admin
        await captureApiData(adminPage);
      }

      await adminPage.close();
    }

    // Preparer screenshots
    if (PREPARER_PASSWORD) {
      const preparerPage = await browser.newPage();
      await preparerPage.setViewport({ width: 1920, height: 1080 });

      const preparerLoggedIn = await login(preparerPage, PREPARER_EMAIL, PREPARER_PASSWORD);

      if (preparerLoggedIn) {
        for (const task of SCREENSHOT_TASKS.filter(t => t.role === 'preparer')) {
          const filename = await captureScreenshot(preparerPage, task);
          results.push({ task: task.name, filename, role: 'preparer' });
        }
      }

      await preparerPage.close();
    }

    // Public pages (no login required)
    const publicPage = await browser.newPage();
    await publicPage.setViewport({ width: 1920, height: 1080 });

    const publicPages = [
      { name: 'homepage', url: '/en' },
      { name: 'contact-page', url: '/en/contact' },
      { name: 'career-atlanta-en', url: '/en/careers/tax-preparer/atlanta-ga' },
      { name: 'career-atlanta-es', url: '/es/careers/tax-preparer/atlanta-ga' },
      { name: 'preparer-start', url: '/en/preparer/start' },
    ];

    for (const pg of publicPages) {
      try {
        await publicPage.goto(`${BASE_URL}${pg.url}`, { waitUntil: 'networkidle2' });
        await delay(2000);
        const filename = `${pg.name}-${Date.now()}.png`;
        await publicPage.screenshot({ path: resolve(RESULTS_DIR, filename), fullPage: true });
        results.push({ task: pg.name, filename, role: 'public' });
        log(`Captured: ${pg.name}`, 'success');
      } catch (error) {
        log(`Failed to capture ${pg.name}: ${error}`, 'error');
        results.push({ task: pg.name, filename: null, role: 'public' });
      }
    }

    await publicPage.close();

  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('  SCREENSHOT SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.filename !== null).length;
  const failed = results.filter(r => r.filename === null).length;

  console.log(`  Total: ${results.length}`);
  console.log(`  ✅ Captured: ${successful}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📁 Output: ${RESULTS_DIR}`);
  console.log('='.repeat(60) + '\n');

  // Generate index HTML
  const indexHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Dashboard Screenshots</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; }
    .card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .card img { width: 100%; height: auto; }
    .card h3 { padding: 10px; margin: 0; font-size: 14px; background: #f8f9fa; }
  </style>
</head>
<body>
  <h1>Dashboard Screenshots - ${new Date().toLocaleDateString()}</h1>
  <div class="grid">
    ${results.filter(r => r.filename).map(r => `
    <div class="card">
      <h3>${r.task} (${r.role})</h3>
      <img src="${r.filename}" alt="${r.task}">
    </div>
    `).join('')}
  </div>
</body>
</html>
  `;

  fs.writeFileSync(resolve(RESULTS_DIR, 'index.html'), indexHtml);
  log(`Index page: ${RESULTS_DIR}/index.html`, 'info');
}

main().catch(console.error);
