/**
 * Verify attribution records in database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAttribution() {
  console.log('==============================================');
  console.log('ATTRIBUTION VERIFICATION');
  console.log('==============================================');

  // Check the contact form submission we just made
  console.log('\n=== RECENT CRM CONTACTS ===');
  const contacts = await prisma.cRMContact.findMany({
    where: {
      email: 'ira@irawatkins.com'
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      firstName: true,
      email: true,
      source: true,
      referrerUsername: true,
      assignedPreparerId: true,
      createdAt: true
    }
  });

  if (contacts.length === 0) {
    console.log('❌ No CRM contacts found for ira@irawatkins.com');
  } else {
    contacts.forEach(c => {
      console.log(`\n✅ Contact: ${c.firstName || 'N/A'}`);
      console.log(`   ID: ${c.id}`);
      console.log(`   Email: ${c.email}`);
      console.log(`   Source: ${c.source}`);
      console.log(`   Referrer Username: ${c.referrerUsername || 'NOT SET'}`);
      console.log(`   Assigned Preparer ID: ${c.assignedPreparerId || 'NOT SET'}`);
      console.log(`   Created: ${c.createdAt}`);
    });
  }

  // Check tax intake leads
  console.log('\n\n=== RECENT TAX INTAKE LEADS ===');
  const leads = await prisma.taxIntakeLead.findMany({
    where: {
      email: 'ira@irawatkins.com'
    },
    orderBy: { created_at: 'desc' },
    take: 5,
    select: {
      id: true,
      first_name: true,
      email: true,
      referrerUsername: true,
      referrerType: true,
      attributionMethod: true,
      assignedPreparerId: true,
      created_at: true
    }
  });

  if (leads.length === 0) {
    console.log('❌ No tax intake leads found for ira@irawatkins.com');
  } else {
    leads.forEach(l => {
      console.log(`\n✅ Lead: ${l.first_name || 'N/A'}`);
      console.log(`   ID: ${l.id}`);
      console.log(`   Email: ${l.email}`);
      console.log(`   Referrer Username: ${l.referrerUsername || 'NOT SET'}`);
      console.log(`   Referrer Type: ${l.referrerType || 'NOT SET'}`);
      console.log(`   Attribution Method: ${l.attributionMethod || 'NOT SET'}`);
      console.log(`   Assigned Preparer ID: ${l.assignedPreparerId || 'NOT SET'}`);
      console.log(`   Created: ${l.created_at}`);
    });
  }

  // Check marketing link click counts
  console.log('\n\n=== MARKETING LINK STATS (ow-*) ===');
  const owProfile = await prisma.profile.findFirst({
    where: { customTrackingCode: 'ow' }
  });

  if (owProfile) {
    const links = await prisma.marketingLink.findMany({
      where: { creatorId: owProfile.id }
    });

    links.forEach(link => {
      console.log(`\n📊 ${link.code}`);
      console.log(`   URL: ${link.url}`);
      console.log(`   Clicks: ${link.clicks}`);
      console.log(`   Conversions: ${link.conversions}`);
    });
  }

  // Check Owliver Owl's preparer profile
  console.log('\n\n=== OWLIVER OWL PROFILE ===');
  if (owProfile) {
    console.log(`   ID: ${owProfile.id}`);
    console.log(`   Tracking Code: ${owProfile.customTrackingCode}`);
    console.log(`   Role: ${owProfile.role}`);
    console.log(`   Avatar URL: ${owProfile.avatarUrl ? 'SET' : 'NOT SET'}`);
    console.log(`   QR Code URL: ${owProfile.qrCodeImageUrl ? 'SET' : 'NOT SET'}`);
  }

  await prisma.$disconnect();
}

verifyAttribution().catch(console.error);
