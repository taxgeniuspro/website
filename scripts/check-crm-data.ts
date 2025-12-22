#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking CRM data directly...\n');

  // Count from raw table
  const rawCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM crm_contacts` as any[];
  console.log('Raw crm_contacts count:', rawCount[0]?.count);
  
  // Count via Prisma model
  const modelCount = await prisma.cRMContact.count();
  console.log('Prisma CRMContact count:', modelCount);
  
  // List a few contacts if any
  const contacts = await prisma.cRMContact.findMany({ take: 5 });
  console.log('\nFirst 5 CRM contacts:', contacts.length > 0 ? contacts : 'NONE');
  
  // Check Users with profiles
  console.log('\n📊 Users with profiles:');
  const usersWithProfiles = await prisma.user.findMany({
    include: { profile: true },
    take: 10,
  });
  
  for (const u of usersWithProfiles) {
    console.log(`  - ${u.email} (Role: ${u.profile?.role || 'NO PROFILE'})`);
  }
  
  // Check TaxIntakeLeads
  console.log('\n📋 Tax Intake Leads:');
  const leads = await prisma.taxIntakeLead.findMany({ take: 5 });
  if (leads.length === 0) {
    console.log('  No TaxIntakeLeads found');
  } else {
    for (const l of leads) {
      console.log(`  - ${l.email} (${l.first_name} ${l.last_name})`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
