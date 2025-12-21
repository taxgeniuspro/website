import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  const users = await prisma.user.findMany({
    include: {
      profile: {
        select: {
          role: true,
          affiliateStatus: true,
          customTrackingCode: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('=== ALL USERS ===\n');
  console.log('| Email | Name | Role | Affiliate Status | Tracking Code |');
  console.log('|-------|------|------|------------------|---------------|');

  users.forEach(u => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'N/A';
    const role = u.profile?.role || 'no profile';
    const affStatus = u.profile?.affiliateStatus || '-';
    const code = u.profile?.customTrackingCode || '-';
    console.log(`| ${u.email} | ${name} | ${role} | ${affStatus} | ${code} |`);
  });

  console.log(`\nTotal: ${users.length} users`);

  // Count by role
  const roleCounts: Record<string, number> = {};
  users.forEach(u => {
    const role = u.profile?.role || 'no_profile';
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  console.log('\n=== ROLE SUMMARY ===');
  Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).forEach(([role, count]) => {
    console.log(`${role}: ${count}`);
  });

  await prisma.$disconnect();
}

listUsers().catch(console.error);
