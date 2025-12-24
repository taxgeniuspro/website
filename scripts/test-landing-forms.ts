/**
 * Test script to submit forms on the landing page
 * Creates 2 "I want an advance" (cash advance) submissions
 * Creates 2 "Just file my taxes" (early lead capture) submissions
 *
 * Usage: RESEND_API_KEY="xxx" npx tsx scripts/test-landing-forms.ts
 */

const BASE_URL = 'https://taxgeniuspro.tax';
const REF_CODE = 'gw'; // Gelisa White's ref code

interface CashAdvanceFormData {
  firstName: string;
  phone: string;
  email?: string;
  zipCode: string;
  preferredFiling: 'in-person' | 'remote';
  bestTimeToContact: string;
  consent: boolean;
  locale: string;
  ref: string;
}

interface EarlyLeadFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  zip_code: string;
  locale: string;
  ref?: string;
}

// Test data for cash advance forms (2 submissions)
const cashAdvanceTests: CashAdvanceFormData[] = [
  {
    firstName: 'TestAdvance',
    phone: '4045551001',
    email: 'testadvance1@test.taxgeniuspro.tax',
    zipCode: '30301',
    preferredFiling: 'in-person',
    bestTimeToContact: 'Morning (9am-12pm)',
    consent: true,
    locale: 'en',
    ref: REF_CODE,
  },
  {
    firstName: 'TestAdvance2',
    phone: '4045551002',
    email: 'testadvance2@test.taxgeniuspro.tax',
    zipCode: '30302',
    preferredFiling: 'remote',
    bestTimeToContact: 'Afternoon (12pm-5pm)',
    consent: true,
    locale: 'en',
    ref: REF_CODE,
  },
];

// Test data for early lead capture (Just file my taxes) - 2 submissions
const earlyLeadTests: EarlyLeadFormData[] = [
  {
    first_name: 'TestFiling',
    last_name: 'One',
    email: 'testfiling1@test.taxgeniuspro.tax',
    phone: '4045552001',
    zip_code: '30303',
    locale: 'en',
    ref: REF_CODE,
  },
  {
    first_name: 'TestFiling',
    last_name: 'Two',
    email: 'testfiling2@test.taxgeniuspro.tax',
    phone: '4045552002',
    zip_code: '30304',
    locale: 'en',
    ref: REF_CODE,
  },
];

async function submitCashAdvance(data: CashAdvanceFormData, index: number) {
  console.log(`\n📤 Submitting Cash Advance form #${index + 1}...`);
  console.log(`   Name: ${data.firstName}`);
  console.log(`   Phone: ${data.phone}`);
  console.log(`   Ref: ${data.ref}`);

  try {
    const response = await fetch(`${BASE_URL}/api/cash-advance/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success! Contact ID: ${result.contactId}`);
      return { success: true, contactId: result.contactId };
    } else {
      console.log(`   ❌ Error: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error}`);
    return { success: false, error: String(error) };
  }
}

async function submitEarlyLead(data: EarlyLeadFormData, index: number) {
  console.log(`\n📤 Submitting Early Lead (Filing) form #${index + 1}...`);
  console.log(`   Name: ${data.first_name} ${data.last_name}`);
  console.log(`   Email: ${data.email}`);
  console.log(`   Ref: ${data.ref}`);

  try {
    const response = await fetch(`${BASE_URL}/api/landing/early-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success! Contact ID: ${result.contactId}`);
      return { success: true, contactId: result.contactId };
    } else {
      console.log(`   ❌ Error: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error}`);
    return { success: false, error: String(error) };
  }
}

async function runTests() {
  console.log('🧪 Starting Landing Page Form Tests');
  console.log('====================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Ref Code: ${REF_CODE} (Gelisa White)`);

  const results = {
    cashAdvance: { success: 0, failed: 0 },
    earlyLead: { success: 0, failed: 0 },
  };

  // Test Cash Advance forms (I want an advance)
  console.log('\n\n📋 TESTING: "I want an advance" Forms (Cash Advance)');
  console.log('─'.repeat(50));

  for (let i = 0; i < cashAdvanceTests.length; i++) {
    const result = await submitCashAdvance(cashAdvanceTests[i], i);
    if (result.success) {
      results.cashAdvance.success++;
    } else {
      results.cashAdvance.failed++;
    }
    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Test Early Lead forms (Just file my taxes)
  console.log('\n\n📋 TESTING: "Just file my taxes" Forms (Early Lead Capture)');
  console.log('─'.repeat(50));

  for (let i = 0; i < earlyLeadTests.length; i++) {
    const result = await submitEarlyLead(earlyLeadTests[i], i);
    if (result.success) {
      results.earlyLead.success++;
    } else {
      results.earlyLead.failed++;
    }
    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n\n📊 TEST RESULTS SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Cash Advance Forms: ${results.cashAdvance.success}/${cashAdvanceTests.length} successful`);
  console.log(`Early Lead Forms: ${results.earlyLead.success}/${earlyLeadTests.length} successful`);
  console.log('═'.repeat(50));

  const totalSuccess = results.cashAdvance.success + results.earlyLead.success;
  const totalTests = cashAdvanceTests.length + earlyLeadTests.length;

  if (totalSuccess === totalTests) {
    console.log('✅ All tests passed!');
  } else {
    console.log(`⚠️ ${totalTests - totalSuccess} test(s) failed`);
  }
}

runTests().catch(console.error);
