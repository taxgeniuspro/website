/**
 * Setup Tax Genius Default Preparer
 *
 * Creates a default "Tax Genius" tax preparer account that all clients
 * without an assigned preparer are automatically assigned to.
 *
 * This allows Tax Genius staff to manage all unassigned clients.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up Tax Genius default preparer...\n');

  // Check if Tax Genius preparer already exists
  const existing = await prisma.profile.findFirst({
    where: {
      trackingCode: 'TGP-TAXGENIUS',
    },
  });

  if (existing) {
    console.log('✅ Tax Genius preparer already exists:');
    console.log(`   ID: ${existing.id}`);
    console.log(`   Tracking Code: ${existing.trackingCode}`);
    console.log(`   Role: ${existing.role}`);

    // Update environment variable suggestion
    console.log('\n💡 Add this to your .env.local file:');
    console.log(`TAX_GENIUS_PREPARER_ID="${existing.id}"`);

    return existing;
  }

  // Create Tax Genius preparer profile
  const taxGeniusPreparer = await prisma.profile.create({
    data: {
      role: 'TAX_PREPARER',
      firstName: 'Tax Genius',
      lastName: 'Team',
      phone: '+1 404-627-1015',
      companyName: 'Tax Genius Pro',
      licenseNo: 'TGP-SYSTEM-001',
      trackingCode: 'TGP-TAXGENIUS',
      customTrackingCode: 'taxgenius',
      trackingCodeChanged: true,
      shortLinkUsername: 'taxgenius',
      shortLinkUsernameChanged: true,
      bio: 'Official Tax Genius Pro team account. All clients are assigned here by default until transferred to a specific tax preparer.',
    },
  });

  console.log('✅ Tax Genius preparer created successfully!');
  console.log(`   ID: ${taxGeniusPreparer.id}`);
  console.log(`   Tracking Code: ${taxGeniusPreparer.trackingCode}`);
  console.log(`   Username: ${taxGeniusPreparer.shortLinkUsername}`);

  console.log('\n💡 Add this to your .env.local file:');
  console.log(`TAX_GENIUS_PREPARER_ID="${taxGeniusPreparer.id}"`);

  console.log('\n✨ Setup complete! Clients will now be auto-assigned to Tax Genius team.');

  return taxGeniusPreparer;
}

main()
  .catch((error) => {
    console.error('❌ Error setting up Tax Genius preparer:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
