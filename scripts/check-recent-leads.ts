import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentLeads() {
  // Check recent CRM contacts
  console.log('=== RECENT CRM CONTACTS (last 15) ===');
  const recentContacts = await prisma.cRMContact.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      source: true,
      contactType: true,
      stage: true,
      assignedPreparerId: true,
      referrerUsername: true,
      createdAt: true,
    }
  });

  // Get preparer names
  const preparerIds = [...new Set(recentContacts.map(c => c.assignedPreparerId).filter(Boolean))];
  const preparers = await prisma.profile.findMany({
    where: { id: { in: preparerIds as string[] } },
    select: { id: true, firstName: true, lastName: true, customTrackingCode: true }
  });
  const preparerMap = new Map(preparers.map(p => [p.id, p]));

  recentContacts.forEach((c, i) => {
    const preparer = c.assignedPreparerId ? preparerMap.get(c.assignedPreparerId) : null;
    const preparerName = preparer ? `${preparer.firstName} ${preparer.lastName} (${preparer.customTrackingCode})` : 'NONE';

    console.log('');
    console.log(`${i+1}. ${c.firstName || ''} ${c.lastName || ''}`);
    console.log(`   Email: ${c.email}`);
    console.log(`   Phone: ${c.phone || 'N/A'}`);
    console.log(`   Source: ${c.source}`);
    console.log(`   Type: ${c.contactType} | Stage: ${c.stage}`);
    console.log(`   Ref: ${c.referrerUsername || 'none'}`);
    console.log(`   Assigned to: ${preparerName}`);
    console.log(`   Created: ${c.createdAt}`);
  });

  // Also check TaxIntakeLead
  console.log('');
  console.log('=== RECENT TAX INTAKE LEADS (last 10) ===');
  const recentIntake = await prisma.taxIntakeLead.findMany({
    orderBy: { created_at: 'desc' },
    take: 10,
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      assignedPreparerId: true,
      referrerUsername: true,
      created_at: true,
    }
  });

  const intakePreparerIds = [...new Set(recentIntake.map(c => c.assignedPreparerId).filter(Boolean))];
  const intakePreparers = await prisma.profile.findMany({
    where: { id: { in: intakePreparerIds as string[] } },
    select: { id: true, firstName: true, lastName: true, customTrackingCode: true }
  });
  const intakePreparerMap = new Map(intakePreparers.map(p => [p.id, p]));

  recentIntake.forEach((c, i) => {
    const preparer = c.assignedPreparerId ? intakePreparerMap.get(c.assignedPreparerId) : null;
    const preparerName = preparer ? `${preparer.firstName} ${preparer.lastName} (${preparer.customTrackingCode})` : 'NONE';

    console.log(`${i+1}. ${c.first_name || ''} ${c.last_name || ''} - ${c.email} | Ref: ${c.referrerUsername || 'none'} | Preparer: ${preparerName}`);
  });

  await prisma.$disconnect();
}

checkRecentLeads().catch(console.error);
