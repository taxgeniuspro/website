#!/usr/bin/env node

/**
 * Test script to submit a tax intake form WITH a file upload
 * This tests the full flow: form submission -> Cloudinary upload -> email with attachment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || 'https://taxgeniuspro.tax';

async function testIntakeWithFile() {
  console.log('\n=== Testing Tax Intake Form Submission WITH File Upload ===\n');

  // Use Iran Watkins' tracking code (iw)
  const preparerCode = 'iw';

  // Generate unique email for this test
  const timestamp = Date.now();
  const testEmail = `cloudinary-test-${timestamp}@testintake.com`;

  console.log(`Preparer Code: ${preparerCode}`);
  console.log(`Test Email: ${testEmail}`);

  // Load the test image file
  const imagePath = path.join(__dirname, '..', 'AAA Folder', 'preparers', 'YW.webp');

  if (!fs.existsSync(imagePath)) {
    console.error(`\n❌ Test image not found at: ${imagePath}`);
    console.log('Please ensure AAA Folder/preparers/YW.webp exists');
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  console.log(`\nLoaded test image: ${imagePath}`);
  console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

  // Create FormData with all required fields
  const formData = new FormData();

  // Personal Information
  formData.append('first_name', 'CloudTest');
  formData.append('middle_name', 'Upload');
  formData.append('last_name', `TestUser${timestamp % 10000}`);
  formData.append('email', testEmail);
  formData.append('phone', '555-0199');
  formData.append('country_code', '+1');
  formData.append('date_of_birth', '1990-06-15');
  formData.append('ssn', '123-45-6789');

  // Address
  formData.append('address_line_1', '999 Cloud Storage Blvd');
  formData.append('address_line_2', 'Apt 42');
  formData.append('city', 'Atlanta');
  formData.append('state', 'GA');
  formData.append('zip_code', '30301');

  // Tax Information
  formData.append('filing_status', 'single');
  formData.append('employment_type', 'W2');
  formData.append('occupation', 'Software Tester');
  formData.append('claimed_as_dependent', 'no');
  formData.append('in_college', 'no');
  formData.append('has_dependents', 'no');
  formData.append('has_mortgage', 'no');
  formData.append('denied_eitc', 'no');
  formData.append('has_irs_pin', 'no');
  formData.append('wants_refund_advance', 'yes');

  // Driver's License
  formData.append('drivers_license', 'DL-CLOUD-TEST-001');
  formData.append('license_expiration', '2028-12-31');

  // Preparer code
  formData.append('preparer_code', preparerCode);

  // Create a File object from the image buffer for the file upload
  // Note: Node.js 20+ supports File natively, but we need to use Blob with filename for older versions
  const imageBlob = new Blob([imageBuffer], { type: 'image/webp' });

  // For FormData to properly send the file with the filename, we need to use a File object
  // If File is available (Node 20+), use it; otherwise use Blob
  if (typeof File !== 'undefined') {
    const imageFile = new File([imageBuffer], 'test-drivers-license.webp', { type: 'image/webp' });
    formData.append('license_file', imageFile);
    console.log('Using native File object');
  } else {
    // Fallback for older Node versions
    formData.append('license_file', imageBlob, 'test-drivers-license.webp');
    console.log('Using Blob with filename');
  }

  // Debug: Log all form data entries
  console.log('\nFormData entries:');
  for (const [key, value] of formData.entries()) {
    if (value instanceof Blob || value instanceof File) {
      console.log(`  ${key}: [File] ${value.name || 'unnamed'}, ${value.size} bytes, ${value.type}`);
    } else {
      console.log(`  ${key}: ${value.substring(0, 50)}...`);
    }
  }

  console.log('\n--- Submitting intake form with file ---\n');

  try {
    const response = await fetch(`${API_URL}/api/tax-intake/submit`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('\n✅ SUCCESS! Tax intake form submitted with file upload');
      console.log('\n📧 Check email for:');
      console.log('   - Iran Watkins should receive notification at their registered email');
      console.log('   - Email should contain embedded image preview');
      console.log('   - Email should have file attachment');
      console.log('\n📁 Check CRM for:');
      console.log('   - New contact created with email:', testEmail);
      console.log('   - Documents folder should have the uploaded file');
      console.log('\n🖼️ Check Cloudinary:');
      console.log('   - File should be uploaded to taxgeniuspro/client-documents/');

      if (result.documentId) {
        console.log(`\n📄 Document ID: ${result.documentId}`);
      }
      if (result.emailId) {
        console.log(`📨 Email ID: ${result.emailId}`);
      }
    } else {
      console.log('\n❌ FAILED:', result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

testIntakeWithFile();
