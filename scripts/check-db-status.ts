#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking database status...\n');

  // Check tables
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  ` as any[];
  
  console.log('📋 Tables in database:');
  tables.forEach((t: any) => console.log('   -', t.table_name));
  
  // Check if CRM tables exist
  const crmTables = ['CRMContact', 'CRMInteraction', 'CRMTask', 'CRMTag', 'CRMContactTag', 'CRMStageHistory', 'CRMLeadScore'];
  console.log('\n🔎 CRM Tables Status:');
  for (const tableName of crmTables) {
    const exists = tables.some((t: any) => t.table_name === tableName);
    console.log(`   ${exists ? '✅' : '❌'} ${tableName}`);
  }
  
  // Count core tables
  console.log('\n📊 Core Data Counts:');
  try {
    const userCount = await prisma.user.count();
    console.log('   Users:', userCount);
  } catch (e) {
    console.log('   Users: ERROR -', (e as Error).message);
  }
  
  try {
    const profileCount = await prisma.profile.count();
    console.log('   Profiles:', profileCount);
  } catch (e) {
    console.log('   Profiles: ERROR -', (e as Error).message);
  }
  
  try {
    const leadCount = await prisma.taxIntakeLead.count();
    console.log('   TaxIntakeLeads:', leadCount);
  } catch (e) {
    console.log('   TaxIntakeLeads: ERROR -', (e as Error).message);
  }
  
  // Try CRM count
  console.log('\n🎯 CRM Data:');
  try {
    const crmCount = await prisma.cRMContact.count();
    console.log('   CRMContacts:', crmCount);
  } catch (e: any) {
    if (e.code === 'P2010' || e.message?.includes('does not exist')) {
      console.log('   CRMContacts: TABLE DOES NOT EXIST');
    } else {
      console.log('   CRMContacts: ERROR -', e.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
