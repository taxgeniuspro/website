import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'appvillagellc@gmail.com';

  console.log('Deleting test tax preparer:', email);

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      profile: true,
    },
  });

  if (!user) {
    console.log('❌ User not found with email:', email);
    process.exit(1);
  }

  console.log('Found user:', user.id);
  if (user.profile) {
    console.log('Tracking code:', user.profile.trackingCode);
  }

  // Update any leads assigned to this preparer (set to null)
  const updatedLeads = await prisma.taxIntakeLead.updateMany({
    where: { assignedPreparerId: user.id },
    data: { assignedPreparerId: null },
  });

  console.log(`✓ Updated ${updatedLeads.count} tax intake leads (set preparer to null)`);

  // Update any CRM contacts assigned to this preparer
  const updatedContacts = await prisma.cRMContact.updateMany({
    where: { assignedPreparerId: user.id },
    data: { assignedPreparerId: null },
  });

  console.log(`✓ Updated ${updatedContacts.count} CRM contacts (set preparer to null)`);

  // Delete user (will cascade delete profile, magic links, etc.)
  await prisma.user.delete({
    where: { email },
  });

  console.log('✓ Deleted user and related records');

  console.log('\n✅ Tax preparer deleted successfully!\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
