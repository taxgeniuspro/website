import { clerkClient } from '@clerk/nextjs/server';

async function syncUserRole() {
  const clerkUserId = 'user_33zIM4IXU6Z89xnFMBQQ1iZ04X7'; // appvillagellc@gmail.com
  const role = 'affiliate'; // lowercase to match TypeScript type

  try {
    console.log(`Updating Clerk metadata for user: ${clerkUserId}`);
    console.log(`Setting role to: ${role}`);

    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        role: role,
      },
    });

    console.log('✅ Successfully updated Clerk metadata!');
    console.log('User role is now set to:', role);
  } catch (error) {
    console.error('❌ Error updating Clerk metadata:', error);
    console.error(error);
    process.exit(1);
  }
}

syncUserRole();
