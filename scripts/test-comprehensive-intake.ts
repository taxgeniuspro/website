import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

async function main() {
  const testEmail = `comprehensive-test-${Date.now()}@example.com`;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTING COMPREHENSIVE TAX INTAKE FORM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test Email:', testEmail);
  console.log('Expected Preparer: appvillagellc@gmail.com');
  console.log('Attribution: ref=appvillage');
  console.log('');

  // Submit COMPLETE tax intake form via API
  const response = await fetch('http://localhost:3005/api/tax-intake/lead?ref=appvillage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Personal Information & Address
      first_name: 'John',
      middle_name: 'Michael',
      last_name: 'Taxpayer',
      email: testEmail,
      phone: '+14046271015',
      country_code: '+1',
      address_line_1: '123 Tax Street',
      address_line_2: 'Apt 4B',
      city: 'Atlanta',
      state: 'GA',
      zip_code: '30315',
      // Complete Tax Information
      date_of_birth: '1985-06-15',
      ssn: '123-45-6789',
      filing_status: 'married_filing_jointly',
      employment_type: 'w2',
      occupation: 'Software Engineer',
      claimed_as_dependent: 'no',
      in_college: 'no',
      has_dependents: 'yes',
      number_of_dependents: 2,
      dependents_under_24_student_or_disabled: 'yes',
      dependents_in_college: 'no',
      child_care_provider: 'yes',
      has_mortgage: 'yes',
      denied_eitc: 'no',
      has_irs_pin: 'yes',
      irs_pin: '123456',
      wants_refund_advance: 'yes',
      drivers_license: 'GA123456789',
      license_expiration: '2027-12-31',
      // Full form data as JSON
      full_form_data: {
        first_name: 'John',
        middle_name: 'Michael',
        last_name: 'Taxpayer',
        email: testEmail,
        phone: '+14046271015',
        country_code: '+1',
        address_line_1: '123 Tax Street',
        address_line_2: 'Apt 4B',
        city: 'Atlanta',
        state: 'GA',
        zip_code: '30315',
        date_of_birth: '1985-06-15',
        ssn: '123-45-6789',
        filing_status: 'married_filing_jointly',
        employment_type: 'w2',
        occupation: 'Software Engineer',
        claimed_as_dependent: 'no',
        in_college: 'no',
        has_dependents: 'yes',
        number_of_dependents: 2,
        dependents_under_24_student_or_disabled: 'yes',
        dependents_in_college: 'no',
        child_care_provider: 'yes',
        has_mortgage: 'yes',
        denied_eitc: 'no',
        has_irs_pin: 'yes',
        irs_pin: '123456',
        wants_refund_advance: 'yes',
        drivers_license: 'GA123456789',
        license_expiration: '2027-12-31',
      },
    }),
  });

  const data = await response.json();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📬 API RESPONSE:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Status:', response.status);
  console.log('Success:', data.success);
  console.log('Lead ID:', data.leadId);
  console.log('Message:', data.message);
  console.log('');

  if (data.success) {
    console.log('✅ Comprehensive tax intake form submitted successfully!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 EMAIL NOTIFICATION STATUS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Expected Behavior:');
    console.log('✓ Lead should be assigned to preparer cmhs0unqd0000jxldmrw6547h');
    console.log('✓ COMPREHENSIVE email should be sent to appvillagellc@gmail.com');
    console.log('✓ Email should include ALL tax details:');
    console.log('  - Personal Info (Name, DOB, SSN)');
    console.log('  - Address');
    console.log('  - Tax Filing Details (Filing Status, Employment, Occupation)');
    console.log('  - Education Status');
    console.log('  - Dependents Info (2 dependents)');
    console.log('  - Property/Mortgage Info');
    console.log('  - Tax Credits History');
    console.log('  - IRS PIN');
    console.log('  - Refund Advance Preference');
    console.log('  - Driver\'s License Info');
    console.log('  - Attribution Info');
    console.log('');
    console.log('⚡ Expected email details:');
    console.log('   Subject: "📋 Complete Tax Intake: John Taxpayer - Ready for Preparation"');
    console.log('   From: noreply@taxgeniuspro.tax');
    console.log('   To: appvillagellc@gmail.com');
    console.log('');
    console.log('📬 Check PM2 logs to verify email was sent:');
    console.log('   pm2 logs taxgeniuspro --lines 30');
    console.log('');
    console.log('📮 Check preparer email inbox:');
    console.log('   appvillagellc@gmail.com');
    console.log('');
    console.log('🔍 Verify in Resend dashboard:');
    console.log('   https://resend.com/emails');
  } else {
    console.log('❌ Failed to submit comprehensive tax intake form');
  }
}

main();
