import { createClerkClient } from '@clerk/backend';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function setRHamiltonFirmAsAdmin() {
  try {
    const email = 'rhamiltonfirm@gmail.com';

    console.log(`Setting ${email} as admin...`);

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

    // Find user by email
    const users = await clerk.users.getUserList({
      emailAddress: [email]
    });

    if (users.data.length === 0) {
      console.error(`❌ User with email ${email} not found`);
      console.log('They need to sign up first at https://taxgeniuspro.tax/auth/signup');
      return;
    }

    const user = users.data[0];
    console.log(`✓ Found user: ${user.id}`);

    // Update user role to admin
    await clerk.users.updateUserMetadata(user.id, {
      publicMetadata: {
        role: 'admin'
      }
    });

    console.log(`✅ Successfully set ${email} as admin`);
    console.log(`User ID: ${user.id}`);
    console.log('Role: admin');
    console.log('\nAdmin privileges include:');
    console.log('  - Dashboard access');
    console.log('  - User Management');
    console.log('  - Payouts');
    console.log('  - Content Generator');
    console.log('  - Analytics');
    console.log('\nAdmin does NOT have access to:');
    console.log('  - Database Management (super_admin only)');
    console.log('  - Settings (super_admin only)');

  } catch (error) {
    console.error('❌ Error setting admin role:', error);
  }
}

setRHamiltonFirmAsAdmin();
