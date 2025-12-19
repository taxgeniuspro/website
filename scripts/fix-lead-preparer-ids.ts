/**
 * Migration script to fix assignedPreparerId values in TaxIntakeLead table
 * 
 * Problem: Leads were assigned with User.id but queries expect Profile.id
 * Solution: For each lead with assignedPreparerId, find the corresponding Profile.id
 *           and update the lead
 * 
 * Run with: npx tsx scripts/fix-lead-preparer-ids.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding leads with assignedPreparerId...');
  
  // Get all leads that have an assignedPreparerId
  const leadsWithPreparer = await prisma.taxIntakeLead.findMany({
    where: {
      assignedPreparerId: { not: null }
    },
    select: {
      id: true,
      assignedPreparerId: true,
      first_name: true,
      last_name: true,
    }
  });
  
  console.log(`Found ${leadsWithPreparer.length} leads with assigned preparer`);
  
  let fixed = 0;
  let alreadyCorrect = 0;
  let errors = 0;
  
  for (const lead of leadsWithPreparer) {
    const currentId = lead.assignedPreparerId!;
    const clientName = `${lead.first_name} ${lead.last_name}`;

    // First, check if this is already a Profile.id
    const existingProfile = await prisma.profile.findUnique({
      where: { id: currentId },
      select: { id: true }
    });

    if (existingProfile) {
      // Already a Profile.id, no change needed
      alreadyCorrect++;
      console.log(`✓ Lead ${lead.id} (${clientName}) - Already correct (Profile.id)`);
      continue;
    }

    // Try to find Profile by userId
    const profile = await prisma.profile.findFirst({
      where: { userId: currentId },
      select: { id: true }
    });

    if (profile) {
      // Found the profile, update the lead
      await prisma.taxIntakeLead.update({
        where: { id: lead.id },
        data: { assignedPreparerId: profile.id }
      });
      fixed++;
      console.log(`✅ Lead ${lead.id} (${clientName}) - Fixed: ${currentId} → ${profile.id}`);
    } else {
      // Could not find profile - this might be an orphan
      errors++;
      console.log(`❌ Lead ${lead.id} (${clientName}) - ERROR: No profile found for ${currentId}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total leads with preparer: ${leadsWithPreparer.length}`);
  console.log(`   Already correct: ${alreadyCorrect}`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Errors: ${errors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
