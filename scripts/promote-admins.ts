import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function promoteAdmins() {
  console.log('=== PROMOTING RAY AND ALE TO ADMIN ===\n');

  const adminsToPromote = [
    'rhamiltonfirm@gmail.com',      // Ray Hamilton
    'goldenprotaxes@gmail.com',     // Ale Hamilton
  ];

  for (const email of adminsToPromote) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true }
      });

      if (!user) {
        console.log(`❌ User not found: ${email}`);
        continue;
      }

      if (!user.profile) {
        console.log(`❌ No profile for: ${email}`);
        continue;
      }

      if (user.profile.role === 'admin') {
        console.log(`⏭️  Already admin: ${email}`);
        continue;
      }

      await prisma.profile.update({
        where: { id: user.profile.id },
        data: { role: 'admin' }
      });

      console.log(`✅ Promoted to admin: ${email}`);
    } catch (error) {
      console.error(`❌ Error promoting ${email}:`, error);
    }
  }

  // Show final admin list
  console.log('\n=== FINAL ADMIN LIST ===\n');
  const admins = await prisma.user.findMany({
    where: {
      profile: {
        role: 'admin'
      }
    },
    include: {
      profile: {
        select: { role: true, customTrackingCode: true }
      }
    }
  });

  admins.forEach(a => {
    console.log(`  - ${a.email} (tracking: ${a.profile?.customTrackingCode || 'N/A'})`);
  });

  console.log(`\nTotal admins: ${admins.length}`);

  await prisma.$disconnect();
}

promoteAdmins().catch(console.error);
