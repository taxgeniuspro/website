const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('Navigating to signin page...');
  await page.goto('https://taxgeniuspro.tax/auth/signin', { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for form to be ready
  await page.waitForSelector('#email', { timeout: 10000 });

  console.log('Filling in credentials...');
  await page.type('#email', 'whitegelisa@gmail.com');
  await page.type('#password', 'Makiyah07@@');

  console.log('Taking filled form screenshot...');
  await page.screenshot({ path: '/Users/irawatkins/.claude-worktrees/taxgeniuspro/blissful-wozniak/test-results/02-filled-form.png', fullPage: true });

  console.log('Clicking sign in button...');
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

  console.log('After login URL:', page.url());
  await page.screenshot({ path: '/Users/irawatkins/.claude-worktrees/taxgeniuspro/blissful-wozniak/test-results/03-after-login.png', fullPage: true });

  // Wait a bit for any additional redirects
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('After wait URL:', page.url());

  console.log('Navigating to tax preparer dashboard...');
  await page.goto('https://taxgeniuspro.tax/en/dashboard/tax-preparer', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Dashboard URL:', page.url());

  // Wait for sidebar to load
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Taking full dashboard screenshot...');
  await page.screenshot({ path: '/Users/irawatkins/.claude-worktrees/taxgeniuspro/blissful-wozniak/test-results/tax-preparer-sidebar.png', fullPage: true });

  // Get all navigation text
  const allText = await page.evaluate(() => {
    const items = [];

    // Try multiple selectors for navigation
    const selectors = [
      'nav a',
      '[role="navigation"] a',
      'aside a',
      'nav button',
      'aside button',
      '[data-sidebar] a',
      '.sidebar a',
      'nav [role="link"]',
      'aside [role="link"]'
    ];

    const seenTexts = new Set();

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent.trim();
        if (text && !seenTexts.has(text)) {
          seenTexts.add(text);
          items.push({
            selector: selector,
            text: text,
            href: el.href || 'no-href',
            visible: el.offsetParent !== null
          });
        }
      });
    });

    return items;
  });

  console.log('\n=== All Navigation Elements Found ===');
  allText.forEach(item => {
    console.log(`[${item.visible ? 'VISIBLE' : 'HIDDEN'}] ${item.text}`);
    console.log(`  Selector: ${item.selector}, Href: ${item.href}`);
  });

  // Check for specific expected items
  const expectedItems = ['My Clients', 'Client File Center', 'IRS Forms Library', 'Support Tickets', 'Calendar', 'Store'];
  console.log('\n=== Expected Navigation Items Status ===');
  expectedItems.forEach(expectedItem => {
    const found = allText.find(item => item.text.includes(expectedItem) && item.visible);
    if (found) {
      console.log(`[✓] ${expectedItem} - FOUND and VISIBLE`);
    } else {
      const foundHidden = allText.find(item => item.text.includes(expectedItem));
      if (foundHidden) {
        console.log(`[~] ${expectedItem} - FOUND but HIDDEN`);
      } else {
        console.log(`[✗] ${expectedItem} - NOT FOUND`);
      }
    }
  });

  // Get HTML of sidebar for debugging
  const sidebarHTML = await page.evaluate(() => {
    const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[data-sidebar]');
    return sidebar ? sidebar.outerHTML.substring(0, 2000) : 'No sidebar found';
  });

  console.log('\n=== Sidebar HTML (first 2000 chars) ===');
  console.log(sidebarHTML);

  await browser.close();
  console.log('\nTest completed!');
})();
