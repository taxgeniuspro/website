import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAnalyticsRestrictions() {
  try {
    console.log('🔍 Checking for page restrictions on analytics routes...\n');

    // Check for any restrictions containing 'analytics'
    const restrictions = await prisma.pageRestriction.findMany({
      where: {
        OR: [
          { routePath: { contains: 'analytics' } },
          { routePath: { startsWith: '/admin/analytics' } }
        ]
      }
    });

    if (restrictions.length === 0) {
      console.log('✅ No page restrictions found for analytics routes');
    } else {
      console.log(`⚠️  Found ${restrictions.length} restriction(s) on analytics routes:\n`);
      restrictions.forEach((r, i) => {
        console.log(`Restriction ${i + 1}:`);
        console.log(`  Route: ${r.routePath}`);
        console.log(`  Active: ${r.isActive}`);
        console.log(`  Allowed Roles: ${r.allowedRoles.length > 0 ? r.allowedRoles.join(', ') : 'ALL'}`);
        console.log(`  Blocked Roles: ${r.blockedRoles.length > 0 ? r.blockedRoles.join(', ') : 'NONE'}`);
        console.log(`  Description: ${r.description || 'N/A'}`);
        console.log(`  Priority: ${r.priority}`);
        console.log('');
      });
    }

    // Check admin user
    console.log('\\n👤 Checking admin user...');
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@test.com' },
      include: { profile: true }
    });

    if (adminUser) {
      console.log(`✅ Admin user found`);
      console.log(`  ID: ${adminUser.id}`);
      console.log(`  Email: ${adminUser.email}`);
      console.log(`  Role: ${adminUser.profile?.role || 'NO ROLE'}`);
      console.log(`  Custom Permissions: ${adminUser.profile?.permissions ? 'YES' : 'NO'}`);

      if (adminUser.profile?.permissions) {
        const perms = adminUser.profile.permissions;
        console.log(`  Analytics Permission: ${perms.analytics !== undefined ? perms.analytics : 'DEFAULT (true)'}`);
      }
    } else {
      console.log('❌ Admin user not found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAnalyticsRestrictions();
