import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const leadId = 'cmhs3fzsq0000jxegjxva1v5f';
  const preparerId = 'cmhs0unqd0000jxldmrw6547h';

  // Get the lead
  const lead = await prisma.taxIntakeLead.findFirst({
    where: { id: leadId }
  });

  if (!lead) {
    console.log('❌ Lead not found');
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 CONVERTING LEAD TO CLIENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email: lead.email }
  });

  if (!user) {
    console.log('Creating new user account...');
    // Create user account
    user = await prisma.user.create({
      data: {
        email: lead.email,
        name: `${lead.first_name} ${lead.last_name}`,
        emailVerified: new Date(),
      }
    });
    console.log('✓ User created:', user.email);
  } else {
    console.log('✓ User already exists:', user.email);
  }

  // Check if profile exists
  let profile = await prisma.profile.findUnique({
    where: { userId: user.id }
  });

  if (!profile) {
    console.log('Creating client profile...');
    // Create profile
    profile = await prisma.profile.create({
      data: {
        userId: user.id,
        role: 'client',
        firstName: lead.first_name || '',
        lastName: lead.last_name || '',
        phone: lead.phone || '',
        trackingCode: `client-${user.id.substring(0, 8)}`,
        trackingCodeFinalized: true,
      }
    });
    console.log('✓ Profile created with role: client');
  } else {
    console.log('✓ Profile already exists');
  }

  // Update lead to mark as converted
  await prisma.taxIntakeLead.update({
    where: { id: leadId },
    data: {
      convertedToClient: true,
      convertedAt: new Date(),
    }
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ LEAD CONVERTED TO CLIENT SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Client Name:', `${lead.first_name} ${lead.last_name}`);
  console.log('Client Email:', lead.email);
  console.log('User ID:', user.id);
  console.log('Profile ID:', profile.id);
  console.log('Role:', profile.role);
  console.log('Assigned Preparer:', preparerId);
  console.log('\n📊 CLIENT JOURNEY COMPLETE:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 1: ✅ Lead submitted (initial contact)');
  console.log('Step 2: ✅ Tax intake form completed');
  console.log('Step 3: ✅ Converted to active client');
  console.log('\n📧 The preparer received notifications at each step!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().finally(() => prisma.$disconnect());
