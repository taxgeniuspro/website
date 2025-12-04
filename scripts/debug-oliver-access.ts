/**
 * Debug Oliver's Calendar Access
 *
 * This script simulates exactly what happens when Oliver tries to access /admin/calendar
 */

import { getUserPermissions, UserRole, UserPermissions } from '../src/lib/permissions';

async function debugOliverAccess() {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  const oliverId = 'user_340giQLv6tlxCRWeepOYqVErO2O';

  if (!clerkSecretKey) {
    console.error('❌ CLERK_SECRET_KEY not found');
    process.exit(1);
  }

  try {
    console.log('🔍 Fetching Oliver from Clerk...\n');

    const response = await fetch(`https://api.clerk.com/v1/users/${oliverId}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch Oliver from Clerk');
      process.exit(1);
    }

    const user = await response.json();

    console.log('📋 CLERK METADATA:');
    console.log('  Role:', user.public_metadata?.role);
    console.log('  Permissions object exists:', !!user.public_metadata?.permissions);
    console.log('  Total permissions:', Object.keys(user.public_metadata?.permissions || {}).length);
    console.log('  calendar in metadata:', user.public_metadata?.permissions?.calendar);
    console.log('\n');

    // Simulate what the calendar page does
    const role = user.public_metadata?.role as UserRole | undefined;
    const customPermissions = user.public_metadata?.permissions as Partial<UserPermissions> | undefined;

    console.log('🔧 SIMULATING CALENDAR PAGE LOGIC:');
    console.log('  role variable:', role);
    console.log('  role || "client":', role || 'client');
    console.log('  customPermissions exists:', !!customPermissions);
    console.log('\n');

    // Call getUserPermissions EXACTLY as the page does
    const permissions = getUserPermissions(role || 'client', customPermissions);

    console.log('✅ RESULT FROM getUserPermissions():');
    console.log('  permissions.calendar:', permissions.calendar);
    console.log('  permissions.clientFileCenter:', permissions.clientFileCenter);
    console.log('  permissions.academy:', permissions.academy);
    console.log('\n');

    // Test the redirect condition
    const wouldRedirect = !permissions.calendar;

    console.log('🚦 ACCESS CHECK:');
    if (wouldRedirect) {
      console.log('  ❌ DENIED - Would redirect to /forbidden');
      console.log('  Reason: permissions.calendar is', permissions.calendar);
    } else {
      console.log('  ✅ GRANTED - Oliver can access /admin/calendar');
    }
    console.log('\n');

    // Debug: Show all permissions
    console.log('📊 ALL PERMISSIONS FROM getUserPermissions():');
    Object.entries(permissions).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugOliverAccess();
