import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { render } from '@react-email/render';
import { TaxIntakeComplete } from '../emails/tax-intake-complete';
import { writeFileSync } from 'fs';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 GENERATING EMAIL PREVIEW');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Sample comprehensive tax intake data
  const emailProps = {
    preparerName: 'App Village LLC',
    leadId: 'test-lead-123',
    leadName: 'John Michael Taxpayer',
    leadEmail: 'john.taxpayer@example.com',
    leadPhone: '+14046271015',
    dashboardUrl: 'http://localhost:3005/dashboard/preparer/leads/test-lead-123',
    // Personal Information
    firstName: 'John',
    middleName: 'Michael',
    lastName: 'Taxpayer',
    dateOfBirth: '1985-06-15',
    ssn: '123-45-6789',
    countryCode: '+1',
    // Address
    addressLine1: '123 Tax Street',
    addressLine2: 'Apt 4B',
    city: 'Atlanta',
    state: 'GA',
    zipCode: '30315',
    // Tax Filing Details
    filingStatus: 'married_filing_jointly',
    employmentType: 'w2',
    occupation: 'Software Engineer',
    claimedAsDependent: 'no',
    // Education
    inCollege: 'no',
    // Dependents
    hasDependents: 'yes',
    numberOfDependents: 2,
    dependentsUnder24StudentOrDisabled: 'yes',
    dependentsInCollege: 'no',
    childCareProvider: 'yes',
    // Property
    hasMortgage: 'yes',
    // Tax Credits
    deniedEitc: 'no',
    // IRS Information
    hasIrsPin: 'yes',
    irsPin: '123456',
    // Refund Preferences
    wantsRefundAdvance: 'yes',
    // Identification
    driversLicense: 'GA123456789',
    licenseExpiration: '2027-12-31',
    licenseFileUrl: undefined,
    // Attribution
    source: 'ref_param',
    referrerUsername: 'appvillage',
    referrerType: 'tax_preparer',
    attributionMethod: 'ref_param',
  };

  // Render the email to HTML
  const emailHtml = await render(TaxIntakeComplete(emailProps));

  // Save to file
  const outputPath = resolve(__dirname, '../email-preview.html');
  writeFileSync(outputPath, emailHtml);

  console.log('✅ Email preview generated!');
  console.log('');
  console.log('📁 File saved to:', outputPath);
  console.log('');
  console.log('🌐 To view in browser:');
  console.log('   1. Open the file:', outputPath);
  console.log('   2. Or run: open', outputPath);
  console.log('');
  console.log('📧 Email Details:');
  console.log('   Subject: 📋 Complete Tax Intake: John Taxpayer - Ready for Preparation');
  console.log('   From: noreply@taxgeniuspro.tax');
  console.log('   To: appvillagellc@gmail.com');
  console.log('');
  console.log('✅ This is exactly what the tax preparer will see!');
}

main();
