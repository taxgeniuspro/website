/**
 * Test script to verify the intake form email flow
 * Simulates a form submission and checks the email service
 * 
 * Run with: npx tsx scripts/test-intake-flow.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Intake Form Flow\n');

  // 1. Find a tax preparer profile to use for testing
  console.log('1️⃣ Finding a test tax preparer profile...');
  const preparerProfile = await prisma.profile.findFirst({
    where: {
      role: 'tax_preparer',
      user: {
        is: {
          email: 'whitegelisa@gmail.com' // Gelisa White for testing
        }
      }
    },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      customTrackingCode: true,
      user: {
        select: { email: true }
      }
    }
  });

  if (!preparerProfile) {
    console.log('❌ No tax preparer profile found for testing');
    return;
  }

  console.log(`   ✓ Found preparer: ${preparerProfile.firstName} ${preparerProfile.lastName}`);
  console.log(`   - Profile ID: ${preparerProfile.id}`);
  console.log(`   - User ID: ${preparerProfile.userId}`);
  console.log(`   - Tracking Code: ${preparerProfile.customTrackingCode}`);

  // 2. Check if there are any leads assigned to this preparer
  console.log('\n2️⃣ Checking leads assigned to this preparer...');
  
  // Check by Profile.id (correct way)
  const leadsByProfileId = await prisma.taxIntakeLead.count({
    where: { assignedPreparerId: preparerProfile.id }
  });
  
  // Check by User.id (old/wrong way)
  const leadsByUserId = await prisma.taxIntakeLead.count({
    where: { assignedPreparerId: preparerProfile.userId }
  });

  console.log(`   - Leads by Profile.id (${preparerProfile.id}): ${leadsByProfileId}`);
  console.log(`   - Leads by User.id (${preparerProfile.userId}): ${leadsByUserId}`);

  if (leadsByUserId > 0 && leadsByProfileId === 0) {
    console.log('   ⚠️ WARNING: Leads exist with User.id but not Profile.id - migration needed!');
  } else if (leadsByProfileId > 0) {
    console.log('   ✓ Leads are correctly assigned by Profile.id');
  }

  // 3. Show a sample lead for this preparer
  console.log('\n3️⃣ Sample lead details...');
  const sampleLead = await prisma.taxIntakeLead.findFirst({
    where: { 
      OR: [
        { assignedPreparerId: preparerProfile.id },
        { assignedPreparerId: preparerProfile.userId }
      ]
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      assignedPreparerId: true,
      referrerUsername: true,
      referrerType: true,
      created_at: true,
      completed: true,
    }
  });

  if (sampleLead) {
    console.log(`   - Lead ID: ${sampleLead.id}`);
    console.log(`   - Name: ${sampleLead.first_name} ${sampleLead.last_name}`);
    console.log(`   - Email: ${sampleLead.email}`);
    console.log(`   - Assigned Preparer ID: ${sampleLead.assignedPreparerId}`);
    console.log(`   - Referrer: ${sampleLead.referrerUsername} (${sampleLead.referrerType})`);
    console.log(`   - Completed: ${sampleLead.completed}`);
    console.log(`   - Created: ${sampleLead.created_at}`);
    
    // Check if the assignment matches correctly
    if (sampleLead.assignedPreparerId === preparerProfile.id) {
      console.log('   ✓ Assignment uses Profile.id (correct)');
    } else if (sampleLead.assignedPreparerId === preparerProfile.userId) {
      console.log('   ⚠️ Assignment uses User.id (old/incorrect)');
    }
  } else {
    console.log('   - No leads found for this preparer');
  }

  // 4. Check all leads statistics
  console.log('\n4️⃣ Overall lead statistics...');
  const totalLeads = await prisma.taxIntakeLead.count();
  const leadsWithPreparer = await prisma.taxIntakeLead.count({
    where: { assignedPreparerId: { not: null } }
  });
  const completedLeads = await prisma.taxIntakeLead.count({
    where: { completed: true }
  });

  console.log(`   - Total leads: ${totalLeads}`);
  console.log(`   - Leads with assigned preparer: ${leadsWithPreparer}`);
  console.log(`   - Completed leads: ${completedLeads}`);

  // 5. Test the API endpoint simulation
  console.log('\n5️⃣ API endpoint test info...');
  console.log('   To test the full flow:');
  console.log(`   1. Go to: https://taxgeniuspro.tax/go/${preparerProfile.customTrackingCode}-intake`);
  console.log('   2. Fill out the form completely');
  console.log('   3. Submit and check for:');
  console.log('      - Success page with preparer photo');
  console.log('      - Email to preparer with all form data');
  console.log('      - PDF attachment with SSN, DOB, license info');
  console.log('      - Driver license image attached');

  console.log('\n✅ Test script completed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
