/**
 * API-based Form Testing Script
 * Tests form submission APIs directly
 */

const BASE_URL = 'https://taxgeniuspro.tax';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
}

const results: TestResult[] = [];

async function testContactFormAPI() {
  console.log('\n=== TEST 1: CONTACT FORM API ===');

  const payload = {
    name: 'Test Contact User',
    email: 'ira@irawatkins.com',
    phone: '555-123-4567',
    service: 'personal',
    message: 'Testing contact form with ref=ow attribution',
    ref: 'ow' // Simulating ref from URL
  };

  try {
    const response = await fetch(`${BASE_URL}/api/contact/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': '__tgp_ref=ow' // Simulate ref cookie
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      results.push({ test: 'Contact Form API', status: 'PASS', details: 'Form submitted successfully' });
    } else {
      results.push({ test: 'Contact Form API', status: 'FAIL', details: data.error || 'Unknown error' });
    }
  } catch (error) {
    console.error('Error:', error);
    results.push({ test: 'Contact Form API', status: 'FAIL', details: String(error) });
  }
}

async function testCashAdvanceAPI() {
  console.log('\n=== TEST 2: CASH ADVANCE FORM API ===');

  const payload = {
    first_name: 'Test',
    phone: '555-234-5678',
    email: 'ira@irawatkins.com',
    zip: '30301',
    filing_preference: 'remote',
    best_time: 'morning',
    ref: 'ow'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/preseason/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': '__tgp_ref=ow'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      results.push({ test: 'Cash Advance API', status: 'PASS', details: 'Form submitted' });
    } else {
      results.push({ test: 'Cash Advance API', status: 'FAIL', details: data.error || 'Unknown error' });
    }
  } catch (error) {
    console.error('Error:', error);
    results.push({ test: 'Cash Advance API', status: 'FAIL', details: String(error) });
  }
}

async function testTaxIntakeLeadAPI() {
  console.log('\n=== TEST 3: TAX INTAKE LEAD API (Partial Save) ===');

  const payload = {
    tax_year: 2024,
    first_name: 'Test',
    last_name: 'Intake',
    email: 'ira@irawatkins.com',
    phone: '555-345-6789',
    address_line_1: '123 Test St',
    city: 'Atlanta',
    state: 'GA',
    zip_code: '30301',
    country_code: 'US',
    ref: 'ow'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/tax-intake/lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': '__tgp_ref=ow'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      results.push({ test: 'Tax Intake Lead API', status: 'PASS', details: `Lead ID: ${data.leadId || 'Created'}` });
    } else {
      results.push({ test: 'Tax Intake Lead API', status: 'FAIL', details: data.error || 'Unknown error' });
    }
  } catch (error) {
    console.error('Error:', error);
    results.push({ test: 'Tax Intake Lead API', status: 'FAIL', details: String(error) });
  }
}

async function testPreparerApplicationAPI() {
  console.log('\n=== TEST 4: PREPARER APPLICATION API ===');

  const payload = {
    firstName: 'Cely',
    lastName: 'Crypto',
    email: 'celycrypto@gmail.com',
    phone: '555-567-8901',
    languages: ['English', 'Spanish'],
    experienceLevel: 'INTERMEDIATE',
    taxSoftware: ['TurboTax', 'TaxSlayer']
  };

  try {
    const response = await fetch(`${BASE_URL}/api/preparers/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      results.push({ test: 'Preparer Application API', status: 'PASS', details: 'Application submitted' });
    } else {
      results.push({ test: 'Preparer Application API', status: 'FAIL', details: data.error || 'Unknown error' });
    }
  } catch (error) {
    console.error('Error:', error);
    results.push({ test: 'Preparer Application API', status: 'FAIL', details: String(error) });
  }
}

async function checkMarketingLinkRedirects() {
  console.log('\n=== TEST 5: MARKETING LINK REDIRECTS ===');

  const links = ['ow-lead', 'ow-intake', 'ow-appt'];

  for (const code of links) {
    try {
      const response = await fetch(`${BASE_URL}/go/${code}`, {
        method: 'HEAD',
        redirect: 'manual'
      });

      const location = response.headers.get('location');
      console.log(`/go/${code} → ${location || response.status}`);

      if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
        results.push({ test: `Redirect /go/${code}`, status: 'PASS', details: location || 'Redirected' });
      } else {
        results.push({ test: `Redirect /go/${code}`, status: 'FAIL', details: `Status: ${response.status}` });
      }
    } catch (error) {
      console.error(`Error checking ${code}:`, error);
      results.push({ test: `Redirect /go/${code}`, status: 'FAIL', details: String(error) });
    }
  }
}

async function main() {
  console.log('==============================================');
  console.log('TAX GENIUS PRO - API FORM TESTING');
  console.log('==============================================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Run tests
  await checkMarketingLinkRedirects();
  await testContactFormAPI();
  await testCashAdvanceAPI();
  await testTaxIntakeLeadAPI();
  // Skip preparer application to not spam
  // await testPreparerApplicationAPI();

  // Summary
  console.log('\n==============================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('==============================================');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${r.test}: ${r.details}`);
  });

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
}

main().catch(console.error);
