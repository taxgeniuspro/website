#!/usr/bin/env tsx
/**
 * Fix CRM Contact Types to match Profile roles
 */
import { PrismaClient, ContactType, UserRole } from '@prisma/client';
const prisma = new PrismaClient();

function roleToContactType(role: UserRole): ContactType {
  switch (role) {
    case 'admin':
      return ContactType.PREPARER; // Admins are treated as preparers in CRM
    case 'tax_preparer':
      return ContactType.PREPARER;
    case 'affiliate':
      return ContactType.AFFILIATE;
    case 'client':
    default:
      return ContactType.CLIENT;
  }
}

async function main() {
  console.log('🔧 Fixing CRM contact types to match Profile roles...\n');

  // Get all CRM contacts with userId
  const contacts = await prisma.cRMContact.findMany({
    where: { userId: { not: null } },
  });

  console.log(`Found ${contacts.length} CRM contacts with userId\n`);

  let updated = 0;
  for (const contact of contacts) {
    // Get the profile for this user
    const profile = await prisma.profile.findUnique({
      where: { userId: contact.userId! },
    });

    if (!profile) {
      console.log(`❌ No profile for userId: ${contact.userId}`);
      continue;
    }

    const expectedType = roleToContactType(profile.role);
    
    if (contact.contactType !== expectedType) {
      await prisma.cRMContact.update({
        where: { id: contact.id },
        data: { contactType: expectedType },
      });
      console.log(`✅ Updated ${contact.email}: ${contact.contactType} → ${expectedType}`);
      updated++;
    } else {
      console.log(`✓ ${contact.email} already correct: ${contact.contactType}`);
    }
  }

  console.log(`\n🎉 Updated ${updated} contacts`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
