/**
 * Fix Oliver's Permissions - Complete Rebuild
 *
 * This script completely rebuilds Oliver's Clerk metadata with correct TAX_PREPARER
 * role and permissions. It uses the DEFAULT_PERMISSIONS from the permissions system.
 */

import { DEFAULT_PERMISSIONS, UserRole } from '../src/lib/permissions';

async function fixOliverPermissions() {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  const clerkUserId = 'user_340giQLv6tlxCRWeepOYqVErO2O'; // Oliver's Clerk ID

  if (!clerkSecretKey) {
    console.error('❌ CLERK_SECRET_KEY not found in environment');
    process.exit(1);
  }

  try {
    console.log('🔍 Analyzing Oliver\'s current permissions...\n');

    // Get current Clerk metadata
    const getCurrentResponse = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!getCurrentResponse.ok) {
      console.error('❌ Failed to fetch current Clerk user');
      process.exit(1);
    }

    const currentUser = await getCurrentResponse.json();
    const currentRole = currentUser.public_metadata?.role;
    const currentPermissions = currentUser.public_metadata?.permissions || {};

    console.log('📊 CURRENT STATE (WRONG):');
    console.log('  Role:', currentRole);
    console.log('  Permissions:', JSON.stringify(currentPermissions, null, 2));
    console.log('\n');

    // Get correct TAX_PREPARER permissions from system
    const correctRole: UserRole = 'tax_preparer';
    const correctPermissions = DEFAULT_PERMISSIONS[correctRole];

    console.log('✅ CORRECT STATE (TAX_PREPARER):');
    console.log('  Role:', correctRole);
    console.log('  Permissions:', JSON.stringify(correctPermissions, null, 2));
    console.log('\n');

    console.log('🔄 Updating Clerk metadata with correct TAX_PREPARER permissions...\n');

    // Update Clerk metadata with BOTH role and permissions
    const updateResponse = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: {
          role: correctRole,
          permissions: correctPermissions,
        },
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('❌ Failed to update Clerk metadata:', error);
      process.exit(1);
    }

    const updatedUser = await updateResponse.json();

    console.log('✅ SUCCESS! Oliver\'s permissions have been completely rebuilt!\n');
    console.log('📋 VERIFICATION:');
    console.log('  Clerk ID:', clerkUserId);
    console.log('  Email: taxgenius.tax@gmail.com');
    console.log('  Name: Owliver Owl');
    console.log('  Role:', updatedUser.public_metadata.role);
    console.log('  Permissions Applied:', Object.keys(correctPermissions).length, 'permissions');
    console.log('\n');

    console.log('🎯 OLIVER NOW HAS FULL TAX_PREPARER ACCESS:');
    console.log('  ✅ Dashboard & Analytics');
    console.log('  ✅ Client Management (his clients only)');
    console.log('  ✅ Document & File Center');
    console.log('  ✅ Tax Forms (view, download, assign, upload)');
    console.log('  ✅ Calendar & Appointments');
    console.log('  ✅ CRM Contacts (all operations)');
    console.log('  ✅ Academy Training');
    console.log('  ✅ Store & Marketing Materials');
    console.log('  ✅ Tracking Code & Analytics');
    console.log('  ✅ All Micro-Toggles Enabled');
    console.log('\n');

    console.log('💡 NEXT STEPS:');
    console.log('  1. Have Oliver log out completely');
    console.log('  2. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('  3. Log back in');
    console.log('  4. He should now see the full Tax Preparer Dashboard!');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixOliverPermissions();
