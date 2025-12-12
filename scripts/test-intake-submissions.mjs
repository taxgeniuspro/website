/**
 * Test Script: Submit 4 Intake Forms for Iran Watkins
 *
 * This script tests the complete intake form flow:
 * 1. Submits 4 test clients via /api/tax-intake/lead
 * 2. Uses Iran Watkins as the assigned tax preparer (ref=iw1)
 * 3. Verifies database records are created
 * 4. Checks folder structure
 *
 * Run: DATABASE_URL='postgresql://taxgeniuspro_user:TaxGenius2024Secure@72.60.28.175:5435/taxgeniuspro_db?schema=public' node scripts/test-intake-submissions.mjs
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Production URL for the API
const API_BASE_URL = 'https://taxgeniuspro.tax';

// Iran Watkins tracking code
const PREPARER_CODE = 'iw1';

// Test clients data
const testClients = [
  {
    name: 'Test 1: Basic Intake',
    data: {
      first_name: 'John',
      last_name: 'Test',
      email: 'johntest1@testintake.com',
      phone: '4045551001',
      country_code: '+1',
      address_line_1: '123 Test Street',
      city: 'Atlanta',
      state: 'GA',
      zip_code: '30301',
      filing_status: 'single',
      locale: 'en',
    },
  },
  {
    name: 'Test 2: Full Intake with More Data',
    data: {
      first_name: 'Maria',
      last_name: 'Garcia',
      middle_name: 'Elena',
      email: 'mariagarcia2@testintake.com',
      phone: '4045551002',
      country_code: '+1',
      address_line_1: '456 Main Avenue',
      address_line_2: 'Apt 2B',
      city: 'Atlanta',
      state: 'GA',
      zip_code: '30302',
      filing_status: 'married_filing_jointly',
      date_of_birth: '1985-06-15',
      ssn_last_four: '1234',
      occupation: 'Marketing Manager',
      employer_name: 'Tech Corp',
      locale: 'en',
      // Additional form data
      has_w2: true,
      has_1099: false,
      has_dependents: true,
      number_of_dependents: 2,
      notes: 'First time using Tax Genius Pro. Very excited!',
    },
  },
  {
    name: 'Test 3: Complex Case with Dependents',
    data: {
      first_name: 'Robert',
      last_name: 'Johnson',
      middle_name: 'James',
      email: 'robertjohnson3@testintake.com',
      phone: '4045551003',
      country_code: '+1',
      address_line_1: '789 Oak Boulevard',
      city: 'Marietta',
      state: 'GA',
      zip_code: '30060',
      filing_status: 'head_of_household',
      date_of_birth: '1978-03-22',
      ssn_last_four: '5678',
      occupation: 'Self-Employed Contractor',
      employer_name: 'Johnson Construction LLC',
      locale: 'en',
      // Complex tax situation
      has_w2: true,
      has_1099: true,
      has_self_employment: true,
      has_dependents: true,
      number_of_dependents: 3,
      dependents: [
        { name: 'Sarah Johnson', relationship: 'daughter', age: 16, ssn_last_four: '1111' },
        { name: 'Michael Johnson', relationship: 'son', age: 12, ssn_last_four: '2222' },
        { name: 'Emily Johnson', relationship: 'daughter', age: 8, ssn_last_four: '3333' },
      ],
      estimated_income: 85000,
      notes: 'Self-employed contractor with three children. Need help with business deductions.',
    },
  },
  {
    name: 'Test 4: Edge Case - Special Characters',
    data: {
      first_name: 'José',
      last_name: "O'Brien-Smith",
      middle_name: 'María',
      email: 'jose4@testintake.com',
      phone: '4045551004',
      country_code: '+1',
      address_line_1: "1234 St. Patrick's Way",
      address_line_2: 'Suite #500',
      city: 'Décatur',
      state: 'GA',
      zip_code: '30030',
      filing_status: 'married_filing_separately',
      date_of_birth: '1990-12-25',
      ssn_last_four: '9999',
      occupation: 'Café Owner & Restaurant Manager',
      employer_name: "José's Coffee & Más LLC",
      locale: 'es',
      // Edge case data
      has_w2: false,
      has_1099: true,
      has_self_employment: true,
      has_dependents: true,
      number_of_dependents: 1,
      dependents: [
        { name: 'Sofía O\'Brien-Smith', relationship: 'daughter', age: 5, ssn_last_four: '4444' },
      ],
      estimated_income: 120000,
      notes: 'Café owner with special characters in name. Testing: áéíóú ñ ¿¡ @#$%^&*(). Long note to test field limits. '.repeat(5),
    },
  },
];

async function getIranWatkinsProfile() {
  console.log('\\n📋 Looking up Iran Watkins profile...');

  const user = await prisma.user.findUnique({
    where: { email: 'iradwatkins+iw1@gmail.com' },
    include: { profile: true },
  });

  if (!user) {
    throw new Error('Iran Watkins user not found!');
  }

  if (!user.profile) {
    throw new Error('Iran Watkins profile not found!');
  }

  console.log(`✅ Found Iran Watkins:`);
  console.log(`   User ID: ${user.id}`);
  console.log(`   Profile ID: ${user.profile.id}`);
  console.log(`   Tracking Code: ${user.profile.customTrackingCode || user.profile.trackingCode}`);

  // Return both user and profile info
  return { userId: user.id, profileId: user.profile.id, profile: user.profile };
}

async function submitIntakeForm(clientData, preparerCode) {
  const url = `${API_BASE_URL}/api/tax-intake/lead?ref=${preparerCode}`;

  console.log(`\\n📝 Submitting intake for: ${clientData.first_name} ${clientData.last_name}`);
  console.log(`   URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.log(`❌ Failed: ${response.status} - ${JSON.stringify(result)}`);
      return { success: false, error: result };
    }

    console.log(`✅ Success: Lead ID = ${result.leadId || result.id || 'created'}`);
    return { success: true, data: result };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function verifyDatabaseRecords(email, preparerUserId) {
  console.log(`\\n🔍 Verifying database records for: ${email}`);

  // Check TaxIntakeLead
  const lead = await prisma.taxIntakeLead.findUnique({
    where: { email },
    include: {
      clientFolder: true,
    },
  });

  if (!lead) {
    console.log(`❌ TaxIntakeLead NOT FOUND for ${email}`);
    return { lead: false, contact: false, folder: false };
  }

  console.log(`✅ TaxIntakeLead found:`);
  console.log(`   ID: ${lead.id}`);
  console.log(`   Name: ${lead.first_name} ${lead.last_name}`);
  console.log(`   Assigned Preparer ID: ${lead.assignedPreparerId || 'null (Tax Genius)'}`);
  console.log(`   Referrer: ${lead.referrerUsername || 'none'}`);
  console.log(`   Client Folder ID: ${lead.clientFolderId || 'none'}`);

  // Check if correctly assigned to Iran (by User ID)
  if (lead.assignedPreparerId === preparerUserId) {
    console.log(`✅ Correctly assigned to Iran Watkins!`);
  } else {
    console.log(`⚠️  Not assigned to Iran (expected ${preparerUserId}, got ${lead.assignedPreparerId})`);
  }

  // Check CRMContact
  const contact = await prisma.cRMContact.findFirst({
    where: { email: email.toLowerCase() },
  });

  let contactFound = false;
  if (contact) {
    console.log(`✅ CRMContact found:`);
    console.log(`   ID: ${contact.id}`);
    console.log(`   Type: ${contact.contactType}`);
    console.log(`   Stage: ${contact.stage}`);
    console.log(`   Assigned Preparer: ${contact.assignedPreparerId || 'none'}`);
    contactFound = true;
  } else {
    console.log(`❌ CRMContact NOT found for ${email}`);
  }

  // Check Folder
  let folderFound = false;
  if (lead.clientFolder) {
    console.log(`✅ Client Folder found:`);
    console.log(`   Name: ${lead.clientFolder.name}`);
    console.log(`   Path: ${lead.clientFolder.path}`);
    folderFound = true;
  } else {
    console.log(`⚠️  Client Folder NOT linked to lead`);
  }

  return { lead: true, contact: contactFound, folder: folderFound };
}

async function checkAllFolders() {
  console.log('\\n📁 Checking all client folders...');

  const folders = await prisma.folder.findMany({
    where: {
      level: 0, // Root client folders
      name: {
        contains: 'Test',
      },
    },
    include: {
      children: true, // Year subfolders
      documents: true,
    },
    orderBy: { created_at: 'desc' },
    take: 10,
  });

  if (folders.length === 0) {
    console.log('⚠️  No test folders found yet');
    return;
  }

  console.log(`\\nFound ${folders.length} folders:`);
  for (const folder of folders) {
    console.log(`\\n📂 ${folder.name}`);
    console.log(`   Path: ${folder.path}`);
    console.log(`   Owner ID: ${folder.ownerId}`);
    console.log(`   Year subfolders: ${folder.children.length}`);
    console.log(`   Documents: ${folder.documents.length}`);

    for (const child of folder.children) {
      console.log(`   └── 📁 ${child.name}`);
    }
  }
}

async function getSummary(preparerUserId) {
  console.log('\\n📊 SUMMARY');
  console.log('='.repeat(50));

  // Count leads assigned to Iran (by User ID)
  const leadCount = await prisma.taxIntakeLead.count({
    where: {
      assignedPreparerId: preparerUserId,
      email: {
        contains: '@testintake.com',
      },
    },
  });

  console.log(`\\nLeads assigned to Iran Watkins: ${leadCount}`);

  // List all test leads
  const leads = await prisma.taxIntakeLead.findMany({
    where: {
      email: {
        contains: '@testintake.com',
      },
    },
    select: {
      email: true,
      first_name: true,
      last_name: true,
      assignedPreparerId: true,
      clientFolderId: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });

  console.log(`\\nAll test leads:`);
  for (const lead of leads) {
    const assigned = lead.assignedPreparerId === preparerUserId ? '✅ Iran' : '⚠️ Other';
    const folder = lead.clientFolderId ? '📁' : '❌';
    console.log(`  ${lead.first_name} ${lead.last_name} (${lead.email}) - ${assigned} - Folder: ${folder}`);
  }

  // Count CRM contacts
  const contactCount = await prisma.cRMContact.count({
    where: {
      email: {
        contains: '@testintake.com',
      },
    },
  });
  console.log(`\\nCRM Contacts created: ${contactCount}/4`);

  console.log('\\n' + '='.repeat(50));
  console.log('\\n🎯 Next Steps:');
  console.log('1. Login as Iran Watkins: iradwatkins+iw1@gmail.com / TaxPreparer2024!');
  console.log('2. Go to: https://taxgeniuspro.tax/en/dashboard/tax-preparer/leads');
  console.log('3. Verify all 4 test clients appear');
  console.log('4. Click "View Folder" to see document structure');
  console.log('5. Check: https://taxgeniuspro.tax/en/dashboard/tax-preparer/documents');
}

async function cleanupPreviousTests() {
  console.log('\\n🧹 Cleaning up previous test data...');

  // Delete test leads
  const deleteResult = await prisma.taxIntakeLead.deleteMany({
    where: {
      email: {
        contains: '@testintake.com',
      },
    },
  });

  console.log(`   Deleted ${deleteResult.count} previous test leads`);

  // Delete test CRM contacts
  const contactDeleteResult = await prisma.cRMContact.deleteMany({
    where: {
      email: {
        contains: '@testintake.com',
      },
    },
  });

  console.log(`   Deleted ${contactDeleteResult.count} previous test contacts`);

  // Note: Not deleting folders to preserve structure
}

async function main() {
  console.log('🚀 Tax Intake Form Test Script');
  console.log('================================');
  console.log(`Target: ${API_BASE_URL}`);
  console.log(`Preparer Code: ${PREPARER_CODE}`);

  try {
    // Get Iran's profile
    const iranData = await getIranWatkinsProfile();

    // Clean up previous tests
    await cleanupPreviousTests();

    // Submit all test forms
    console.log('\\n' + '='.repeat(50));
    console.log('SUBMITTING TEST FORMS');
    console.log('='.repeat(50));

    const results = [];
    for (const client of testClients) {
      console.log(`\\n--- ${client.name} ---`);
      const result = await submitIntakeForm(client.data, PREPARER_CODE);
      results.push({ ...client, result });

      // Small delay between submissions
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Verify database records
    console.log('\\n' + '='.repeat(50));
    console.log('VERIFYING DATABASE RECORDS');
    console.log('='.repeat(50));

    const verifyResults = [];
    for (const client of testClients) {
      const verify = await verifyDatabaseRecords(client.data.email, iranData.userId);
      verifyResults.push({ email: client.data.email, ...verify });
    }

    // Check folders
    await checkAllFolders();

    // Summary
    await getSummary(iranData.userId);

    // Final results
    console.log('\\n📋 Test Results:');
    for (const r of results) {
      const status = r.result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status} - ${r.name}`);
    }

    // Verification results
    console.log('\\n📋 Verification Results:');
    const allLeads = verifyResults.every((v) => v.lead);
    const allContacts = verifyResults.every((v) => v.contact);
    const allFolders = verifyResults.every((v) => v.folder);
    console.log(`  ${allLeads ? '✅' : '❌'} All TaxIntakeLead records: ${verifyResults.filter((v) => v.lead).length}/4`);
    console.log(`  ${allContacts ? '✅' : '❌'} All CRMContact records: ${verifyResults.filter((v) => v.contact).length}/4`);
    console.log(`  ${allFolders ? '✅' : '❌'} All Folders created: ${verifyResults.filter((v) => v.folder).length}/4`);

  } catch (error) {
    console.error('\\n❌ Fatal Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
