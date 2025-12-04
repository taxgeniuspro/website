import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFYING EMAIL NOTIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Get the most recent lead
  const lead = await prisma.taxIntakeLead.findFirst({
    orderBy: {
      created_at: 'desc',
    },
  });

  if (!lead) {
    console.log('❌ No leads found');
    return;
  }

  console.log('📋 MOST RECENT LEAD:');
  console.log('  Lead ID:', lead.id);
  console.log('  Email:', lead.email);
  console.log('  Name:', `${lead.first_name} ${lead.last_name}`);
  console.log('  Phone:', lead.phone);
  console.log('  Created:', lead.created_at);
  console.log('');

  console.log('🎯 ASSIGNMENT DETAILS:');
  console.log('  Assigned Preparer ID:', lead.assignedPreparerId || '(None - Corporate)');
  console.log('  Referrer Username:', lead.referrerUsername || '(None)');
  console.log('  Referrer Type:', lead.referrerType || '(None)');
  console.log('  Attribution Method:', lead.attributionMethod || '(None)');
  console.log('');

  if (lead.assignedPreparerId) {
    // Look up the preparer
    const preparer = await prisma.user.findUnique({
      where: { id: lead.assignedPreparerId },
      include: {
        profile: true,
      },
    });

    if (preparer) {
      console.log('👨‍💼 ASSIGNED PREPARER:');
      console.log('  User ID:', preparer.id);
      console.log('  Name:', preparer.name);
      console.log('  Email:', preparer.email);
      console.log('  Tracking Code:', preparer.profile?.trackingCode || '(None)');
      console.log('');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 EMAIL NOTIFICATION STATUS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Lead was assigned to preparer:', preparer.email);
      console.log('✅ Email notification SHOULD have been sent to:', preparer.email);
      console.log('');
      console.log('📬 Email Details:');
      console.log('  Template: new-lead-notification.tsx');
      console.log('  Service: tax-intake');
      console.log('  Lead Name:', `${lead.first_name} ${lead.last_name}`);
      console.log('  Lead Email:', lead.email);
      console.log('  Lead Phone:', lead.phone);
      console.log('  Source:', lead.attributionMethod || 'direct');
      console.log('');
      console.log('⚙️  Email Service:');
      console.log('  Provider: Resend API');
      console.log('  Environment: production');
      console.log('  From:', 'Tax Genius Pro <noreply@taxgeniuspro.tax>');
      console.log('  To:', preparer.email);
      console.log('');
      console.log('✅ If the email was sent successfully, it should appear in:');
      console.log('   1. The preparer\'s inbox (appvillagellc@gmail.com)');
      console.log('   2. Resend dashboard (https://resend.com/emails)');
    } else {
      console.log('❌ Preparer user not found');
    }
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 EMAIL NOTIFICATION STATUS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ℹ️  Lead was assigned to Tax Genius Corporate (no preparer)');
    console.log('⚠️  No preparer notification email was sent');
    console.log('   (This is expected behavior for corporate-assigned leads)');
  }
}

main().finally(() => prisma.$disconnect());
