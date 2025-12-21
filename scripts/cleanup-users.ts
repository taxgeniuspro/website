import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupUsers() {
  console.log('=== USER CLEANUP SCRIPT ===\n');

  // Accounts to DELETE
  const accountsToDelete = [
    // Test accounts
    'newpreparer-mj7bnaw6@taxgeniuspro.test',
    'newpreparer-mj7blew2@taxgeniuspro.test',
    'newpreparer-mj7bf5p1@taxgeniuspro.test',
    'newpreparer-mj7b91y1@taxgeniuspro.test',
    'testadmin@taxgeniuspro.test',
    'test-admin@taxgeniuspro.tax',
    'test-superadmin@taxgeniuspro.tax',
    // Extra preparer variants
    'iradwatkins+iw1@gmail.com',
    'iradwatkins+dw@gmail.com',
  ];

  // Admins to KEEP (these are the only valid admins)
  const validAdmins = [
    'iradwatkins@gmail.com',        // Ira (main admin)
    'rhamiltonfirm@gmail.com',      // Ray Hamilton
    'goldenprotaxes@gmail.com',     // Ale Hamilton
  ];

  console.log('Accounts to DELETE:');
  accountsToDelete.forEach(email => console.log(`  - ${email}`));
  console.log('');

  // First, let's see what we're about to delete
  console.log('=== PREVIEW (DRY RUN) ===\n');

  for (const email of accountsToDelete) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: {
          select: { id: true, role: true }
        }
      }
    });

    if (user) {
      console.log(`✓ Found: ${email} (role: ${user.profile?.role || 'no profile'})`);
    } else {
      console.log(`✗ Not found: ${email}`);
    }
  }

  // Check current admins
  console.log('\n=== CURRENT ADMINS ===\n');
  const currentAdmins = await prisma.user.findMany({
    where: {
      profile: {
        role: 'admin'
      }
    },
    include: {
      profile: {
        select: { role: true }
      }
    }
  });

  currentAdmins.forEach(admin => {
    const isValid = validAdmins.includes(admin.email);
    console.log(`${isValid ? '✓ KEEP' : '✗ DELETE'}: ${admin.email}`);
  });

  // Perform the deletion
  console.log('\n=== DELETING ACCOUNTS ===\n');

  let deletedCount = 0;
  let errorCount = 0;

  for (const email of accountsToDelete) {
    try {
      // First check if user exists
      const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true }
      });

      if (!user) {
        console.log(`⏭️  Skipping ${email} (not found)`);
        continue;
      }

      // Delete related records first (to avoid foreign key constraints)
      if (user.profile) {
        // Delete marketing links
        await prisma.marketingLink.deleteMany({
          where: { creatorId: user.profile.id }
        });

        // Delete profile
        await prisma.profile.delete({
          where: { id: user.profile.id }
        });
      }

      // Delete accounts
      await prisma.account.deleteMany({
        where: { userId: user.id }
      });

      // Delete sessions
      await prisma.session.deleteMany({
        where: { userId: user.id }
      });

      // Delete the user
      await prisma.user.delete({
        where: { email }
      });

      console.log(`✅ Deleted: ${email}`);
      deletedCount++;
    } catch (error) {
      console.error(`❌ Error deleting ${email}:`, error);
      errorCount++;
    }
  }

  // Demote extra admins to tax_preparer (except valid ones)
  console.log('\n=== DEMOTING EXTRA ADMINS ===\n');

  const adminsToRemove = currentAdmins.filter(a => !validAdmins.includes(a.email));

  for (const admin of adminsToRemove) {
    // Skip if already in delete list
    if (accountsToDelete.includes(admin.email)) {
      console.log(`⏭️  Skipping ${admin.email} (already deleted)`);
      continue;
    }

    try {
      // This shouldn't happen based on current data, but just in case
      const profile = await prisma.profile.findFirst({
        where: { userId: admin.id }
      });

      if (profile) {
        await prisma.profile.update({
          where: { id: profile.id },
          data: { role: 'tax_preparer' }
        });
        console.log(`✅ Demoted ${admin.email} from admin to tax_preparer`);
      }
    } catch (error) {
      console.error(`❌ Error demoting ${admin.email}:`, error);
    }
  }

  // Final summary
  console.log('\n=== SUMMARY ===\n');
  console.log(`Deleted: ${deletedCount} accounts`);
  console.log(`Errors: ${errorCount}`);

  // List remaining users
  console.log('\n=== REMAINING USERS ===\n');
  const remainingUsers = await prisma.user.findMany({
    include: {
      profile: {
        select: { role: true, customTrackingCode: true }
      }
    },
    orderBy: { email: 'asc' }
  });

  const roleCounts: Record<string, number> = {};
  remainingUsers.forEach(u => {
    const role = u.profile?.role || 'no_profile';
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  console.log('Role counts:');
  Object.entries(roleCounts).forEach(([role, count]) => {
    console.log(`  ${role}: ${count}`);
  });

  console.log(`\nTotal remaining: ${remainingUsers.length} users`);

  // Show admins
  console.log('\n=== FINAL ADMIN LIST ===\n');
  const finalAdmins = remainingUsers.filter(u => u.profile?.role === 'admin');
  finalAdmins.forEach(a => console.log(`  - ${a.email}`));

  await prisma.$disconnect();
}

cleanupUsers().catch(console.error);
