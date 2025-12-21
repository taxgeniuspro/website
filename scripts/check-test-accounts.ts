import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTestAccounts() {
  const testEmails = [
    'taxgenius.tax@gmail.com',
    'ira@irawatkins.com',
    'iradwatkins@gmail.com',
    'celycrypto@gmail.com'
  ];

  console.log('=== TEST ACCOUNTS STATUS ===\n');

  for (const email of testEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: {
          select: {
            id: true,
            role: true,
            affiliateStatus: true,
            customTrackingCode: true,
            trackingCodeFinalized: true,
            avatarUrl: true
          }
        }
      }
    });

    if (user) {
      const profile = user.profile;
      console.log(`✅ ${email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${profile ? profile.role : 'No profile'}`);
      console.log(`   Affiliate Status: ${profile ? profile.affiliateStatus : 'N/A'}`);
      console.log(`   Tracking Code: ${profile ? profile.customTrackingCode : 'N/A'}`);
      console.log('');
    } else {
      console.log(`❌ ${email} - NOT FOUND`);
      console.log('');
    }
  }

  // Check marketing links for Owliver Owl (ow)
  console.log('=== MARKETING LINKS FOR OW (Owliver Owl) ===\n');
  const owProfile = await prisma.profile.findFirst({
    where: { customTrackingCode: 'ow' }
  });

  if (owProfile) {
    const links = await prisma.marketingLink.findMany({
      where: { creatorId: owProfile.id }
    });

    if (links.length === 0) {
      console.log('No marketing links found for OW');
    } else {
      links.forEach(link => {
        console.log(`- ${link.code}: ${link.url}`);
        console.log(`  Clicks: ${link.clicks}, Conversions: ${link.conversions}`);
      });
    }
  } else {
    console.log('No profile with tracking code "ow" found');
  }

  // Check CRMContacts for test email
  console.log('\n=== CRM CONTACTS FOR TEST EMAIL ===\n');
  const crmContacts = await prisma.cRMContact.findMany({
    where: {
      email: { in: ['ira@irawatkins.com', 'celycrypto@gmail.com'] }
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      source: true,
      referrerUsername: true,
      createdAt: true
    }
  });

  if (crmContacts.length === 0) {
    console.log('No CRM contacts found for test emails');
  } else {
    crmContacts.forEach(c => {
      console.log(`- ${c.email}: ${c.firstName}`);
      console.log(`  Source: ${c.source}, Referrer: ${c.referrerUsername}`);
    });
  }

  // Check TaxIntakeLeads
  console.log('\n=== TAX INTAKE LEADS ===\n');
  const leads = await prisma.taxIntakeLead.findMany({
    where: {
      email: { in: ['ira@irawatkins.com', 'celycrypto@gmail.com'] }
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      referrerUsername: true,
      attributionMethod: true,
      createdAt: true
    }
  });

  if (leads.length === 0) {
    console.log('No tax intake leads found for test emails');
  } else {
    leads.forEach(l => {
      console.log(`- ${l.email}: ${l.firstName}`);
      console.log(`  Referrer: ${l.referrerUsername}, Method: ${l.attributionMethod}`);
    });
  }

  await prisma.$disconnect();
}

checkTestAccounts().catch(console.error);
