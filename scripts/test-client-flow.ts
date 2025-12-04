import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clientEmail = 'iradwatkins@gmail.com';
  const preparerTrackingCode = 'appvillage';

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTING CLIENT FLOW');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Client:', clientEmail);
  console.log('Preparer Tracking Code:', preparerTrackingCode);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Create attribution record for the client
  console.log('Step 1: Creating attribution record...');

  try {
    const existingAttribution = await prisma.attribution.findFirst({
      where: { email: clientEmail },
    });

    if (existingAttribution) {
      console.log('⚠ Attribution already exists, updating...');
      await prisma.attribution.update({
        where: { id: existingAttribution.id },
        data: {
          referrerUsername: preparerTrackingCode,
          referrerType: 'tax_preparer',
          attributionMethod: 'tracking_code',
          attributionConfidence: 100,
        },
      });
    } else {
      await prisma.attribution.create({
        data: {
          email: clientEmail,
          phone: '+14046271015',
          referrerUsername: preparerTrackingCode,
          referrerType: 'tax_preparer',
          attributionMethod: 'tracking_code',
          attributionConfidence: 100,
        },
      });
    }
    console.log('✓ Attribution record created/updated\n');
  } catch (error) {
    console.log('ℹ No Attribution table - using direct assignment\n');
  }

  // Step 2: Get preparer details
  console.log('Step 2: Getting preparer details...');
  const preparer = await prisma.profile.findFirst({
    where: {
      OR: [
        { trackingCode: preparerTrackingCode },
        { customTrackingCode: preparerTrackingCode },
      ],
    },
    include: {
      user: true,
    },
  });

  if (!preparer || !preparer.user) {
    console.log('❌ Preparer not found');
    process.exit(1);
  }

  console.log('✓ Found preparer:', preparer.user.email);
  console.log('✓ Preparer ID:', preparer.userId, '\n');

  // Step 3: Instructions for form submissions
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FORM SUBMISSION COMMANDS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🔹 STEP 3: Submit Contact/Lead Form');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`
curl -X POST 'https://taxgeniuspro.tax/api/contact/submit' \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Irad Watkins",
    "email": "${clientEmail}",
    "phone": "+14046271015",
    "service": "tax-consultation",
    "message": "Hi, I need help with my tax filing. I was referred by App Village LLC."
  }' \\
  --insecure -s | jq '.'
`);

  console.log('\n🔹 STEP 4: Submit Tax Intake Form');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`
curl -X POST 'https://taxgeniuspro.tax/api/tax-intake/lead' \\
  -H "Content-Type: application/json" \\
  -d '{
    "first_name": "Irad",
    "last_name": "Watkins",
    "email": "${clientEmail}",
    "phone": "+14046271015",
    "country_code": "+1",
    "address_line_1": "123 Main Street",
    "city": "Atlanta",
    "state": "GA",
    "zip_code": "30315"
  }' \\
  --insecure -s | jq '.'
`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SETUP COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📧 After running the above commands, check:');
  console.log(`   ${preparer.user.email}`);
  console.log('\nYou should receive 2 emails:');
  console.log('   1. Lead notification from contact form');
  console.log('   2. Lead notification from tax intake form\n');
}

main().finally(() => prisma.$disconnect());
