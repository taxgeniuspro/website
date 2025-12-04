/**
 * CRM Integration Test Runner
 * Tests all 9 forms with 3 clients each (27 submissions total)
 */

const BASE_URL = 'https://taxgeniuspro.tax';

// Test data for all 9 forms
const testData = {
  // Form 1: Tax Intake Lead Form
  taxIntake: [
    {
      first_name: 'Maria', middle_name: 'Elena', last_name: 'Rodriguez',
      email: 'maria.rodriguez.test1@example.com', phone: '404-555-0101',
      country_code: '+1', address_line_1: '123 Peachtree St NE',
      city: 'Atlanta', state: 'GA', zip_code: '30303',
      filing_status: 'Married Filing Jointly', has_dependents: true,
      number_of_dependents: '2', ref: 'ray'
    },
    {
      first_name: 'James', last_name: 'Thompson',
      email: 'james.thompson.test2@example.com', phone: '404-555-0102',
      address_line_1: '456 Piedmont Ave', city: 'Atlanta', state: 'GA', zip_code: '30308'
    },
    {
      first_name: 'Chen', last_name: 'Wang',
      email: 'chen.wang.test3@example.com', phone: '404-555-0103',
      address_line_1: '789 Roswell Rd', city: 'Sandy Springs', state: 'GA', zip_code: '30350',
      filing_status: 'Single', ref: 'ray'
    }
  ],
  // Form 2: Contact Form
  contact: [
    {
      name: 'Patricia Williams', email: 'patricia.williams.test1@example.com',
      phone: '404-555-0201', service: 'Tax Preparation',
      message: 'I need help filing my 2024 taxes.', ref: 'ray'
    },
    {
      name: 'Michael Chen', email: 'michael.chen.test2@example.com',
      phone: '404-555-0202', service: 'Bookkeeping',
      message: 'I run a small consulting business.'
    },
    {
      name: 'Sarah Johnson', email: 'sarah.johnson.test3@example.com',
      service: 'IRS Audit Support',
      message: 'I received an IRS audit notice. This is urgent!'
    }
  ],
  // Form 3: Appointment Booking
  appointment: [
    {
      clientName: 'Robert Martinez', clientEmail: 'robert.martinez.test1@example.com',
      clientPhone: '404-555-0301', appointmentType: 'VIDEO_CALL',
      notes: 'First-time client.', ref: 'ray'
    },
    {
      clientName: 'Lisa Anderson', clientEmail: 'lisa.anderson.test2@example.com',
      clientPhone: '404-555-0302', appointmentType: 'PHONE_CALL',
      notes: 'Quick question about home office deductions.'
    },
    {
      clientName: 'David Kim', clientEmail: 'david.kim.test3@example.com',
      clientPhone: '404-555-0303', appointmentType: 'IN_PERSON',
      notes: 'Complex tax situation.', ref: 'ray'
    }
  ],
  // Form 4: Preparer Application
  preparerApplication: [
    {
      firstName: 'Jennifer', lastName: 'Lopez',
      email: 'jennifer.lopez.prep1@example.com', phone: '404-555-0401',
      ptin: 'P12345678', certification: 'CPA', yearsExperience: '5',
      languages: 'English, Spanish', smsConsent: 'yes', ref: 'ray'
    },
    {
      firstName: 'Michael', lastName: 'Brown',
      email: 'michael.brown.prep2@example.com', phone: '404-555-0402',
      ptin: 'P23456789', certification: 'EA', yearsExperience: '8',
      languages: 'English', smsConsent: 'yes'
    },
    {
      firstName: 'Aisha', lastName: 'Patel',
      email: 'aisha.patel.prep3@example.com', phone: '404-555-0403',
      ptin: 'P34567890', certification: 'Tax Attorney', yearsExperience: '3',
      languages: 'English, Hindi', smsConsent: 'yes', ref: 'ray'
    }
  ],
  // Form 5: Referral Signup
  referralSignup: [
    {
      firstName: 'Carlos', lastName: 'Garcia',
      email: 'carlos.garcia.ref1@example.com', phone: '404-555-0501',
      ref: 'ray'
    },
    {
      firstName: 'Emily', lastName: 'White',
      email: 'emily.white.ref2@example.com', phone: '404-555-0502'
    },
    {
      firstName: 'Ryan', lastName: 'O\'Connor',
      email: 'ryan.oconnor.ref3@example.com', phone: '404-555-0503',
      ref: 'ray'
    }
  ],
  // Form 6: Affiliate Application
  affiliateApplication: [
    {
      firstName: 'Jessica', lastName: 'Taylor',
      email: 'jessica.taylor.aff1@example.com', phone: '404-555-0601',
      experience: 'intermediate', audience: 'Small business owners',
      platforms: ['Website', 'Social Media'], website: 'https://jessicasbusiness.com',
      agreeToTerms: true, ref: 'ray'
    },
    {
      firstName: 'Daniel', lastName: 'Lee',
      email: 'daniel.lee.aff2@example.com', phone: '404-555-0602',
      experience: 'beginner', audience: 'Individual taxpayers',
      platforms: ['Email'], agreeToTerms: true
    },
    {
      firstName: 'Sophia', lastName: 'Martinez',
      email: 'sophia.martinez.aff3@example.com', phone: '404-555-0603',
      experience: 'expert', audience: 'Tax professionals',
      platforms: ['Website', 'YouTube', 'Email'], website: 'https://sophiatax.com',
      socialMedia: { twitter: '@sophiatax', linkedin: 'sophiataxpro' },
      agreeToTerms: true, ref: 'ray'
    }
  ],
  // Form 7: Customer Lead (duplicate of tax intake, but keeping separate for clarity)
  customerLead: [
    {
      first_name: 'Brandon', last_name: 'Scott',
      email: 'brandon.scott.cust1@example.com', phone: '404-555-0701',
      country_code: '+1', address_line_1: '321 Main St',
      city: 'Roswell', state: 'GA', zip_code: '30075',
      filing_status: 'Head of Household', ref: 'ray'
    },
    {
      first_name: 'Amanda', last_name: 'Hughes',
      email: 'amanda.hughes.cust2@example.com', phone: '404-555-0702',
      address_line_1: '654 Oak Ave', city: 'Marietta', state: 'GA', zip_code: '30060'
    },
    {
      first_name: 'Tyler', last_name: 'Green',
      email: 'tyler.green.cust3@example.com', phone: '404-555-0703',
      address_line_1: '987 Pine St', city: 'Alpharetta', state: 'GA', zip_code: '30005',
      filing_status: 'Married Filing Separately', ref: 'ray'
    }
  ],
  // Form 8: Preparer Lead
  preparerLead: [
    {
      firstName: 'Richard', lastName: 'Allen',
      email: 'richard.allen.plead1@example.com', phone: '404-555-0801',
      ptin: 'P45678901', certification: 'CPA', experience: '10+ years',
      message: 'Interested in joining your platform.', ref: 'ray'
    },
    {
      firstName: 'Nicole', lastName: 'King',
      email: 'nicole.king.plead2@example.com', phone: '404-555-0802',
      ptin: 'P56789012', certification: 'EA', experience: '5-10 years',
      message: 'Looking for more clients.'
    },
    {
      firstName: 'Steven', lastName: 'Wright',
      email: 'steven.wright.plead3@example.com', phone: '404-555-0803',
      ptin: 'P67890123', experience: '1-3 years',
      message: 'New tax preparer seeking opportunities.', ref: 'ray'
    }
  ],
  // Form 9: Affiliate Lead
  affiliateLead: [
    {
      firstName: 'Rachel', lastName: 'Adams',
      email: 'rachel.adams.alead1@example.com', phone: '404-555-0901',
      experience: 'intermediate', audience: 'Finance bloggers',
      message: 'I run a personal finance blog.', ref: 'ray'
    },
    {
      firstName: 'Kevin', lastName: 'Baker',
      email: 'kevin.baker.alead2@example.com', phone: '404-555-0902',
      experience: 'expert', audience: 'Business consultants',
      message: 'I work with 50+ small businesses.'
    },
    {
      firstName: 'Laura', lastName: 'Carter',
      email: 'laura.carter.alead3@example.com', phone: '404-555-0903',
      experience: 'beginner', audience: 'Instagram followers',
      message: 'I have 10k followers interested in tax tips.', ref: 'ray'
    }
  ]
};

interface TestResult {
  form: string;
  client: string;
  success: boolean;
  error?: string;
  leadId?: string;
  contactId?: string;
}

async function runTests() {
  const results: TestResult[] = [];

  console.log('\n========================================');
  console.log('CRM Integration Test Runner');
  console.log('========================================\n');

  // Test Tax Intake Form
  console.log('Testing Tax Intake Form (3 clients)...');
  for (let i = 0; i < testData.taxIntake.length; i++) {
    const client = testData.taxIntake[i];
    const { ref, ...data } = client as any;
    const url = `${BASE_URL}/api/tax-intake/lead${ref ? `?ref=${ref}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await response.json();

      if (response.ok && json.success) {
        console.log(`  ✅ ${i+1}/3: ${client.first_name} ${client.last_name}`);
        results.push({
          form: 'Tax Intake',
          client: `${client.first_name} ${client.last_name}`,
          success: true,
          leadId: json.leadId
        });
      } else {
        console.log(`  ❌ ${i+1}/3: ${client.first_name} ${client.last_name} - ${json.error || 'Unknown error'}`);
        results.push({
          form: 'Tax Intake',
          client: `${client.first_name} ${client.last_name}`,
          success: false,
          error: json.error
        });
      }
    } catch (error: any) {
      console.log(`  ❌ ${i+1}/3: ${client.first_name} ${client.last_name} - ${error.message}`);
      results.push({
        form: 'Tax Intake',
        client: `${client.first_name} ${client.last_name}`,
        success: false,
        error: error.message
      });
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test Contact Form
  console.log('\nTesting Contact Form (3 clients)...');
  for (let i = 0; i < testData.contact.length; i++) {
    const client = testData.contact[i];
    const { ref, ...data } = client as any;
    const url = `${BASE_URL}/api/contact/submit${ref ? `?ref=${ref}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await response.json();

      if (response.ok && json.success) {
        console.log(`  ✅ ${i+1}/3: ${client.name}`);
        results.push({
          form: 'Contact',
          client: client.name,
          success: true,
          contactId: json.contactId
        });
      } else {
        console.log(`  ❌ ${i+1}/3: ${client.name} - ${json.error || 'Unknown error'}`);
        results.push({
          form: 'Contact',
          client: client.name,
          success: false,
          error: json.error
        });
      }
    } catch (error: any) {
      console.log(`  ❌ ${i+1}/3: ${client.name} - ${error.message}`);
      results.push({
        form: 'Contact',
        client: client.name,
        success: false,
        error: error.message
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test Appointment Booking
  console.log('\nTesting Appointment Booking (3 clients)...');
  for (let i = 0; i < testData.appointment.length; i++) {
    const client = testData.appointment[i];
    const { ref, ...data } = client as any;
    const url = `${BASE_URL}/api/appointments/book${ref ? `?ref=${ref}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await response.json();

      if (response.ok && json.success) {
        console.log(`  ✅ ${i+1}/3: ${client.clientName}`);
        results.push({
          form: 'Appointment',
          client: client.clientName,
          success: true
        });
      } else {
        console.log(`  ❌ ${i+1}/3: ${client.clientName} - ${json.error || 'Unknown error'}`);
        results.push({
          form: 'Appointment',
          client: client.clientName,
          success: false,
          error: json.error
        });
      }
    } catch (error: any) {
      console.log(`  ❌ ${i+1}/3: ${client.clientName} - ${error.message}`);
      results.push({
        form: 'Appointment',
        client: client.clientName,
        success: false,
        error: error.message
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test Preparer Application
  console.log('\nTesting Preparer Application (3 clients)...');
  for (let i = 0; i < testData.preparerApplication.length; i++) {
    const client = testData.preparerApplication[i];
    const { ref, ...data } = client as any;
    const url = `${BASE_URL}/api/preparers/apply${ref ? `?ref=${ref}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await response.json();

      if (response.ok && (json.success || json.message)) {
        console.log(`  ✅ ${i+1}/3: ${client.firstName} ${client.lastName}`);
        results.push({
          form: 'Preparer Application',
          client: `${client.firstName} ${client.lastName}`,
          success: true
        });
      } else {
        console.log(`  ❌ ${i+1}/3: ${client.firstName} ${client.lastName} - ${json.error || 'Unknown error'}`);
        results.push({
          form: 'Preparer Application',
          client: `${client.firstName} ${client.lastName}`,
          success: false,
          error: json.error
        });
      }
    } catch (error: any) {
      console.log(`  ❌ ${i+1}/3: ${client.firstName} ${client.lastName} - ${error.message}`);
      results.push({
        form: 'Preparer Application',
        client: `${client.firstName} ${client.lastName}`,
        success: false,
        error: error.message
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test Referral Signup
  console.log('\nTesting Referral Signup (3 clients)...');
  for (let i = 0; i < testData.referralSignup.length; i++) {
    const client = testData.referralSignup[i];
    const { ref, ...data } = client as any;
    const url = `${BASE_URL}/api/referrals/signup${ref ? `?ref=${ref}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await response.json();

      if (response.ok && (json.success || json.referralCode)) {
        console.log(`  ✅ ${i+1}/3: ${client.firstName} ${client.lastName}`);
        results.push({
          form: 'Referral Signup',
          client: `${client.firstName} ${client.lastName}`,
          success: true
        });
      } else {
        console.log(`  ❌ ${i+1}/3: ${client.firstName} ${client.lastName} - ${json.error || 'Unknown error'}`);
        results.push({
          form: 'Referral Signup',
          client: `${client.firstName} ${client.lastName}`,
          success: false,
          error: json.error
        });
      }
    } catch (error: any) {
      console.log(`  ❌ ${i+1}/3: ${client.firstName} ${client.lastName} - ${error.message}`);
      results.push({
        form: 'Referral Signup',
        client: `${client.firstName} ${client.lastName}`,
        success: false,
        error: error.message
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test Affiliate Application
  console.log('\nTesting Affiliate Application (3 clients)...');
  for (let i = 0; i < testData.affiliateApplication.length; i++) {
    const client = testData.affiliateApplication[i];
    const { ref, ...data } = client as any;
    const url = `${BASE_URL}/api/applications/affiliate${ref ? `?ref=${ref}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await response.json();

      if (response.ok && (json.success || json.message)) {
        console.log(`  ✅ ${i+1}/3: ${client.firstName} ${client.lastName}`);
        results.push({
          form: 'Affiliate Application',
          client: `${client.firstName} ${client.lastName}`,
          success: true
        });
      } else {
        console.log(`  ❌ ${i+1}/3: ${client.firstName} ${client.lastName} - ${json.error || 'Unknown error'}`);
        results.push({
          form: 'Affiliate Application',
          client: `${client.firstName} ${client.lastName}`,
          success: false,
          error: json.error
        });
      }
    } catch (error: any) {
      console.log(`  ❌ ${i+1}/3: ${client.firstName} ${client.lastName} - ${error.message}`);
      results.push({
        form: 'Affiliate Application',
        client: `${client.firstName} ${client.lastName}`,
        success: false,
        error: error.message
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test Customer Lead (uses same endpoint as tax intake)
  console.log('\nTesting Customer Lead Form (3 clients)...');
  for (let i = 0; i < testData.customerLead.length; i++) {
    const client = testData.customerLead[i];
    const { ref, ...data } = client as any;
    const url = `${BASE_URL}/api/tax-intake/lead${ref ? `?ref=${ref}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await response.json();

      if (response.ok && json.success) {
        console.log(`  ✅ ${i+1}/3: ${client.first_name} ${client.last_name}`);
        results.push({
          form: 'Customer Lead',
          client: `${client.first_name} ${client.last_name}`,
          success: true
        });
      } else {
        console.log(`  ❌ ${i+1}/3: ${client.first_name} ${client.last_name} - ${json.error || 'Unknown error'}`);
        results.push({
          form: 'Customer Lead',
          client: `${client.first_name} ${client.last_name}`,
          success: false,
          error: json.error
        });
      }
    } catch (error: any) {
      console.log(`  ❌ ${i+1}/3: ${client.first_name} ${client.last_name} - ${error.message}`);
      results.push({
        form: 'Customer Lead',
        client: `${client.first_name} ${client.last_name}`,
        success: false,
        error: error.message
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test Preparer Lead
  console.log('\nTesting Preparer Lead Form (3 clients)...');
  for (let i = 0; i < testData.preparerLead.length; i++) {
    const client = testData.preparerLead[i];
    const { ref, ...data } = client as any;
    const url = `${BASE_URL}/api/leads/preparer${ref ? `?ref=${ref}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await response.json();

      if (response.ok && (json.success || json.message)) {
        console.log(`  ✅ ${i+1}/3: ${client.firstName} ${client.lastName}`);
        results.push({
          form: 'Preparer Lead',
          client: `${client.firstName} ${client.lastName}`,
          success: true
        });
      } else {
        console.log(`  ❌ ${i+1}/3: ${client.firstName} ${client.lastName} - ${json.error || 'Unknown error'}`);
        results.push({
          form: 'Preparer Lead',
          client: `${client.firstName} ${client.lastName}`,
          success: false,
          error: json.error
        });
      }
    } catch (error: any) {
      console.log(`  ❌ ${i+1}/3: ${client.firstName} ${client.lastName} - ${error.message}`);
      results.push({
        form: 'Preparer Lead',
        client: `${client.firstName} ${client.lastName}`,
        success: false,
        error: error.message
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test Affiliate Lead
  console.log('\nTesting Affiliate Lead Form (3 clients)...');
  for (let i = 0; i < testData.affiliateLead.length; i++) {
    const client = testData.affiliateLead[i];
    const { ref, ...data } = client as any;
    const url = `${BASE_URL}/api/leads/affiliate${ref ? `?ref=${ref}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await response.json();

      if (response.ok && (json.success || json.message)) {
        console.log(`  ✅ ${i+1}/3: ${client.firstName} ${client.lastName}`);
        results.push({
          form: 'Affiliate Lead',
          client: `${client.firstName} ${client.lastName}`,
          success: true
        });
      } else {
        console.log(`  ❌ ${i+1}/3: ${client.firstName} ${client.lastName} - ${json.error || 'Unknown error'}`);
        results.push({
          form: 'Affiliate Lead',
          client: `${client.firstName} ${client.lastName}`,
          success: false,
          error: json.error
        });
      }
    } catch (error: any) {
      console.log(`  ❌ ${i+1}/3: ${client.firstName} ${client.lastName} - ${error.message}`);
      results.push({
        form: 'Affiliate Lead',
        client: `${client.firstName} ${client.lastName}`,
        success: false,
        error: error.message
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => r.success === false).length;

  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  console.log(`✅ Successful: ${successful}/27`);
  console.log(`❌ Failed: ${failed}/27`);
  console.log('========================================\n');

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.form}: ${r.client} - ${r.error}`);
    });
    console.log('');
  }

  return { results, successful, failed };
}

// Run tests
runTests().then(({ results, successful, failed }) => {
  process.exit(failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
