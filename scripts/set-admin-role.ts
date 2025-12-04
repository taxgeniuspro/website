/**
 * Script to set admin role for a specific user
 * Usage: npx tsx scripts/set-admin-role.ts <email>
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Manually load .env.local and set process.env
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#')) {
    const value = valueParts.join('=').trim();
    process.env[key.trim()] = value;
  }
});

import { clerkClient } from '@clerk/nextjs/server';

async function setAdminRole(email: string) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);

    const clerk = await clerkClient();

    // Get user by email
    const users = await clerk.users.getUserList({
      emailAddress: [email],
    });

    if (users.data.length === 0) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    const user = users.data[0];
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.id})`);

    // Check current role
    const currentRole = user.publicMetadata?.role;
    console.log(`📋 Current role: ${currentRole || 'none'}`);

    // Update to admin role
    await clerk.users.updateUserMetadata(user.id, {
      publicMetadata: {
        role: 'admin',
      },
    });

    console.log(`✅ Successfully set admin role for ${email}`);
    console.log(`🎉 User can now access /dashboard/admin`);

  } catch (error) {
    console.error('❌ Error setting admin role:', error);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: npx tsx scripts/set-admin-role.ts <email>');
  process.exit(1);
}

setAdminRole(email);
