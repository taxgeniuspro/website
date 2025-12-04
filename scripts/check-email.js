import { clerkClient } from '@clerk/nextjs/server';

async function checkEmail() {
  const searchEmail = 'appvillagellc@gmail.com';

  try {
    const client = await clerkClient();

    // Search for users by email
    const users = await client.users.getUserList({
      emailAddress: [searchEmail],
    });

    if (users.data.length === 0) {
      console.log(`❌ No Clerk user found with email: ${searchEmail}`);
      return;
    }

    for (const user of users.data) {
      console.log('\n=== CLERK USER FOUND ===');
      console.log(`Email: ${user.emailAddresses[0]?.emailAddress}`);
      console.log(`User ID: ${user.id}`);
      console.log(`Clerk Role: ${user.publicMetadata?.role || 'NO ROLE SET'}`);
      console.log(`Created: ${new Date(user.createdAt).toLocaleString()}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkEmail();
