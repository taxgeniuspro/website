/**
 * Find Oliver's Clerk User ID by Email
 */

async function findOliverClerkId() {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!clerkSecretKey) {
    console.error('❌ CLERK_SECRET_KEY not found in environment');
    process.exit(1);
  }

  try {
    console.log('🔍 Searching for taxgenius.tax@gmail.com in Clerk...\n');

    const response = await fetch('https://api.clerk.com/v1/users?email_address=taxgenius.tax@gmail.com', {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Clerk API Error:', response.status, response.statusText);
      const error = await response.text();
      console.error('Error details:', error);
      process.exit(1);
    }

    const data = await response.json();

    if (data.length === 0) {
      console.log('❌ No user found with email: taxgenius.tax@gmail.com');
      console.log('\n💡 Oliver needs to sign up at: https://taxgeniuspro.tax/auth/signup\n');
      process.exit(1);
    }

    const user = data[0];
    console.log('✅ Found Oliver in Clerk!\n');
    console.log('User Details:');
    console.log('  Clerk ID:', user.id);
    console.log('  Email:', user.email_addresses[0]?.email_address);
    console.log('  First Name:', user.first_name);
    console.log('  Last Name:', user.last_name);
    console.log('  Created:', new Date(user.created_at).toLocaleString());
    console.log('\n📋 Next Step:');
    console.log('  Run this command to create his profile:\n');
    console.log(`  DATABASE_URL="postgresql://taxgeniuspro_user:TaxGenius2024Secure@localhost:5436/taxgeniuspro_db?schema=public" npx tsx scripts/create-oliver-profile.ts ${user.id}\n`);

    return user.id;
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findOliverClerkId();
