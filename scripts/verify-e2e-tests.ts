/**
 * Verify E2E test data in database
 * Checks that all test submissions are in CRM, leads, and intake forms
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(80));
  console.log('E2E TEST VERIFICATION');
  console.log('='.repeat(80));

  // Get Owliver's profile ID
  const owliver = await prisma.profile.findFirst({
    where: { customTrackingCode: 'ow' },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!owliver) {
    console.log('❌ Owliver profile not found');
    await prisma.$disconnect();
    return;
  }

  console.log(`\nPreparer: ${owliver.firstName} ${owliver.lastName} (ID: ${owliver.id})`);

  // Find recent test submissions (last 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  // 1. Check TaxIntakeLead records
  console.log('\n=== TAX INTAKE LEADS ===');
  const intakeLeads = await prisma.taxIntakeLead.findMany({
    where: {
      email: { contains: 'e2etest.com' },
      created_at: { gte: tenMinutesAgo },
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      completed: true,
      assignedPreparerId: true,
      full_form_data: true,
      created_at: true,
    },
  });

  console.log(`Found ${intakeLeads.length} intake leads:`);
  for (const lead of intakeLeads) {
    const formData = lead.full_form_data as Record<string, unknown> || {};
    const hasImage = !!formData.drivers_license_url || !!formData.drivers_license_image_url;
    const hasSSN = !!formData.ssn;
    const hasDOB = !!formData.date_of_birth;
    const hasFilingStatus = !!formData.filing_status;
    const hasFullData = Object.keys(formData).length > 5;
    const isAssignedToOw = lead.assignedPreparerId === owliver.id;

    console.log(`\n  ${lead.first_name} ${lead.last_name} (${lead.email})`);
    console.log(`    Completed: ${lead.completed ? '✅' : '❌'}`);
    console.log(`    SSN: ${hasSSN ? '✅' : '❌'}`);
    console.log(`    DOB: ${hasDOB ? '✅' : '❌'}`);
    console.log(`    Filing Status: ${hasFilingStatus ? '✅ ' + formData.filing_status : '❌'}`);
    console.log(`    DL Image: ${hasImage ? '✅' : '❌'}`);
    console.log(`    Full Data Fields: ${Object.keys(formData).length}`);
    console.log(`    Assigned to Owliver: ${isAssignedToOw ? '✅' : '❌ ' + lead.assignedPreparerId}`);
  }

  // 2. Check CRM Contacts
  console.log('\n=== CRM CONTACTS ===');
  const crmContacts = await prisma.cRMContact.findMany({
    where: {
      email: { contains: 'e2etest.com' },
      createdAt: { gte: tenMinutesAgo },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      source: true,
      assignedPreparerId: true,
      createdAt: true,
    },
  });

  console.log(`Found ${crmContacts.length} CRM contacts:`);
  for (const contact of crmContacts) {
    const isAssignedToOw = contact.assignedPreparerId === owliver.id;
    console.log(`\n  ${contact.firstName} ${contact.lastName || ''} (${contact.email})`);
    console.log(`    Source: ${contact.source}`);
    console.log(`    Phone: ${contact.phone || 'N/A'}`);
    console.log(`    Assigned to Owliver: ${isAssignedToOw ? '✅' : '❌ ' + contact.assignedPreparerId}`);
  }

  // 3. Check Documents
  console.log('\n=== DOCUMENTS ===');
  const documents = await prisma.document.findMany({
    where: {
      createdAt: { gte: tenMinutesAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      type: true,
      fileUrl: true,
      createdAt: true,
    },
  });

  console.log(`Found ${documents.length} recent documents:`);
  for (const doc of documents) {
    console.log(`  Type: ${doc.type}`);
    console.log(`    URL: ${doc.fileUrl?.substring(0, 60)}...`);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const completeIntakes = intakeLeads.filter(l => l.completed);
  const intakesWithAllData = intakeLeads.filter(l => {
    const formData = l.full_form_data as Record<string, unknown> || {};
    return l.completed && formData.ssn && formData.date_of_birth && formData.filing_status &&
      (formData.drivers_license_url || formData.drivers_license_image_url);
  });

  console.log(`\nTotal Intake Leads: ${intakeLeads.length}`);
  console.log(`  Complete (completed=true): ${completeIntakes.length}`);
  console.log(`  With ALL data (SSN+DOB+Filing+Image): ${intakesWithAllData.length}`);
  console.log(`Total CRM Contacts: ${crmContacts.length}`);
  console.log(`Total Documents: ${documents.length}`);

  const allPassed = intakesWithAllData.length >= 2 && crmContacts.length >= 4;
  console.log(`\n${allPassed ? '✅ ALL E2E TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  await prisma.$disconnect();
}

main().catch(console.error);
