#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying CRM data...\n');

  // Get all CRM contacts with their linked profiles
  const contacts = await prisma.cRMContact.findMany({
    orderBy: { email: 'asc' },
  });

  console.log('CRM Contacts:');
  console.log('─'.repeat(80));
  console.log('Email'.padEnd(35) + 'Name'.padEnd(25) + 'Type'.padEnd(12) + 'UserId');
  console.log('─'.repeat(80));
  
  for (const c of contacts) {
    console.log(
      c.email.padEnd(35) +
      `${c.firstName} ${c.lastName}`.padEnd(25) +
      c.contactType.padEnd(12) +
      (c.userId ? '✓' : '✗')
    );
  }
  
  console.log('─'.repeat(80));
  console.log(`Total: ${contacts.length} contacts\n`);
  
  // Search for specific email
  const searchEmail = 'taxgenius.tax@gmail.com';
  const searchResult = await prisma.cRMContact.findUnique({
    where: { email: searchEmail.toLowerCase() },
  });
  
  console.log(`\n🔎 Search for "${searchEmail}":`);
  if (searchResult) {
    console.log('  Found:', JSON.stringify(searchResult, null, 2));
  } else {
    console.log('  NOT FOUND');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
