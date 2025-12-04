/**
 * Diagnostic Script: Check User Permissions
 *
 * Run this to see what permissions a specific user has
 * Usage: npx tsx scripts/check-user-permissions.ts <email>
 */

import { clerkClient } from '@clerk/nextjs/server';
import { getUserPermissions, UserRole, type UserPermissions } from '../src/lib/permissions';

async function checkUserPermissions(email: string) {
  try {
    // Find user by email
    const users = await (await clerkClient()).users.getUserList({
      emailAddress: [email],
    });

    if (users.data.length === 0) {
      console.log(`❌ No user found with email: ${email}`);
      return;
    }

    const user = users.data[0];
    console.log('\n📊 USER INFORMATION');
    console.log('==================');
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Email: ${user.emailAddresses[0]?.emailAddress}`);
    console.log(`User ID: ${user.id}`);
    console.log(`\n🎭 ROLE INFORMATION`);
    console.log('==================');

    const role = (user.publicMetadata?.role as UserRole) || 'client';
    console.log(`Role: ${role}`);

    const customPermissions = user.publicMetadata?.permissions as
      | Partial<UserPermissions>
      | undefined;

    if (customPermissions) {
      console.log(`\n⚙️ CUSTOM PERMISSIONS (from Clerk metadata):`);
      console.log(JSON.stringify(customPermissions, null, 2));
    } else {
      console.log(`\n✅ No custom permissions - using defaults for role: ${role}`);
    }

    // Get effective permissions
    const permissions = getUserPermissions(role, customPermissions);

    console.log(`\n📋 EFFECTIVE PERMISSIONS`);
    console.log('========================');
    console.log(`\nCalendar Permission:`);
    console.log(`  calendar: ${permissions.calendar ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  calendar_view: ${permissions.calendar_view ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  calendar_create: ${permissions.calendar_create ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  calendar_edit: ${permissions.calendar_edit ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  calendar_delete: ${permissions.calendar_delete ? '✅ ENABLED' : '❌ DISABLED'}`);

    console.log(`\nStore/Cart Permissions:`);
    console.log(`  store: ${permissions.store ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  store_view: ${permissions.store_view ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  store_cart: ${permissions.store_cart ? '✅ ENABLED' : '❌ DISABLED'}`);

    console.log(`\nOther Key Permissions:`);
    console.log(`  dashboard: ${permissions.dashboard ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  clients: ${permissions.clients ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  analytics: ${permissions.analytics ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  trackingCode: ${permissions.trackingCode ? '✅ ENABLED' : '❌ DISABLED'}`);

    console.log(`\n🔍 DIAGNOSIS`);
    console.log('============');

    if (role === 'tax_preparer' && !permissions.calendar) {
      console.log(`⚠️  ISSUE FOUND: Tax preparer should have calendar access by default!`);
      console.log(`   This means custom permissions are overriding the defaults.`);
      console.log(
        `   Solution: Remove the 'calendar' key from custom permissions in Clerk metadata.`
      );
    } else if (role === 'tax_preparer' && permissions.calendar) {
      console.log(`✅ Tax preparer has correct calendar access`);
    } else if (role !== 'tax_preparer') {
      console.log(`ℹ️  User role is '${role}', not 'tax_preparer'`);
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Error checking user permissions:', error);
  }
}

const email = process.argv[2];

if (!email) {
  console.log('Usage: npx tsx scripts/check-user-permissions.ts <email>');
  console.log('Example: npx tsx scripts/check-user-permissions.ts john@example.com');
  process.exit(1);
}

checkUserPermissions(email);
