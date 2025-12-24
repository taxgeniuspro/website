import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGelisaLeads() {
  // Find Gelisa's profile
  const gelisa = await prisma.profile.findFirst({
    where: {
      OR: [
        { customTrackingCode: 'gw' },
        { user: { email: 'whitegelisa@gmail.com' } }
      ]
    },
    select: { id: true, firstName: true, lastName: true }
  });

  if (!gelisa) {
    console.log('Gelisa not found');
    await prisma.$disconnect();
    return;
  }

  console.log('=== GELISA WHITE LEAD COUNT ===');
  console.log('Profile ID:', gelisa.id);
  console.log('');

  // Count TaxIntakeLead
  const intakeLeads = await prisma.taxIntakeLead.findMany({
    where: { assignedPreparerId: gelisa.id },
    select: { id: true, email: true, first_name: true, last_name: true, created_at: true }
  });

  console.log('TaxIntakeLead count:', intakeLeads.length);

  // Count unique emails
  const uniqueEmails = new Set(intakeLeads.map(l => l.email?.toLowerCase()));
  console.log('Unique emails:', uniqueEmails.size);

  // Find duplicates
  const emailCounts: Record<string, number> = {};
  intakeLeads.forEach(l => {
    const email = l.email?.toLowerCase() || 'no-email';
    emailCounts[email] = (emailCounts[email] || 0) + 1;
  });

  const duplicates = Object.entries(emailCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log('');
    console.log('=== DUPLICATE EMAILS ===');
    duplicates.forEach(([email, count]) => {
      console.log(`${email}: ${count} entries`);
    });
  }

  // Count CRMContact
  const crmContacts = await prisma.cRMContact.count({
    where: { assignedPreparerId: gelisa.id }
  });
  console.log('');
  console.log('CRMContact count:', crmContacts);

  // List all leads
  console.log('');
  console.log('=== ALL LEADS ===');
  intakeLeads.forEach((l, i) => {
    console.log(`${i+1}. ${l.first_name || ''} ${l.last_name || ''} - ${l.email || 'no email'}`);
  });

  await prisma.$disconnect();
}

checkGelisaLeads().catch(console.error);
