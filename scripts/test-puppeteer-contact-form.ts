import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function testContactForm() {
  console.log('Starting Puppeteer test for contact form...\n');

  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the contact form with ref=ow
    const url = 'https://taxgeniuspro.tax/contact?ref=ow';
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait a bit for page to fully load
    await wait(2000);

    console.log('Page loaded. Looking for form fields...\n');

    // Fill out the form
    const testData = {
      name: 'Puppeteer Test',
      email: 'puppeteer.test@example.com',
      phone: '555-123-4567',
      service: 'individual',
      message: 'This is a test submission from Puppeteer automation to verify CRM integration.',
    };

    // Try to find and fill form fields
    console.log('Filling form with test data:');
    console.log(JSON.stringify(testData, null, 2));

    // Wait for form to be visible
    await page.waitForSelector('form', { timeout: 10000 });

    // Fill in the form fields
    await page.type('input[name="name"]', testData.name);
    await page.type('input[name="email"]', testData.email);
    await page.type('input[name="phone"]', testData.phone);
    await page.select('select[name="service"]', testData.service);
    await page.type('textarea[name="message"]', testData.message);

    console.log('\nForm filled successfully.');

    // Take a screenshot before submission
    await page.screenshot({ path: '/tmp/contact-form-before-submit.png', fullPage: true });
    console.log('Screenshot saved: /tmp/contact-form-before-submit.png');

    // Submit the form
    console.log('\nSubmitting form...');

    // Click submit button
    await page.click('button[type="submit"]');

    // Wait for either navigation or success message
    try {
      // Wait for a success indicator (adjust selector based on your actual success message)
      await page.waitForSelector('[class*="success"], [class*="Success"]', { timeout: 10000 });
      console.log('Success message displayed!');
    } catch (error) {
      console.log('No success message found, checking for navigation...');
    }

    console.log('Form submitted!');

    // Wait for backend to process
    await wait(3000);

    // Take a screenshot after submission
    await page.screenshot({ path: '/tmp/contact-form-after-submit.png', fullPage: true });
    console.log('Screenshot saved: /tmp/contact-form-after-submit.png');

    // Now check the database for the CRM contact
    console.log('\nChecking database for CRM contact...');

    const crmContact = await prisma.cRMContact.findFirst({
      where: {
        email: testData.email,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (crmContact) {
      console.log('\n✅ SUCCESS! CRM Contact created:');
      console.log(JSON.stringify(crmContact, null, 2));
    } else {
      console.log('\n❌ FAILED! CRM Contact not found in database');
    }

    // Check for CRM interactions
    const interactions = await prisma.cRMInteraction.findMany({
      where: {
        contact: {
          email: testData.email,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    if (interactions.length > 0) {
      console.log('\n✅ CRM Interactions found:');
      console.log(JSON.stringify(interactions, null, 2));
    } else {
      console.log('\n⚠️  No CRM interactions found');
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

testContactForm()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
