import { clerkClient } from '@clerk/nextjs/server';

async function checkAllUsers() {
  const clerkUserIds = [
    'user_33zINspjALygQ2rtzlgRrUxiNVR', // Tax Genius Team (TAX_PREPARER)
    'user_33qhzflZSwUZcmVrj78INBIrn6c', // Watkins (SUPER_ADMIN)
    'user_340giQLv6tlxCRWeepOYqVErO2O', // Tax Genius (CLIENT)
    'user_test_taxgenius',              // Tax Genius (CLIENT - test)
    'user_test_admin_taxgenius',        // Admin User (ADMIN - test)
    'user_test_affiliate_taxgenius',    // Affiliate Partner (AFFILIATE - test)
    'user_test_lead_taxgenius',         // Lead Prospect (LEAD - test)
  ];

  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    TAX GENIUS PRO - USER AUDIT REPORT                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const client = await clerkClient();

  for (const userId of clerkUserIds) {
    try {
      const user = await client.users.getUser(userId);
      const email = user.emailAddresses[0]?.emailAddress || 'NO EMAIL';
      const clerkRole = user.publicMetadata?.role || 'NO ROLE IN CLERK';

      console.log(`User ID: ${userId}`);
      console.log(`  Email: ${email}`);
      console.log(`  Clerk Metadata Role: ${clerkRole}`);
      console.log(`  Status: ✅ Active in Clerk`);
      console.log('');
    } catch (error) {
      console.log(`User ID: ${userId}`);
      console.log(`  Status: ❌ NOT FOUND IN CLERK (Test account or deleted)`);
      console.log('');
    }
  }
}

checkAllUsers().catch(console.error);
