import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { EmailService } from '../src/lib/services/email.service';

const prisma = new PrismaClient();

async function main() {
  const leadId = process.argv[2];

  if (!leadId) {
    console.log('Usage: npx tsx scripts/send-test-notification.ts <leadId>');
    process.exit(1);
  }

  console.log('Sending notification for lead:', leadId);

  // Get the lead
  const lead = await prisma.taxIntakeLead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    console.log('❌ Lead not found');
    process.exit(1);
  }

  if (!lead.assignedPreparerId) {
    console.log('❌ Lead not assigned to any preparer');
    process.exit(1);
  }

  console.log('Lead found:', {
    name: `${lead.first_name} ${lead.last_name}`,
    email: lead.email,
    preparerId: lead.assignedPreparerId,
  });

  // Send email notification
  try {
    const result = await EmailService.sendNewLeadNotificationEmail(lead.assignedPreparerId, {
      leadId: lead.id,
      leadName: `${lead.first_name} ${lead.last_name}`,
      leadEmail: lead.email,
      leadPhone: lead.phone || undefined,
      service: 'tax-intake',
      message: undefined,
      source: lead.attributionMethod || 'direct',
    });

    if (result) {
      console.log('✅ Email notification sent successfully!');
    } else {
      console.log('❌ Email notification failed');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

main().finally(() => prisma.$disconnect());
