/**
 * Test script to debug PDF generation WITHOUT image
 */
import { generateTaxIntakePDF } from '../src/lib/services/pdf-form-generator.service';

async function main() {
  console.log('Testing PDF generation WITHOUT image...');

  const testData = {
    id: 'test-lead-12345',
    first_name: 'John',
    middle_name: 'Test',
    last_name: 'Doe',
    email: 'john.doe@test.com',
    phone: '4701234567',
    address_line_1: '123 Test Street',
    city: 'Atlanta',
    state: 'GA',
    zip_code: '30301',
    date_of_birth: '1990-05-15',
    ssn: '123-45-6789',
    filing_status: 'single',
    employment_type: 'w2',
    occupation: 'Software Engineer',
    has_dependents: 'no',
    has_mortgage: 'no',
    wants_refund_advance: 'yes',
    denied_eitc: 'no',
    has_irs_pin: 'no',
    drivers_license: 'GA1234567890',
    license_expiration: '2028-12-31',
    // NO IMAGE URL
    created_at: new Date(),
    tax_year: 2024,
    referrerUsername: 'ow',
    referrerType: 'tax_preparer',
  };

  try {
    console.log('Generating PDF with test data (no image)...');
    const pdfBuffer = await generateTaxIntakePDF(testData);
    console.log('PDF generated successfully!');
    console.log('Buffer size:', pdfBuffer.length, 'bytes');

    // Write to file for inspection
    const fs = await import('fs');
    fs.writeFileSync('/tmp/test-intake-no-image.pdf', pdfBuffer);
    console.log('PDF written to /tmp/test-intake-no-image.pdf');

  } catch (error) {
    console.error('PDF generation failed:');
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

main().catch(console.error);
