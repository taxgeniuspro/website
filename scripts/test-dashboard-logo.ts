import puppeteer from 'puppeteer';

async function testDashboardLogo() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Go to signin page
    console.log('1. Navigating to signin page...');
    await page.goto('https://taxgeniuspro.tax/en/auth/signin', { waitUntil: 'networkidle2' });
    
    // Take screenshot of signin page
    await page.screenshot({ path: 'test-results/01-signin-page.png' });
    console.log('Screenshot saved: test-results/01-signin-page.png');
    
    // Fill in the email field for regular login (not magic link)
    console.log('2. Filling in credentials...');
    
    // Find the email input in the form section (not magic link)
    const emailInputs = await page.$$('input[type="email"]');
    if (emailInputs.length >= 1) {
      // The second email input is in the login form
      const formEmailInput = await page.$('#email');
      if (formEmailInput) {
        await formEmailInput.type('whitegelisa@gmail.com');
      } else {
        await emailInputs[0].type('whitegelisa@gmail.com');
      }
    }
    
    // Fill password
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.type('Makiyah07@@');
    }
    
    // Take screenshot before submit
    await page.screenshot({ path: 'test-results/02-filled-form.png' });
    console.log('Screenshot saved: test-results/02-filled-form.png');
    
    // Click the Sign In button (the submit button in the form)
    console.log('3. Clicking sign in...');
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    }
    
    // Wait for navigation or error
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('4. Current URL:', page.url());
    
    // Take screenshot after submit
    await page.screenshot({ path: 'test-results/03-after-submit.png' });
    console.log('Screenshot saved: test-results/03-after-submit.png');
    
    // Check for any error messages
    const errorText = await page.$eval('.text-destructive, [role="alert"]', el => el.textContent).catch(() => null);
    if (errorText) {
      console.log('Error message:', errorText);
    }
    
    // Check for logos
    const logos = await page.$$eval('img', imgs => 
      imgs.filter(img => img.src.includes('logo') || img.alt.toLowerCase().includes('tax genius')).map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.offsetWidth,
        height: img.offsetHeight,
        visible: img.offsetWidth > 0 && img.offsetHeight > 0
      }))
    );
    console.log('Logos found:', JSON.stringify(logos, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testDashboardLogo();
