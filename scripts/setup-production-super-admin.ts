/**
 * Setup Production Super Admin
 *
 * Sets up ira@irawatkins.com as super_admin with full permissions in PRODUCTION Clerk
 */

import { DEFAULT_PERMISSIONS, UserRole } from '../src/lib/permissions';

async function setupProductionSuperAdmin() {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  const userId = 'user_33zSPXI2yVj6g6fEOvOogJSMcHn'; // ira@irawatkins.com in production

  if (!clerkSecretKey) {
    console.error('❌ CLERK_SECRET_KEY not found');
    process.exit(1);
  }

  try {
    console.log('🔧 Setting up ira@irawatkins.com as SUPER_ADMIN...\n');

    const role: UserRole = 'super_admin';
    const permissions = DEFAULT_PERMISSIONS[role];

    const response = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: {
          role: role,
          permissions: permissions,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to update Clerk:', error);
      process.exit(1);
    }

    const updated = await response.json();

    console.log('✅ SUCCESS! Super admin configured!\n');
    console.log('📋 Details:');
    console.log('  Email: ira@irawatkins.com');
    console.log('  Clerk ID:', userId);
    console.log('  Role:', updated.public_metadata.role);
    console.log('  Permissions:', Object.keys(permissions).length, 'permissions');
    console.log('\n🎯 You can now log in with full admin access!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupProductionSuperAdmin();
