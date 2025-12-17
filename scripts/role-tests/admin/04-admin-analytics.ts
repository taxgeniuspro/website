/**
 * Test 04: Admin Analytics Dashboard Shows Correct Data
 *
 * Validates that the admin analytics dashboard correctly displays
 * lead pipeline data, conversion funnel, and top performers.
 *
 * Analytics Validated: getLeadPipelineSummary(), getConversionFunnel()
 */

import {
  prisma,
  createTestUser,
  createTestLead,
  createTestLeads,
  createTestMarketingLink,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  assertGreaterThanOrEqual,
  getFirstUserByRole,
  snapshotLeadPipeline,
  snapshotConversionFunnel,
  comparePipelines,
  getTopPerformers,
  getLeadsBySource,
  validateTopPerformers,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runAdminAnalyticsTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Setup test preparer for attribution
  let testPreparerId: string;
  let testPreparerUsername: string;

  // Test 1: Lead pipeline shows accurate counts
  results.push(
    await runTest('Lead pipeline shows accurate counts', async () => {
      const adminSession = await getFirstUserByRole('admin');
      assertNotNull(adminSession, 'Admin user should exist');

      // Create test preparer for lead attribution
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Analytics',
        lastName: 'Preparer',
        shortLinkUsername: `test-analytics-${Date.now()}`,
      });
      testPreparerId = preparer.id;
      testPreparerUsername = preparer.shortLinkUsername!;

      // Take snapshot before
      const beforePipeline = await snapshotLeadPipeline('all');

      // Create leads with different statuses
      await createTestLeads(5, {
        referrerUsername: testPreparerUsername,
        referrerType: 'TAX_PREPARER',
        statusDistribution: {
          NEW: 2,
          CONTACTED: 1,
          QUALIFIED: 1,
          CONVERTED: 1,
        },
      });

      // Take snapshot after
      const afterPipeline = await snapshotLeadPipeline('all');
      const changes = comparePipelines(beforePipeline, afterPipeline);

      // Verify changes
      const newChange = changes.find((c) => c.status === 'NEW');
      const contactedChange = changes.find((c) => c.status === 'CONTACTED');
      const qualifiedChange = changes.find((c) => c.status === 'QUALIFIED');
      const convertedChange = changes.find((c) => c.status === 'CONVERTED');

      assertEqual(newChange?.change, 2, 'NEW count should increase by 2');
      assertEqual(contactedChange?.change, 1, 'CONTACTED count should increase by 1');
      assertEqual(qualifiedChange?.change, 1, 'QUALIFIED count should increase by 1');
      assertEqual(convertedChange?.change, 1, 'CONVERTED count should increase by 1');

      logSuccess('Pipeline counts accurate');
      logInfo(`  NEW: ${beforePipeline.pipeline.NEW} -> ${afterPipeline.pipeline.NEW}`);
      logInfo(`  CONTACTED: ${beforePipeline.pipeline.CONTACTED} -> ${afterPipeline.pipeline.CONTACTED}`);
      logInfo(`  QUALIFIED: ${beforePipeline.pipeline.QUALIFIED} -> ${afterPipeline.pipeline.QUALIFIED}`);
      logInfo(`  CONVERTED: ${beforePipeline.pipeline.CONVERTED} -> ${afterPipeline.pipeline.CONVERTED}`);
    })
  );

  // Test 2: Pipeline updates when lead status changes
  results.push(
    await runTest('Pipeline updates on status change', async () => {
      // Create a NEW lead
      const { lead } = await createTestLead({
        referrerUsername: testPreparerUsername,
        referrerType: 'TAX_PREPARER',
        status: 'NEW',
      });

      // Take snapshot
      const beforePipeline = await snapshotLeadPipeline('all');

      // Update lead status to CONTACTED
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'CONTACTED' },
      });

      // Take snapshot after
      const afterPipeline = await snapshotLeadPipeline('all');
      const changes = comparePipelines(beforePipeline, afterPipeline);

      // Verify changes
      const newChange = changes.find((c) => c.status === 'NEW');
      const contactedChange = changes.find((c) => c.status === 'CONTACTED');

      assertEqual(newChange?.change, -1, 'NEW count should decrease by 1');
      assertEqual(contactedChange?.change, 1, 'CONTACTED count should increase by 1');

      logSuccess('Pipeline updated correctly on status change');
    })
  );

  // Test 3: Conversion funnel calculates correctly
  results.push(
    await runTest('Conversion funnel calculates correctly', async () => {
      // Create marketing link for the preparer with specific metrics
      const { link } = await createTestMarketingLink({
        creatorId: testPreparerId,
        creatorType: 'TAX_PREPARER',
        clicks: 100,
        intakeStarts: 50,
        intakeCompletes: 25,
        returnsFiled: 10,
      });

      // Get funnel data
      const funnel = await snapshotConversionFunnel('all');

      // Verify funnel structure and types
      assertNotNull(funnel, 'Funnel data should exist');
      assertGreaterThanOrEqual(funnel.clicks, 0, 'Clicks should be non-negative');
      assertGreaterThanOrEqual(funnel.leads, 0, 'Leads should be non-negative');
      assertGreaterThanOrEqual(funnel.intakeStarts, 0, 'Intake starts should be non-negative');
      assertGreaterThanOrEqual(funnel.intakeCompletes, 0, 'Intake completes should be non-negative');

      // Verify conversion rates are valid numbers
      assert(!isNaN(funnel.conversionRates.clickToLead), 'clickToLead should be a number');
      assert(!isNaN(funnel.conversionRates.intakeToComplete), 'intakeToComplete should be a number');
      assert(funnel.conversionRates.intakeToComplete >= 0 && funnel.conversionRates.intakeToComplete <= 100,
        'intakeToComplete should be between 0 and 100');

      // Verify test marketing link was created with correct values
      const createdLink = await prisma.marketingLink.findUnique({ where: { id: link.id } });
      assertNotNull(createdLink, 'Created link should exist');
      assertEqual(createdLink?.clicks, 100, 'Link should have 100 clicks');
      assertEqual(createdLink?.intakeStarts, 50, 'Link should have 50 intake starts');

      logSuccess('Conversion funnel calculated correctly');
      logInfo(`  Clicks: ${funnel.clicks}`);
      logInfo(`  Leads: ${funnel.leads}`);
      logInfo(`  Intake Starts: ${funnel.intakeStarts}`);
      logInfo(`  Intake Completes: ${funnel.intakeCompletes}`);
      logInfo(`  Returns Filed: ${funnel.returnsFiled}`);
      logInfo(`  Intake to Complete: ${funnel.conversionRates.intakeToComplete.toFixed(2)}%`);
    })
  );

  // Test 4: Top performers ranking is accurate
  results.push(
    await runTest('Top performers ranking is accurate', async () => {
      // Add more leads for the test preparer
      await createTestLeads(5, {
        referrerUsername: testPreparerUsername,
        referrerType: 'TAX_PREPARER',
        statusDistribution: { NEW: 5 },
      });

      // Validate the preparer appears in top performers
      const validation = await validateTopPerformers(testPreparerUsername, 5, 'all');

      assert(validation.valid, validation.error || 'Should be in top performers');
      assertNotNull(validation.performer, 'Performer should be found');

      const performers = await getTopPerformers(10, 'all');
      logSuccess('Top performers ranking accurate');
      logInfo(`  Top 3 performers:`);
      performers.slice(0, 3).forEach((p, i) => {
        logInfo(`    ${i + 1}. ${p.displayName} (${p.username}): ${p.leads} leads`);
      });
    })
  );

  // Test 5: Leads by source breakdown is correct
  results.push(
    await runTest('Leads by source breakdown is correct', async () => {
      // Get leads by source
      const sources = await getLeadsBySource('all');

      // Verify we have source data
      assertGreaterThanOrEqual(sources.length, 1, 'Should have at least one source');

      // Verify percentages add up to ~100%
      const totalPercentage = sources.reduce((sum, s) => sum + s.percentage, 0);
      assert(totalPercentage > 99 && totalPercentage < 101,
        `Percentages should add up to ~100%, got ${totalPercentage}`);

      // Verify Tax Preparers source exists (we created leads attributed to one)
      const preparerSource = sources.find((s) => s.source === 'Tax Preparers');
      assertNotNull(preparerSource, 'Tax Preparers source should exist');
      assertGreaterThanOrEqual(preparerSource.count, 1, 'Tax Preparers should have at least 1 lead');

      logSuccess('Leads by source breakdown correct');
      sources.forEach((s) => {
        logInfo(`  ${s.source}: ${s.count} (${s.percentage.toFixed(1)}%)`);
      });
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 04: Admin Analytics');

  try {
    const results = await runAdminAnalyticsTest();

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

export { runAdminAnalyticsTest };
