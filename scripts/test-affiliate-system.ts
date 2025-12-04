import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTING AFFILIATE SYSTEM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Step 1: Create test affiliate user
  console.log('Step 1: Creating test affiliate user...');

  let affiliate = await prisma.user.findFirst({
    where: { email: 'test-affiliate@example.com' },
    include: { profile: true },
  });

  if (!affiliate) {
    affiliate = await prisma.user.create({
      data: {
        email: 'test-affiliate@example.com',
        name: 'Test Affiliate',
        profile: {
          create: {
            firstName: 'Test',
            lastName: 'Affiliate',
            role: 'affiliate',
            trackingCode: 'testaffiliate',
            customTrackingCode: 'testaffiliate123',
          },
        },
      },
      include: { profile: true },
    });
    console.log('✅ Created new affiliate:', affiliate.email);
  } else {
    console.log('✅ Found existing affiliate:', affiliate.email);
  }

  console.log('   Affiliate ID:', affiliate.id);
  console.log('   Profile ID:', affiliate.profile?.id);
  console.log('   Tracking Code:', affiliate.profile?.trackingCode);
  console.log('');

  // Step 2: Submit tax intake with affiliate attribution
  console.log('Step 2: Submitting tax intake with affiliate ref...');

  const testEmail = `affiliate-lead-${Date.now()}@example.com`;

  const response = await fetch('http://localhost:3005/api/tax-intake/lead?ref=testaffiliate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Jane',
      middle_name: 'Affiliate',
      last_name: 'Customer',
      email: testEmail,
      phone: '+14046271015',
      country_code: '+1',
      address_line_1: '456 Referral Ave',
      city: 'Atlanta',
      state: 'GA',
      zip_code: '30315',
      date_of_birth: '1990-01-15',
      ssn: '987-65-4321',
      filing_status: 'single',
      employment_type: 'w2',
      occupation: 'Marketing Manager',
      claimed_as_dependent: 'no',
      in_college: 'no',
      has_dependents: 'no',
      has_mortgage: 'no',
      denied_eitc: 'no',
      has_irs_pin: 'no',
      wants_refund_advance: 'yes',
      drivers_license: 'GA987654321',
      license_expiration: '2027-12-31',
      full_form_data: {
        first_name: 'Jane',
        middle_name: 'Affiliate',
        last_name: 'Customer',
        email: testEmail,
        phone: '+14046271015',
        date_of_birth: '1990-01-15',
        ssn: '987-65-4321',
        filing_status: 'single',
        employment_type: 'w2',
        occupation: 'Marketing Manager',
      },
    }),
  });

  const data = await response.json();
  console.log('✅ Tax intake submitted');
  console.log('   Status:', response.status);
  console.log('   Success:', data.success);
  console.log('   Lead ID:', data.leadId);
  console.log('');

  // Step 3: Check lead attribution
  if (data.success && data.leadId) {
    console.log('Step 3: Verifying lead attribution...');

    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: data.leadId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        referrerUsername: true,
        referrerType: true,
        attributionMethod: true,
        assignedPreparerId: true,
      },
    });

    if (lead) {
      console.log('✅ Lead created and attributed:');
      console.log('   Lead Name:', `${lead.first_name} ${lead.last_name}`);
      console.log('   Lead Email:', lead.email);
      console.log('   Referrer Username:', lead.referrerUsername);
      console.log('   Referrer Type:', lead.referrerType);
      console.log('   Attribution Method:', lead.attributionMethod);
      console.log('   Assigned Preparer:', lead.assignedPreparerId || '(Tax Genius Corporate)');
      console.log('');

      // Step 4: Check for affiliate assignment
      console.log('Step 4: Checking affiliate lead assignment...');

      if (lead.referrerType === 'affiliate') {
        console.log('✅ PASSED: Lead correctly attributed to affiliate');
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 AFFILIATE SYSTEM TEST RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Affiliate user creation: WORKING');
        console.log('✅ Lead submission with ?ref: WORKING');
        console.log('✅ Attribution tracking: WORKING');
        console.log('✅ Referrer type detection: WORKING');
        console.log('');
        console.log('🎯 NEXT STEPS:');
        console.log('1. Check affiliate dashboard: http://localhost:3005/dashboard/affiliate/leads');
        console.log('2. Login as: test-affiliate@example.com');
        console.log('3. View your referred leads');
        console.log('');
        console.log('⚠️  NOTE: Affiliate leads page currently shows mock data');
        console.log('   Update to connect to real API endpoint to show actual leads');
      } else {
        console.log('❌ FAILED: Lead NOT attributed to affiliate');
        console.log('   Expected referrerType: affiliate');
        console.log('   Got referrerType:', lead.referrerType);
      }
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TEST COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().finally(() => prisma.$disconnect());
