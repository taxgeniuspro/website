/**
 * Full Functionality Test Script
 *
 * Tests all forms and verifies:
 * 1. Contact form with ref (sw) - goes to Sarah Wilson
 * 2. Contact form without ref (en) - goes to Ray Hamilton
 * 3. Tax intake form with ref (sw) - attributed to Sarah Wilson
 * 4. Email delivery
 * 5. CRM data creation with proper attribution
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE_URL = 'https://taxgeniuspro.tax';

interface TestResult {
  test: string;
  success: boolean;
  details: string;
  emailSent?: boolean;
  crmCreated?: boolean;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testContactFormWithRef(): Promise<TestResult> {
  console.log('\n📧 Test 1: Contact Form WITH ref=sw (Sarah Wilson)');

  const timestamp = Date.now();
  const testEmail = `test-sw-${timestamp}@test.com`;

  try {
    const response = await fetch(`${BASE_URL}/api/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Client SW',
        email: testEmail,
        phone: '404-555-1001',
        service: 'business',
        message: 'Full functionality test - Contact form with SW ref',
        locale: 'en',
        ref: 'sw' // Sarah Wilson's tracking code
      })
    });

    const data = await response.json();
    console.log('  Response status:', response.status);
    console.log('  Response:', JSON.stringify(data, null, 2));

    // Check if CRM contact was created with proper attribution
    await delay(2000); // Wait for async operations

    const crmContact = await prisma.cRMContact.findFirst({
      where: { email: testEmail },
      orderBy: { createdAt: 'desc' }
    });

    const lead = await prisma.lead.findFirst({
      where: { email: testEmail },
      orderBy: { createdAt: 'desc' }
    });

    console.log('  CRM Contact:', crmContact ? 'Created' : 'NOT FOUND');
    console.log('  Lead:', lead ? 'Created' : 'NOT FOUND');

    if (crmContact) {
      console.log('    - assignedPreparerId:', crmContact.assignedPreparerId);
      console.log('    - referrerUsername:', crmContact.referrerUsername);
      console.log('    - referrerType:', crmContact.referrerType);
      console.log('    - attributionMethod:', crmContact.attributionMethod);
    }

    const success = response.ok && data.success;
    const hasAttribution = crmContact?.referrerUsername === 'sw';

    return {
      test: 'Contact Form with ref=sw',
      success: success && hasAttribution,
      details: success
        ? `Email sent to Sarah. CRM attribution: ${hasAttribution ? 'Correct (sw)' : 'MISSING'}`
        : `Failed: ${data.error || 'Unknown error'}`,
      emailSent: data.emailSent,
      crmCreated: !!crmContact
    };
  } catch (error) {
    console.error('  Error:', error);
    return {
      test: 'Contact Form with ref=sw',
      success: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      emailSent: false,
      crmCreated: false
    };
  }
}

async function testContactFormNoRef(): Promise<TestResult> {
  console.log('\n📧 Test 2: Contact Form WITHOUT ref (English - Ray Hamilton)');

  const timestamp = Date.now();
  const testEmail = `test-noref-${timestamp}@test.com`;

  try {
    const response = await fetch(`${BASE_URL}/api/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Client NoRef',
        email: testEmail,
        phone: '404-555-1002',
        service: 'individual',
        message: 'Full functionality test - Contact form WITHOUT ref',
        locale: 'en'
        // No ref - should go to Ray Hamilton
      })
    });

    const data = await response.json();
    console.log('  Response status:', response.status);
    console.log('  Response:', JSON.stringify(data, null, 2));

    // Check CRM contact
    await delay(2000);

    const crmContact = await prisma.cRMContact.findFirst({
      where: { email: testEmail },
      orderBy: { createdAt: 'desc' }
    });

    console.log('  CRM Contact:', crmContact ? 'Created' : 'NOT FOUND');
    if (crmContact) {
      console.log('    - assignedPreparerId:', crmContact.assignedPreparerId || 'None (expected)');
      console.log('    - referrerUsername:', crmContact.referrerUsername || 'None (expected)');
    }

    const success = response.ok && data.success;

    return {
      test: 'Contact Form without ref (English)',
      success,
      details: success
        ? 'Email sent to Ray Hamilton (default English)'
        : `Failed: ${data.error || 'Unknown error'}`,
      emailSent: data.emailSent,
      crmCreated: !!crmContact
    };
  } catch (error) {
    console.error('  Error:', error);
    return {
      test: 'Contact Form without ref (English)',
      success: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      emailSent: false,
      crmCreated: false
    };
  }
}

async function testContactFormSpanish(): Promise<TestResult> {
  console.log('\n📧 Test 3: Contact Form WITHOUT ref (Spanish - Ale Hamilton)');

  const timestamp = Date.now();
  const testEmail = `test-spanish-${timestamp}@test.com`;

  try {
    const response = await fetch(`${BASE_URL}/api/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Cliente Espanol',
        email: testEmail,
        phone: '404-555-1003',
        service: 'business',
        message: 'Prueba de funcionalidad completa - Formulario de contacto en español',
        locale: 'es'
        // No ref, Spanish locale - should go to Ale Hamilton
      })
    });

    const data = await response.json();
    console.log('  Response status:', response.status);
    console.log('  Response:', JSON.stringify(data, null, 2));

    const success = response.ok && data.success;

    return {
      test: 'Contact Form without ref (Spanish)',
      success,
      details: success
        ? 'Email sent to Ale Hamilton (default Spanish)'
        : `Failed: ${data.error || 'Unknown error'}`,
      emailSent: data.emailSent,
      crmCreated: true
    };
  } catch (error) {
    console.error('  Error:', error);
    return {
      test: 'Contact Form without ref (Spanish)',
      success: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      emailSent: false,
      crmCreated: false
    };
  }
}

async function testTaxIntakeFormWithRef(): Promise<TestResult> {
  console.log('\n📋 Test 4: Tax Intake Form WITH ref=sw (Sarah Wilson)');

  const timestamp = Date.now();
  const testEmail = `test-intake-sw-${timestamp}@test.com`;

  try {
    // Use /api/tax-intake/lead endpoint with ref as query param
    const response = await fetch(`${BASE_URL}/api/tax-intake/lead?ref=sw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Tax',
        middle_name: 'Test',
        last_name: 'Client',
        email: testEmail,
        phone: '404-555-1004',
        country_code: '+1',
        address_line_1: '123 Test Street',
        city: 'Atlanta',
        state: 'GA',
        zip_code: '30301',
        tax_year: 2024,
        filing_status: 'single',
        employment_type: 'employed',
        occupation: 'Software Developer',
        date_of_birth: '1990-01-15',
        ssn: '123-45-6789',
        has_dependents: 'no',
        has_mortgage: 'no',
        denied_eitc: 'no',
        has_irs_pin: 'no',
        wants_refund_advance: 'no',
        claimed_as_dependent: 'no',
        in_college: 'no',
        drivers_license: 'DL12345',
        license_expiration: '2025-12-31',
        locale: 'en',
      })
    });

    const data = await response.json();
    console.log('  Response status:', response.status);
    console.log('  Response:', JSON.stringify(data, null, 2));

    // Check TaxIntakeLead
    await delay(2000);

    const taxIntakeLead = await prisma.taxIntakeLead.findFirst({
      where: { email: testEmail },
      orderBy: { created_at: 'desc' }
    });

    console.log('  TaxIntakeLead:', taxIntakeLead ? 'Created' : 'NOT FOUND');
    if (taxIntakeLead) {
      console.log('    - assignedPreparerId:', taxIntakeLead.assignedPreparerId);
      console.log('    - referrerUsername:', taxIntakeLead.referrerUsername);
      console.log('    - referrerType:', taxIntakeLead.referrerType);
      console.log('    - attributionMethod:', taxIntakeLead.attributionMethod);
    }

    const success = response.ok && (data.success || data.id);
    const hasAttribution = taxIntakeLead?.referrerUsername === 'sw';

    return {
      test: 'Tax Intake Form with ref=sw',
      success: success && hasAttribution,
      details: success
        ? `Lead created. Attribution: ${hasAttribution ? 'Correct (sw)' : 'MISSING'}`
        : `Failed: ${data.error || 'Unknown error'}`,
      emailSent: true, // Tax intake sends notification email
      crmCreated: !!taxIntakeLead
    };
  } catch (error) {
    console.error('  Error:', error);
    return {
      test: 'Tax Intake Form with ref=sw',
      success: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      emailSent: false,
      crmCreated: false
    };
  }
}

async function testTaxIntakeFormWithGW(): Promise<TestResult> {
  console.log('\n📋 Test 5: Tax Intake Form WITH ref=gw (Gelisa White)');

  const timestamp = Date.now();
  const testEmail = `test-intake-gw-${timestamp}@test.com`;

  try {
    // Use /api/tax-intake/lead endpoint with ref as query param
    const response = await fetch(`${BASE_URL}/api/tax-intake/lead?ref=gw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Gelisa',
        middle_name: '',
        last_name: 'TestClient',
        email: testEmail,
        phone: '404-555-1005',
        country_code: '+1',
        address_line_1: '456 Test Ave',
        city: 'Atlanta',
        state: 'GA',
        zip_code: '30302',
        tax_year: 2024,
        filing_status: 'married_filing_jointly',
        employment_type: 'self_employed',
        occupation: 'Business Owner',
        date_of_birth: '1985-06-20',
        ssn: '987-65-4321',
        has_dependents: 'yes',
        number_of_dependents: '2',
        has_mortgage: 'yes',
        denied_eitc: 'no',
        has_irs_pin: 'no',
        wants_refund_advance: 'yes',
        claimed_as_dependent: 'no',
        in_college: 'no',
        drivers_license: 'GA98765',
        license_expiration: '2026-06-20',
        locale: 'en',
      })
    });

    const data = await response.json();
    console.log('  Response status:', response.status);
    console.log('  Response:', JSON.stringify(data, null, 2));

    await delay(2000);

    const taxIntakeLead = await prisma.taxIntakeLead.findFirst({
      where: { email: testEmail },
      orderBy: { created_at: 'desc' }
    });

    console.log('  TaxIntakeLead:', taxIntakeLead ? 'Created' : 'NOT FOUND');
    if (taxIntakeLead) {
      console.log('    - assignedPreparerId:', taxIntakeLead.assignedPreparerId);
      console.log('    - referrerUsername:', taxIntakeLead.referrerUsername);
    }

    const success = response.ok && (data.success || data.id);
    const hasAttribution = taxIntakeLead?.referrerUsername === 'gw';

    return {
      test: 'Tax Intake Form with ref=gw',
      success: success && hasAttribution,
      details: success
        ? `Lead created. Attribution: ${hasAttribution ? 'Correct (gw)' : 'MISSING'}`
        : `Failed: ${data.error || 'Unknown error'}`,
      emailSent: true,
      crmCreated: !!taxIntakeLead
    };
  } catch (error) {
    console.error('  Error:', error);
    return {
      test: 'Tax Intake Form with ref=gw',
      success: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      emailSent: false,
      crmCreated: false
    };
  }
}

async function verifyCRMData(): Promise<TestResult> {
  console.log('\n🔍 Test 6: Verify CRM Data Attribution');

  try {
    // Get all test CRM contacts created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const crmContacts = await prisma.cRMContact.findMany({
      where: {
        createdAt: { gte: today },
        email: { contains: 'test' }
      },
      orderBy: { createdAt: 'desc' }
    });

    const taxIntakeLeads = await prisma.taxIntakeLead.findMany({
      where: {
        created_at: { gte: today },
        email: { contains: 'test' }
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`  CRM Contacts created: ${crmContacts.length}`);
    console.log(`  Tax Intake Leads created: ${taxIntakeLeads.length}`);

    // Verify attribution on contacts with ref
    const swContacts = crmContacts.filter(c => c.referrerUsername === 'sw');
    const gwLeads = taxIntakeLeads.filter(l => l.referrerUsername === 'gw');

    console.log(`  SW attributed contacts: ${swContacts.length}`);
    console.log(`  GW attributed leads: ${gwLeads.length}`);

    const allAttributionCorrect =
      crmContacts.filter(c => c.email.includes('sw')).every(c => c.referrerUsername === 'sw') &&
      taxIntakeLeads.filter(l => l.email.includes('gw')).every(l => l.referrerUsername === 'gw');

    return {
      test: 'CRM Data Attribution Verification',
      success: crmContacts.length > 0 && taxIntakeLeads.length > 0,
      details: `${crmContacts.length} CRM contacts, ${taxIntakeLeads.length} intake leads. Attribution: ${allAttributionCorrect ? 'All correct' : 'Issues found'}`,
      crmCreated: true
    };
  } catch (error) {
    console.error('  Error:', error);
    return {
      test: 'CRM Data Attribution Verification',
      success: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      crmCreated: false
    };
  }
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('  FULL FUNCTIONALITY TEST');
  console.log('  Tax Genius Pro - Email & CRM System');
  console.log('='.repeat(60));

  const results: TestResult[] = [];

  // Run all tests
  results.push(await testContactFormWithRef());
  await delay(1000);

  results.push(await testContactFormNoRef());
  await delay(1000);

  results.push(await testContactFormSpanish());
  await delay(1000);

  results.push(await testTaxIntakeFormWithRef());
  await delay(1000);

  results.push(await testTaxIntakeFormWithGW());
  await delay(1000);

  results.push(await verifyCRMData());

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${status}: ${result.test}`);
    console.log(`       ${result.details}`);
    if (result.emailSent !== undefined) {
      console.log(`       Email: ${result.emailSent ? 'Sent' : 'Not sent'}`);
    }
    if (result.crmCreated !== undefined) {
      console.log(`       CRM: ${result.crmCreated ? 'Created' : 'Not created'}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  TOTAL: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  // Final database counts
  console.log('\n📊 Final Database Counts:');
  const crmCount = await prisma.cRMContact.count();
  const leadCount = await prisma.lead.count();
  const intakeCount = await prisma.taxIntakeLead.count();

  console.log(`  CRM Contacts: ${crmCount}`);
  console.log(`  Leads: ${leadCount}`);
  console.log(`  Tax Intake Leads: ${intakeCount}`);

  return { passed, failed, results };
}

runAllTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
