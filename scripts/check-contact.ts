import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contactId = process.argv[2] || 'cmjcr19dl0001jp04tcpk8p4u';

  console.log('='.repeat(80));
  console.log('CHECK CRM CONTACT');
  console.log('Contact ID:', contactId);
  console.log('='.repeat(80));

  // Get the contact
  const contact = await prisma.cRMContact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      assignedPreparerId: true,
      createdAt: true,
    },
  });

  if (!contact) {
    console.log('❌ Contact not found');
    await prisma.$disconnect();
    return;
  }

  console.log('\nContact Details:');
  console.log(`  Name: ${contact.firstName} ${contact.lastName}`);
  console.log(`  Email: ${contact.email}`);
  console.log(`  Assigned Preparer ID: ${contact.assignedPreparerId || 'NULL'}`);
  console.log(`  Created: ${contact.createdAt}`);

  // Get the assigned preparer info
  if (contact.assignedPreparerId) {
    const preparer = await prisma.profile.findUnique({
      where: { id: contact.assignedPreparerId },
      include: { user: { select: { email: true } } },
    });
    console.log('\nAssigned Preparer:');
    console.log(`  Name: ${preparer?.firstName} ${preparer?.lastName}`);
    console.log(`  Email: ${preparer?.user?.email}`);
    console.log(`  Profile ID: ${preparer?.id}`);
  }

  // Get matching TaxIntakeLead
  const lead = await prisma.taxIntakeLead.findFirst({
    where: { email: { equals: contact.email, mode: 'insensitive' } },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      email: true,
      assignedPreparerId: true,
      completed: true,
    },
  });

  if (lead) {
    console.log('\nMatching TaxIntakeLead:');
    console.log(`  Lead ID: ${lead.id}`);
    console.log(`  Email: ${lead.email}`);
    console.log(`  Completed: ${lead.completed}`);
    console.log(`  Assigned Preparer ID: ${lead.assignedPreparerId || 'NULL'}`);

    if (lead.assignedPreparerId) {
      const leadPreparer = await prisma.profile.findUnique({
        where: { id: lead.assignedPreparerId },
        include: { user: { select: { email: true } } },
      });
      console.log(`  Preparer Name: ${leadPreparer?.firstName} ${leadPreparer?.lastName}`);
    }
  } else {
    console.log('\n⚠️  No matching TaxIntakeLead found');
  }

  // Show all tax preparers for reference
  console.log('\n=== ALL TAX PREPARERS ===');
  const preparers = await prisma.profile.findMany({
    where: { role: 'TAX_PREPARER' },
    include: { user: { select: { email: true, id: true } } },
    orderBy: { firstName: 'asc' },
  });

  for (const p of preparers) {
    console.log(`${p.firstName} ${p.lastName} | Profile.id: ${p.id} | User.id: ${p.user?.id} | Email: ${p.user?.email}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
