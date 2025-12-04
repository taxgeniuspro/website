import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

async function main() {
  const testEmail = `test-intake-${Date.now()}@example.com`;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTING TAX INTAKE FORM SUBMISSION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test Email:', testEmail);
  console.log('Expected Preparer: appvillagellc@gmail.com');
  console.log('Attribution: ref=appvillage');
  console.log('');

  // Submit tax intake form via API
  const response = await fetch('http://localhost:3005/api/tax-intake/lead?ref=appvillage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      first_name: 'Test',
      middle_name: 'Intake',
      last_name: 'User',
      email: testEmail,
      phone: '+14046271015',
      country_code: '+1',
      address_line_1: '789 Test Avenue',
      address_line_2: 'Suite 100',
      city: 'Atlanta',
      state: 'GA',
      zip_code: '30315',
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
    console.log('✅ Tax intake form submitted successfully!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 EMAIL NOTIFICATION STATUS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Expected Behavior:');
    console.log('✓ Lead should be assigned to preparer cmhs0unqd0000jxldmrw6547h');
    console.log('✓ Email notification should be sent to appvillagellc@gmail.com');
    console.log('✓ Email should include lead details and tax intake information');
    console.log('');
    console.log('⚠️  Check PM2 logs to verify email was sent:');
    console.log('   pm2 logs taxgeniuspro --lines 50');
  } else {
    console.log('❌ Failed to submit tax intake form');
  }
}

main();
