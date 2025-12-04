import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE importing anything else
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clientEmail = 'iradwatkins@gmail.com';
  const preparerEmail = 'appvillagellc@gmail.com';

  console.log('Assigning leads to preparer and triggering notifications...\n');

  // Get preparer
  const preparer = await prisma.user.findUnique({
    where: { email: preparerEmail },
    include: { profile: true },
  });

  if (!preparer || !preparer.profile) {
    console.log('❌ Preparer not found');
    process.exit(1);
  }

  console.log('✓ Found preparer:', preparer.email);
  console.log('  Tracking code:', preparer.profile.trackingCode, '\n');

  // Update tax intake lead
  const lead = await prisma.taxIntakeLead.findFirst({
    where: { email: clientEmail },
    orderBy: { created_at: 'desc' },
  });

  if (lead) {
    await prisma.taxIntakeLead.update({
      where: { id: lead.id },
      data: {
        assignedPreparerId: preparer.id,
        referrerUsername: preparer.profile.trackingCode,
        attributionMethod: 'tracking_code',
      },
    });
    console.log('✓ Assigned tax intake lead to preparer');
    console.log('  Lead ID:', lead.id);
  }

  // Update CRM contact
  const contact = await prisma.cRMContact.findUnique({
    where: { email: clientEmail },
  });

  if (contact) {
    await prisma.cRMContact.update({
      where: { id: contact.id },
      data: {
        assignedPreparerId: preparer.id,
      },
    });
    console.log('✓ Assigned CRM contact to preparer');
    console.log('  Contact ID:', contact.id);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ASSIGNMENT COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Now we need to manually trigger email notifications
  // Since the EmailService requires Resend API key at module load time,
  // we'll use the API directly

  console.log('📧 EMAIL NOTIFICATIONS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('To trigger email notifications, the system needs to:');
  console.log('1. Call EmailService.sendNewLeadNotificationEmail() for the tax intake');
  console.log('2. Optionally notify for the contact form (not currently implemented)');
  console.log('\nSince we are in development mode (NODE_ENV=development),');
  console.log('emails are only LOGGED, not sent via Resend.\n');

  console.log('To test actual email sending:');
  console.log('1. Set NODE_ENV=production in .env');
  console.log('2. Restart the app: pm2 restart taxgeniuspro');
  console.log('3. Submit new forms with proper tracking (?ref=appvillage)');
  console.log('\nOR');
  console.log('4. Check the current environment:');
  console.log('   NODE_ENV:', process.env.NODE_ENV);
  console.log('   RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✓ Set' : '❌ Not set');
}

main().finally(() => prisma.$disconnect());
