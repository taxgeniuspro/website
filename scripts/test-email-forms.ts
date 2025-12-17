import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testContactForm() {
  console.log('=== Testing Contact Form via sw-lead ===\n');

  const timestamp = Date.now();
  const testEmail = `test-sw-${timestamp}@example.com`;
  const testData = {
    name: 'Test Client SW',
    email: testEmail,
    phone: '404-555-1234',
    service: 'business',
    message: 'This is a test message to verify the contact form is working correctly with Sarah Wilson\'s referral link (sw-lead).',
    locale: 'en',
    ref: 'sw'  // Sarah Wilson's tracking code
  };

  console.log('Submitting contact form with data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n');

  try {
    const response = await fetch('https://taxgeniuspro.tax/api/contact/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('API Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Contact form submitted successfully!');
      console.log('Contact ID:', result.contactId);

      // Wait a moment for DB to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check CRM contact
      const crmContact = await prisma.cRMContact.findUnique({
        where: { email: testEmail.toLowerCase() },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          source: true,
          assignedPreparerId: true,
          referrerUsername: true,
          referrerType: true,
          attributionMethod: true,
        }
      });

      console.log('\n=== CRM Contact Record ===');
      console.log(JSON.stringify(crmContact, null, 2));

      if (crmContact?.assignedPreparerId) {
        // Get preparer info
        const preparer = await prisma.user.findUnique({
          where: { id: crmContact.assignedPreparerId },
          select: { name: true, email: true }
        });
        console.log('\n=== Assigned Preparer ===');
        console.log('Name:', preparer?.name);
        console.log('Email:', preparer?.email);
        console.log('\n📧 Email should have been sent to:', preparer?.email);
      }

      // Check CRM interaction
      const interaction = await prisma.cRMInteraction.findFirst({
        where: { contactId: crmContact?.id },
        orderBy: { createdAt: 'desc' },
        select: {
          subject: true,
          body: true,
          occurredAt: true,
        }
      });

      console.log('\n=== CRM Interaction Log ===');
      console.log('Subject:', interaction?.subject);
      console.log('Body:', interaction?.body?.substring(0, 500) + '...');

    } else {
      console.log('\n❌ Contact form submission failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testNoRefForm() {
  console.log('\n\n=== Testing Contact Form WITHOUT ref (should go to Ray/Ale) ===\n');

  const timestamp = Date.now();
  const testEmail = `test-noref-${timestamp}@example.com`;
  const testData = {
    name: 'Test Client NoRef',
    email: testEmail,
    phone: '404-555-5678',
    service: 'individual',
    message: 'This is a test without any referral code - should route to Ray Hamilton.',
    locale: 'en'
    // No ref parameter
  };

  console.log('Submitting contact form without ref:');
  console.log(JSON.stringify(testData, null, 2));

  try {
    const response = await fetch('https://taxgeniuspro.tax/api/contact/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('\nAPI Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Form submitted successfully!');
      console.log('📧 Email should have been sent to: taxgenius.taxes@gmail.com (Ray Hamilton)');
      console.log('📧 CC to: taxgenius.tax@gmail.com (Owliver Owl)');

      // Check CRM contact
      await new Promise(resolve => setTimeout(resolve, 1000));
      const crmContact = await prisma.cRMContact.findUnique({
        where: { email: testEmail.toLowerCase() },
        select: {
          assignedPreparerId: true,
          referrerUsername: true,
          attributionMethod: true,
        }
      });

      console.log('\n=== CRM Attribution ===');
      console.log('Assigned Preparer:', crmContact?.assignedPreparerId || 'None (corporate)');
      console.log('Referrer:', crmContact?.referrerUsername || 'None');
      console.log('Method:', crmContact?.attributionMethod || 'Direct');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  try {
    await testContactForm();
    await testNoRefForm();
  } finally {
    await prisma.$disconnect();
  }
}

main();
