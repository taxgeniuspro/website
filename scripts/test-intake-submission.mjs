#!/usr/bin/env node
/**
 * Test Intake Form Submission
 *
 * This script simulates a customer submitting a tax intake form
 * using the /api/tax-intake/lead endpoint (JSON-based, no file upload).
 *
 * Usage:
 *   node scripts/test-intake-submission.mjs
 */

// Configuration
const API_URL = process.env.API_URL || 'https://taxgeniuspro.tax';
const PREPARER_CODE = 'iw1'; // Iran Watkins's tracking code

// Generate unique test client data
const timestamp = Date.now();
const testClient = {
  first_name: 'TestClient',
  middle_name: '',
  last_name: `Intake${timestamp.toString().slice(-4)}`,
  email: `testclient${timestamp}@testintake.com`,
  phone: '4045559999',
  country_code: '+1',
  address_line_1: '123 Test Street',
  address_line_2: 'Apt 1',
  city: 'Atlanta',
  state: 'GA',
  zip_code: '30301',
  date_of_birth: '1985-06-15',
  ssn: '123-45-6789',
  filing_status: 'single',
  employment_type: 'W2',
  occupation: 'Software Developer',
  claimed_as_dependent: 'no',
  in_college: 'no',
  has_dependents: 'no',
  number_of_dependents: '0',
  dependents_under_24_student_or_disabled: 'no',
  dependents_in_college: 'no',
  child_care_provider: 'no',
  has_mortgage: 'no',
  denied_eitc: 'no',
  has_irs_pin: 'no',
  irs_pin: '',
  wants_refund_advance: 'yes',
  drivers_license: 'DL123456789',
  license_expiration: '2027-12-31',
  locale: 'en',
  // Store complete form data as JSON
  full_form_data: {
    personal: { first_name: 'TestClient', last_name: `Intake${timestamp.toString().slice(-4)}` },
    tax: { filing_status: 'single', employment_type: 'W2' },
  },
};

async function main() {
  console.log('=== Test Intake Form Submission ===\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Preparer Code: ${PREPARER_CODE}`);
  console.log(`Test Client: ${testClient.first_name} ${testClient.last_name}`);
  console.log(`Test Email: ${testClient.email}\n`);

  try {
    console.log('Submitting intake form to /api/tax-intake/lead...');

    // Submit to the API with ref parameter for attribution
    const response = await fetch(`${API_URL}/api/tax-intake/lead?ref=${PREPARER_CODE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testClient),
    });

    const result = await response.json();

    console.log(`\nResponse Status: ${response.status}`);
    console.log('Response Body:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n=== SUCCESS ===');
      console.log(`Lead ID: ${result.leadId}`);
      console.log(`\nTest client email: ${testClient.email}`);
      console.log('\nCheck:');
      console.log(`1. Tax Preparer email (iradwatkins+iw1@gmail.com) for notification`);
      console.log(`2. CRM for new contact: ${API_URL}/en/crm/contacts`);
      console.log(`3. TaxIntakeLead in database`);
    } else {
      console.log('\n=== FAILED ===');
      console.log(`Error: ${result.error}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
