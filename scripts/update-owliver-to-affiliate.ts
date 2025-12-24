import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Update Owliver Owl from admin to affiliate role
 *
 * Changes:
 * 1. Find Owliver (taxgenius.tax@gmail.com) and change role to affiliate
 * 2. Find Ray Hamilton (taxgenius.taxes@gmail.com) - confirm he's tax_preparer
 * 3. Find Ale Hamilton (Goldenprotaxes@gmail.com) - confirm she's tax_preparer
 * 4. Reassign any leads assigned to Owliver to Ray Hamilton
 */
async function main() {
  console.log('\n=== Finding Key Users ===\n');

  // Find Owliver
  const owliver = await prisma.profile.findFirst({
    where: {
      user: { email: 'taxgenius.tax@gmail.com' }
    },
    include: {
      user: { select: { id: true, email: true } }
    }
  });

  // Find Ray Hamilton (rhamiltonfirm@gmail.com is his actual account)
  const ray = await prisma.profile.findFirst({
    where: {
      user: { email: 'rhamiltonfirm@gmail.com' }
    },
    include: {
      user: { select: { id: true, email: true } }
    }
  });

  // Find Ale Hamilton
  const ale = await prisma.profile.findFirst({
    where: {
      user: { email: { equals: 'Goldenprotaxes@gmail.com', mode: 'insensitive' } }
    },
    include: {
      user: { select: { id: true, email: true } }
    }
  });

  console.log('Owliver Owl:', owliver ? {
    profileId: owliver.id,
    role: owliver.role,
    email: owliver.user?.email,
    trackingCode: owliver.customTrackingCode
  } : 'NOT FOUND');

  console.log('Ray Hamilton:', ray ? {
    profileId: ray.id,
    role: ray.role,
    email: ray.user?.email,
    trackingCode: ray.customTrackingCode
  } : 'NOT FOUND');

  console.log('Ale Hamilton:', ale ? {
    profileId: ale.id,
    role: ale.role,
    email: ale.user?.email,
    trackingCode: ale.customTrackingCode
  } : 'NOT FOUND');

  if (!owliver || !ray) {
    console.error('\nERROR: Could not find required users');
    return;
  }

  // Count leads assigned to Owliver
  const owliverLeads = await prisma.cRMContact.count({
    where: { assignedPreparerId: owliver.id }
  });

  const unassignedLeads = await prisma.cRMContact.count({
    where: { assignedPreparerId: null }
  });

  console.log('\n=== Lead Assignment Status ===');
  console.log(`Leads assigned to Owliver: ${owliverLeads}`);
  console.log(`Unassigned leads: ${unassignedLeads}`);

  // Ask for confirmation
  const args = process.argv.slice(2);
  if (!args.includes('--execute')) {
    console.log('\n=== DRY RUN MODE ===');
    console.log('Add --execute flag to apply changes');
    console.log('\nChanges that would be made:');
    console.log(`1. Change Owliver's role from "${owliver.role}" to "affiliate"`);
    console.log(`2. Set Owliver's affiliateStatus to "APPROVED"`);
    console.log(`3. Reassign ${owliverLeads} leads from Owliver to Ray Hamilton`);
    console.log(`4. Reassign ${unassignedLeads} unassigned leads to Ray Hamilton`);
    return;
  }

  console.log('\n=== EXECUTING CHANGES ===\n');

  // 1. Update Owliver's role to affiliate
  await prisma.profile.update({
    where: { id: owliver.id },
    data: {
      role: 'affiliate',
      affiliateStatus: 'APPROVED',
    }
  });
  console.log('✅ Changed Owliver role to affiliate');

  // 2. Reassign Owliver's leads to Ray
  if (owliverLeads > 0) {
    await prisma.cRMContact.updateMany({
      where: { assignedPreparerId: owliver.id },
      data: { assignedPreparerId: ray.id }
    });
    console.log(`✅ Reassigned ${owliverLeads} leads from Owliver to Ray`);
  }

  // 3. Assign unassigned leads to Ray
  if (unassignedLeads > 0) {
    await prisma.cRMContact.updateMany({
      where: { assignedPreparerId: null },
      data: { assignedPreparerId: ray.id }
    });
    console.log(`✅ Assigned ${unassignedLeads} unassigned leads to Ray`);
  }

  console.log('\n=== DONE ===');
  console.log('Owliver is now an affiliate');
  console.log('All leads assigned to Ray Hamilton');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
