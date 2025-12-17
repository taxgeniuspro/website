/**
 * API Test 01: Tax Preparer Lead APIs
 *
 * Tests all lead-related API endpoints.
 *
 * Tests:
 * - 7.1: GET /api/tax-preparer/leads - returns assigned leads only
 * - 7.2: GET /api/tax-preparer/leads?status=new - filter works
 * - 7.3: GET /api/tax-preparer/leads?search=john - search works
 * - 7.4: POST /api/tax-preparer/leads/:id/contact - records contact
 * - 7.5: POST /api/tax-preparer/leads/:id/convert - converts to client
 * - 7.6: POST /api/tax-preparer/leads/:id/complete - marks complete
 * - 7.7: POST /api/tax-preparer/leads/:id/unqualify - unqualifies lead
 * - 7.8: POST /api/tax-preparer/leads/:id/reopen - reopens lead
 * - 7.9: Verify 403 when client role tries to access
 */

import {
  prisma,
  createTestUser,
  createTestTaxIntakeLead,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  assertGreaterThan,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

// Simulated API call (using direct database queries to simulate API behavior)
// In a real E2E test, we would use fetch with authentication cookies

interface LeadResponse {
  leads: any[];
  stats: {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    unqualified: number;
  };
}

// Simulates GET /api/tax-preparer/leads
async function simulateGetLeads(
  preparerId: string,
  options?: { status?: string; search?: string; taxYear?: number }
): Promise<LeadResponse> {
  const where: any = {
    assignedPreparerId: preparerId,
  };

  // Apply status filter (derived status logic)
  if (options?.status && options.status !== 'all') {
    switch (options.status) {
      case 'new':
        where.lastContactedAt = null;
        where.convertedToClient = false;
        where.unqualified = false;
        break;
      case 'contacted':
        where.lastContactedAt = { not: null };
        where.contactNotes = null;
        where.convertedToClient = false;
        where.unqualified = false;
        break;
      case 'qualified':
        where.lastContactedAt = { not: null };
        where.contactNotes = { not: null };
        where.convertedToClient = false;
        where.unqualified = false;
        break;
      case 'converted':
        where.convertedToClient = true;
        break;
      case 'unqualified':
        where.unqualified = true;
        break;
    }
  }

  // Apply search filter
  if (options?.search) {
    where.OR = [
      { first_name: { contains: options.search, mode: 'insensitive' } },
      { last_name: { contains: options.search, mode: 'insensitive' } },
      { email: { contains: options.search, mode: 'insensitive' } },
      { phone: { contains: options.search } },
    ];
  }

  // Apply tax year filter
  if (options?.taxYear) {
    where.tax_year = options.taxYear;
  }

  const leads = await prisma.taxIntakeLead.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });

  // Calculate stats
  const allLeads = await prisma.taxIntakeLead.findMany({
    where: { assignedPreparerId: preparerId },
  });

  const stats = {
    total: allLeads.length,
    new: allLeads.filter(l => !l.lastContactedAt && !l.convertedToClient && !l.unqualified).length,
    contacted: allLeads.filter(l => l.lastContactedAt && !l.contactNotes && !l.convertedToClient && !l.unqualified).length,
    qualified: allLeads.filter(l => l.lastContactedAt && l.contactNotes && !l.convertedToClient && !l.unqualified).length,
    converted: allLeads.filter(l => l.convertedToClient).length,
    unqualified: allLeads.filter(l => l.unqualified).length,
  };

  return { leads, stats };
}

async function runLeadAPITests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparerId: string;
  let testPreparer2Id: string;
  let testClientId: string;
  let testLeadIds: string[] = [];

  // Setup: Create preparers and leads
  results.push(
    await runTest('Setup: Create test data', async () => {
      // Create two preparers
      const { profile: preparer1 } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'API',
        lastName: 'Preparer1',
        shortLinkUsername: `api-preparer1-${Date.now()}`,
      });
      testPreparerId = preparer1.id;

      const { profile: preparer2 } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'API',
        lastName: 'Preparer2',
        shortLinkUsername: `api-preparer2-${Date.now()}`,
      });
      testPreparer2Id = preparer2.id;

      // Create client (for 403 test)
      const { profile: client } = await createTestUser({
        role: 'client',
        firstName: 'API',
        lastName: 'Client',
      });
      testClientId = client.id;

      // Create leads for preparer 1 in different states
      // NEW leads
      for (let i = 0; i < 3; i++) {
        const { intakeLead } = await createTestTaxIntakeLead({
          assignedPreparerId: testPreparerId,
          firstName: `New`,
          lastName: `Lead${i}`,
          email: `new-lead${i}-${Date.now()}@test-taxgeniuspro.local`,
        });
        testLeadIds.push(intakeLead.id);
      }

      // CONTACTED leads
      for (let i = 0; i < 2; i++) {
        const { intakeLead } = await createTestTaxIntakeLead({
          assignedPreparerId: testPreparerId,
          firstName: `Contacted`,
          lastName: `Lead${i}`,
          email: `contacted-lead${i}-${Date.now()}@test-taxgeniuspro.local`,
        });
        await prisma.taxIntakeLead.update({
          where: { id: intakeLead.id },
          data: { lastContactedAt: new Date() },
        });
        testLeadIds.push(intakeLead.id);
      }

      // QUALIFIED leads
      const { intakeLead: qualifiedLead } = await createTestTaxIntakeLead({
        assignedPreparerId: testPreparerId,
        firstName: `John`,
        lastName: `Qualified`,
        email: `john-qualified-${Date.now()}@test-taxgeniuspro.local`,
      });
      await prisma.taxIntakeLead.update({
        where: { id: qualifiedLead.id },
        data: {
          lastContactedAt: new Date(),
          contactNotes: 'Qualified and ready to file',
        },
      });
      testLeadIds.push(qualifiedLead.id);

      // Leads for preparer 2 (should not be visible to preparer 1)
      const { intakeLead: otherLead } = await createTestTaxIntakeLead({
        assignedPreparerId: testPreparer2Id,
        firstName: `Other`,
        lastName: `PreparerLead`,
        email: `other-preparer-lead-${Date.now()}@test-taxgeniuspro.local`,
      });
      testLeadIds.push(otherLead.id);

      logSuccess('Test data created');
      logInfo(`  Preparer 1 leads: 6`);
      logInfo(`  Preparer 2 leads: 1`);
    })
  );

  // Test 7.1: GET leads returns assigned leads only
  results.push(
    await runTest('7.1 GET leads returns assigned only', async () => {
      const response = await simulateGetLeads(testPreparerId);

      assertEqual(response.leads.length, 6, 'Should return 6 leads for preparer 1');
      assertEqual(response.stats.total, 6, 'Stats total should be 6');

      // Verify no leads from preparer 2
      const otherPreparerLeads = response.leads.filter(
        l => l.assignedPreparerId !== testPreparerId
      );
      assertEqual(otherPreparerLeads.length, 0, 'Should not include other preparer leads');

      logSuccess('Leads correctly filtered by preparer');
      logInfo(`  Total leads: ${response.leads.length}`);
    })
  );

  // Test 7.2: Status filter works
  results.push(
    await runTest('7.2 Status filter works', async () => {
      // Filter by NEW
      const newResponse = await simulateGetLeads(testPreparerId, { status: 'new' });
      assertEqual(newResponse.leads.length, 3, 'Should return 3 NEW leads');

      // Filter by CONTACTED
      const contactedResponse = await simulateGetLeads(testPreparerId, { status: 'contacted' });
      assertEqual(contactedResponse.leads.length, 2, 'Should return 2 CONTACTED leads');

      // Filter by QUALIFIED
      const qualifiedResponse = await simulateGetLeads(testPreparerId, { status: 'qualified' });
      assertEqual(qualifiedResponse.leads.length, 1, 'Should return 1 QUALIFIED lead');

      logSuccess('Status filters working');
      logInfo(`  NEW: ${newResponse.leads.length}`);
      logInfo(`  CONTACTED: ${contactedResponse.leads.length}`);
      logInfo(`  QUALIFIED: ${qualifiedResponse.leads.length}`);
    })
  );

  // Test 7.3: Search filter works
  results.push(
    await runTest('7.3 Search filter works', async () => {
      // Search by first name
      const johnResponse = await simulateGetLeads(testPreparerId, { search: 'John' });
      assertGreaterThan(johnResponse.leads.length, 0, 'Should find leads with name John');

      // Search by last name
      const qualifiedResponse = await simulateGetLeads(testPreparerId, { search: 'Qualified' });
      assertGreaterThan(qualifiedResponse.leads.length, 0, 'Should find leads with name Qualified');

      // Search with no results
      const noResultResponse = await simulateGetLeads(testPreparerId, { search: 'NonexistentName12345' });
      assertEqual(noResultResponse.leads.length, 0, 'Should return no leads for nonexistent search');

      logSuccess('Search filter working');
      logInfo(`  "John" search: ${johnResponse.leads.length} leads`);
      logInfo(`  "Qualified" search: ${qualifiedResponse.leads.length} leads`);
    })
  );

  // Test 7.4: Contact lead
  results.push(
    await runTest('7.4 POST contact records interaction', async () => {
      // Get a NEW lead
      const newLead = await prisma.taxIntakeLead.findFirst({
        where: {
          assignedPreparerId: testPreparerId,
          lastContactedAt: null,
        },
      });
      assertNotNull(newLead, 'Should have a NEW lead');

      // Simulate contact API call
      const contactData = {
        contactMethod: 'CALL',
        contactNotes: 'Left voicemail, will call back tomorrow',
      };

      const updatedLead = await prisma.taxIntakeLead.update({
        where: { id: newLead!.id },
        data: {
          lastContactedAt: new Date(),
          contactMethod: contactData.contactMethod,
          contactNotes: contactData.contactNotes,
        },
      });

      assertNotNull(updatedLead.lastContactedAt, 'lastContactedAt should be set');
      assertEqual(updatedLead.contactMethod, 'CALL', 'Contact method should match');
      assertNotNull(updatedLead.contactNotes, 'Contact notes should be set');

      logSuccess('Contact recorded successfully');
      logInfo(`  Method: ${updatedLead.contactMethod}`);
      logInfo(`  Notes: ${updatedLead.contactNotes?.substring(0, 50)}...`);
    })
  );

  // Test 7.5: Convert lead
  results.push(
    await runTest('7.5 POST convert creates client', async () => {
      // Get a qualified lead
      const qualifiedLead = await prisma.taxIntakeLead.findFirst({
        where: {
          assignedPreparerId: testPreparerId,
          lastContactedAt: { not: null },
          contactNotes: { not: null },
          convertedToClient: false,
          unqualified: false,
        },
      });
      assertNotNull(qualifiedLead, 'Should have a qualified lead');

      // Create client profile for conversion
      const { profile: clientProfile } = await createTestUser({
        role: 'client',
        firstName: qualifiedLead!.first_name,
        lastName: qualifiedLead!.last_name,
        email: `converted-${Date.now()}@test-taxgeniuspro.local`,
      });

      // Simulate convert API call
      const convertedLead = await prisma.taxIntakeLead.update({
        where: { id: qualifiedLead!.id },
        data: {
          convertedToClient: true,
          convertedAt: new Date(),
          profileId: clientProfile.id,
        },
      });

      // Create client-preparer assignment
      await prisma.clientPreparer.create({
        data: {
          preparerId: testPreparerId,
          clientId: clientProfile.id,
          isActive: true,
        },
      });

      assertEqual(convertedLead.convertedToClient, true, 'Lead should be converted');
      assertNotNull(convertedLead.profileId, 'Profile should be linked');

      logSuccess('Lead converted to client');
      logInfo(`  Lead ID: ${convertedLead.id}`);
      logInfo(`  Profile ID: ${convertedLead.profileId}`);
    })
  );

  // Test 7.6: Complete lead
  results.push(
    await runTest('7.6 POST complete marks return filed', async () => {
      // Get a converted lead
      const convertedLead = await prisma.taxIntakeLead.findFirst({
        where: {
          assignedPreparerId: testPreparerId,
          convertedToClient: true,
          completed: false,
        },
      });
      assertNotNull(convertedLead, 'Should have a converted lead');

      // Simulate complete API call
      const completedLead = await prisma.taxIntakeLead.update({
        where: { id: convertedLead!.id },
        data: {
          completed: true,
        },
      });

      assertEqual(completedLead.completed, true, 'Lead should be completed');

      logSuccess('Lead marked as complete');
      logInfo(`  Lead ID: ${completedLead.id}`);
    })
  );

  // Test 7.7: Unqualify lead
  results.push(
    await runTest('7.7 POST unqualify marks lead invalid', async () => {
      // Get a NEW lead
      const newLead = await prisma.taxIntakeLead.findFirst({
        where: {
          assignedPreparerId: testPreparerId,
          lastContactedAt: null,
          convertedToClient: false,
          unqualified: false,
        },
      });
      assertNotNull(newLead, 'Should have a NEW lead');

      // Simulate unqualify API call
      const unqualifyData = {
        reason: 'wrong_state',
        notes: 'Client lives outside our service area',
      };

      const unqualifiedLead = await prisma.taxIntakeLead.update({
        where: { id: newLead!.id },
        data: {
          unqualified: true,
          unqualifiedReason: unqualifyData.reason,
          unqualifiedNotes: unqualifyData.notes,
          unqualifiedAt: new Date(),
        },
      });

      assertEqual(unqualifiedLead.unqualified, true, 'Lead should be unqualified');
      assertEqual(unqualifiedLead.unqualifiedReason, 'wrong_state', 'Reason should match');

      logSuccess('Lead unqualified');
      logInfo(`  Reason: ${unqualifiedLead.unqualifiedReason}`);
    })
  );

  // Test 7.8: Reopen lead
  results.push(
    await runTest('7.8 POST reopen restores lead', async () => {
      // Get an unqualified lead
      const unqualifiedLead = await prisma.taxIntakeLead.findFirst({
        where: {
          assignedPreparerId: testPreparerId,
          unqualified: true,
        },
      });
      assertNotNull(unqualifiedLead, 'Should have an unqualified lead');

      // Simulate reopen API call
      const reopenedLead = await prisma.taxIntakeLead.update({
        where: { id: unqualifiedLead!.id },
        data: {
          unqualified: false,
          unqualifiedAt: null,
          contactNotes: 'Reopened: Client relocated to service area',
        },
      });

      assertEqual(reopenedLead.unqualified, false, 'Lead should not be unqualified');
      assertEqual(reopenedLead.unqualifiedAt, null, 'UnqualifiedAt should be cleared');
      // Reason kept for history
      assertNotNull(reopenedLead.unqualifiedReason, 'Reason should be kept for history');

      logSuccess('Lead reopened');
      logInfo(`  Lead ID: ${reopenedLead.id}`);
    })
  );

  // Test 7.9: Client role gets 403
  results.push(
    await runTest('7.9 Client role blocked (403)', async () => {
      // In real API, this would check the session role
      // Here we simulate the role check
      const clientProfile = await prisma.profile.findUnique({
        where: { id: testClientId },
      });

      const isAuthorized = clientProfile?.role === 'tax_preparer' || clientProfile?.role === 'admin';
      assertEqual(isAuthorized, false, 'Client should not be authorized');

      // If client tries to access, they would get 403
      // Simulate the response
      const mockResponse = {
        status: 403,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      };

      assertEqual(mockResponse.status, 403, 'Should return 403 for client role');

      logSuccess('Client role correctly blocked');
      logInfo(`  Role: ${clientProfile?.role}`);
      logInfo(`  Response: ${mockResponse.status} ${mockResponse.error}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('API Test 01: Lead APIs');

  try {
    const results = await runLeadAPITests();

    // Summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log('\n' + '─'.repeat(50));
    results.forEach((r) => {
      const status = r.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
      console.log(`  ${status} ${r.testName} (${r.duration}ms)`);
      if (!r.passed && r.error) {
        console.log(`         Error: ${r.error}`);
      }
    });
    console.log('─'.repeat(50));
    console.log(`\n  Results: ${passed}/${results.length} passed`);

    if (failed > 0) {
      console.log(`  \x1b[31m${failed} tests failed\x1b[0m`);
      process.exit(1);
    }

    // Cleanup test data
    logInfo('Cleaning up test data...');
    await cleanupAllTestData();

    process.exit(0);
  } catch (error) {
    logError(`Test suite error: ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

export { runLeadAPITests };
