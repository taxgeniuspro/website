import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix CRM Contact Assignments
 *
 * This script finds CRM contacts that don't have assignedPreparerId set
 * and assigns them based on their matching TaxIntakeLead record.
 */
async function main() {
  console.log('='.repeat(80));
  console.log('FIX CRM CONTACT ASSIGNMENTS');
  console.log('='.repeat(80));

  // Find all CRM contacts without assignedPreparerId
  const unassignedContacts = await prisma.cRMContact.findMany({
    where: { assignedPreparerId: null },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  console.log(`\nFound ${unassignedContacts.length} unassigned CRM contacts\n`);

  let fixed = 0;
  let noMatch = 0;

  for (const contact of unassignedContacts) {
    // Find matching TaxIntakeLead by email
    const lead = await prisma.taxIntakeLead.findFirst({
      where: { email: { equals: contact.email, mode: 'insensitive' } },
      orderBy: { created_at: 'desc' },
      select: { id: true, assignedPreparerId: true, email: true },
    });

    if (lead?.assignedPreparerId) {
      // Update the CRM contact with the preparer ID from the lead
      await prisma.cRMContact.update({
        where: { id: contact.id },
        data: { assignedPreparerId: lead.assignedPreparerId },
      });
      console.log(`✅ Fixed: ${contact.firstName} ${contact.lastName} (${contact.email}) -> Preparer: ${lead.assignedPreparerId}`);
      fixed++;
    } else {
      console.log(`⚠️  No match: ${contact.firstName} ${contact.lastName} (${contact.email})`);
      noMatch++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`SUMMARY: Fixed ${fixed} contacts, ${noMatch} could not be matched`);
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
