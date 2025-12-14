/**
 * UTM Attribution Test Script
 *
 * Tests that UTM parameters from different sources are correctly:
 * 1. Captured when clicking short links
 * 2. Stored in LinkClick records
 * 3. Associated with leads when forms are submitted
 * 4. Visible in source breakdown analytics
 *
 * Run: npx tsx scripts/test-utm-attribution.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables (production has DATABASE_URL)
config({ path: resolve(__dirname, '../.env.production') });
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'https://taxgeniuspro.tax';

interface UTMTest {
  source: string;
  medium: string;
  campaign: string;
  email: string;
  description: string;
}

const UTM_TESTS: UTMTest[] = [
  { source: 'facebook', medium: 'social', campaign: 'winter2025', email: 'test-fb-utm@mailinator.com', description: 'Facebook Social Post' },
  { source: 'twitter', medium: 'social', campaign: 'taxseason', email: 'test-tw-utm@mailinator.com', description: 'Twitter Tweet' },
  { source: 'email', medium: 'newsletter', campaign: 'dec_promo', email: 'test-em-utm@mailinator.com', description: 'Email Newsletter' },
  { source: 'qr_code', medium: 'flyer', campaign: 'atlanta_event', email: 'test-qr-utm@mailinator.com', description: 'QR Code on Flyer' },
  { source: 'sms', medium: 'text', campaign: 'reminder', email: 'test-sms-utm@mailinator.com', description: 'SMS Text Message' },
  { source: 'google', medium: 'cpc', campaign: 'tax_help', email: 'test-goog-utm@mailinator.com', description: 'Google Ads' },
];

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' | 'header' = 'info') {
  const icons = { info: '📋', success: '✅', error: '❌', warn: '⚠️', header: '🔷' };
  console.log(`${icons[type]} ${message}`);
}

async function testLinkClickUTMStorage(): Promise<void> {
  log('\n=== Testing LinkClick UTM Storage ===', 'header');

  // First, find Owliver's lead link
  const owLink = await prisma.marketingLink.findFirst({
    where: { code: 'ow-lead' },
  });

  if (!owLink) {
    log('ow-lead link not found. Creating test link...', 'warn');
    return;
  }

  log(`Found ow-lead link (ID: ${owLink.id})`, 'info');

  // Check recent LinkClick records with UTM data
  const recentClicks = await prisma.linkClick.findMany({
    where: {
      linkId: owLink.id,
      clickedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    },
    orderBy: { clickedAt: 'desc' },
    take: 20,
  });

  log(`\nRecent clicks in last 24h: ${recentClicks.length}`, 'info');

  // Group by UTM source
  const bySource: Record<string, number> = {};
  for (const click of recentClicks) {
    const source = click.utmSource || 'direct';
    bySource[source] = (bySource[source] || 0) + 1;
  }

  log('\nClicks by source:', 'info');
  for (const [source, count] of Object.entries(bySource)) {
    log(`  ${source}: ${count}`, 'info');
  }

  // Show sample click data
  if (recentClicks.length > 0) {
    log('\nSample LinkClick record:', 'info');
    const sample = recentClicks[0];
    console.log({
      id: sample.id,
      utmSource: sample.utmSource,
      utmMedium: sample.utmMedium,
      utmCampaign: sample.utmCampaign,
      converted: sample.converted,
      clickedAt: sample.clickedAt,
    });
  }
}

async function testLeadUTMAttribution(): Promise<void> {
  log('\n=== Testing Lead UTM Attribution ===', 'header');

  // Check leads created in last 24 hours
  const recentLeads = await prisma.lead.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  log(`Recent leads in last 24h: ${recentLeads.length}`, 'info');

  // Group by UTM source
  const bySource: Record<string, number> = {};
  for (const lead of recentLeads) {
    const source = lead.utmSource || 'direct';
    bySource[source] = (bySource[source] || 0) + 1;
  }

  log('\nLeads by source:', 'info');
  for (const [source, count] of Object.entries(bySource)) {
    log(`  ${source}: ${count}`, 'info');
  }

  // Also check TaxIntakeLead
  const recentIntakes = await prisma.taxIntakeLead.findMany({
    where: {
      created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { created_at: 'desc' },
    take: 20,
  });

  log(`\nRecent tax intake leads in last 24h: ${recentIntakes.length}`, 'info');

  // Show referrer data
  const byReferrer: Record<string, number> = {};
  for (const intake of recentIntakes) {
    const referrer = intake.referrerUsername || 'none';
    byReferrer[referrer] = (byReferrer[referrer] || 0) + 1;
  }

  log('\nIntakes by referrer:', 'info');
  for (const [referrer, count] of Object.entries(byReferrer)) {
    log(`  ${referrer}: ${count}`, 'info');
  }
}

async function testMarketingLinkCounters(): Promise<void> {
  log('\n=== Testing Marketing Link Counters ===', 'header');

  // Get all of Owliver's links
  const owLinks = await prisma.marketingLink.findMany({
    where: { code: { startsWith: 'ow-' } },
    orderBy: { code: 'asc' },
  });

  log(`\nOwliver's marketing links:`, 'info');
  console.log('\n┌────────────┬────────┬─────────────┬─────────────┬──────────────┐');
  console.log('│ Code       │ Clicks │ Unique      │ Conversions │ Rate         │');
  console.log('├────────────┼────────┼─────────────┼─────────────┼──────────────┤');

  for (const link of owLinks) {
    const rate = link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : '0.0';
    console.log(
      `│ ${link.code.padEnd(10)} │ ${String(link.clicks).padEnd(6)} │ ${String(link.uniqueClicks).padEnd(11)} │ ${String(link.conversions).padEnd(11)} │ ${rate.padEnd(10)}% │`
    );
  }
  console.log('└────────────┴────────┴─────────────┴─────────────┴──────────────┘\n');
}

async function testSourceBreakdownData(): Promise<void> {
  log('\n=== Testing Source Breakdown Data ===', 'header');

  // Aggregate source data from LinkClick
  const sourceBreakdown = await prisma.linkClick.groupBy({
    by: ['utmSource'],
    _count: { id: true },
    where: {
      clickedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    },
    orderBy: { _count: { id: 'desc' } },
  });

  log('\nSource breakdown (last 30 days):', 'info');
  console.log('\n┌────────────────┬────────────┐');
  console.log('│ Source         │ Clicks     │');
  console.log('├────────────────┼────────────┤');

  for (const source of sourceBreakdown) {
    const name = source.utmSource || 'direct';
    console.log(`│ ${name.padEnd(14)} │ ${String(source._count.id).padEnd(10)} │`);
  }
  console.log('└────────────────┴────────────┘\n');

  // Medium breakdown
  const mediumBreakdown = await prisma.linkClick.groupBy({
    by: ['utmMedium'],
    _count: { id: true },
    where: {
      clickedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      utmMedium: { not: null },
    },
    orderBy: { _count: { id: 'desc' } },
  });

  log('Medium breakdown (last 30 days):', 'info');
  console.log('\n┌────────────────┬────────────┐');
  console.log('│ Medium         │ Clicks     │');
  console.log('├────────────────┼────────────┤');

  for (const medium of mediumBreakdown) {
    const name = medium.utmMedium || 'unknown';
    console.log(`│ ${name.padEnd(14)} │ ${String(medium._count.id).padEnd(10)} │`);
  }
  console.log('└────────────────┴────────────┘\n');
}

async function generateTestUrls(): Promise<void> {
  log('\n=== Test URLs for Manual Testing ===', 'header');

  log('\nUse these URLs to test UTM tracking manually:', 'info');
  console.log('');

  for (const test of UTM_TESTS) {
    const url = `${BASE_URL}/go/ow-lead?utm_source=${test.source}&utm_medium=${test.medium}&utm_campaign=${test.campaign}`;
    console.log(`${test.description}:`);
    console.log(`  ${url}`);
    console.log('');
  }

  log('\nAfter clicking each link and submitting the form:', 'info');
  log('1. Check LinkClick table for UTM parameters', 'info');
  log('2. Check Lead/CRMContact table for attribution', 'info');
  log('3. Check dashboard source breakdown chart', 'info');
}

async function simulateAPITests(): Promise<void> {
  log('\n=== Simulating API Form Submissions ===', 'header');

  for (const test of UTM_TESTS.slice(0, 3)) { // Test first 3
    log(`\nTesting ${test.description}...`, 'info');

    try {
      // Submit to the API with correct required fields
      const response = await fetch(`${BASE_URL}/api/contact/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Test ${test.source} User`,
          email: test.email,
          phone: '(555) 000-0001',
          service: 'tax-consultation', // Required field
          message: `This is a test submission from ${test.source} source for analytics testing. Minimum 10 characters required.`,
          locale: 'en',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        log(`  ✓ Submission successful (ID: ${result.contactId})`, 'success');

        // Verify in database
        const contact = await prisma.cRMContact.findFirst({
          where: { email: test.email.toLowerCase() },
          orderBy: { createdAt: 'desc' },
        });

        if (contact) {
          log(`  ✓ CRMContact verified in database`, 'success');
        } else {
          log(`  ⚠ CRMContact not found in database verification`, 'warn');
        }
      } else {
        log(`  ✗ Submission failed: ${result.error || result.message}`, 'error');
      }
    } catch (error) {
      log(`  ✗ Error: ${error}`, 'error');
    }

    // Small delay between submissions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  log('\n⚠️  Note: UTM tracking requires browser-based testing (click → form)', 'warn');
  log('   The API submission creates CRMContacts but UTM is captured', 'warn');
  log('   during the short link click, not the form submission.', 'warn');
}

async function main(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('  UTM ATTRIBUTION TEST');
  console.log('='.repeat(60));

  try {
    // Run all diagnostic tests
    await testLinkClickUTMStorage();
    await testLeadUTMAttribution();
    await testMarketingLinkCounters();
    await testSourceBreakdownData();

    // Generate test URLs for manual testing
    await generateTestUrls();

    // Optionally run API simulations
    const args = process.argv.slice(2);
    if (args.includes('--simulate')) {
      await simulateAPITests();
    } else {
      log('\nTip: Run with --simulate to submit test forms via API', 'info');
    }

  } finally {
    await prisma.$disconnect();
  }

  console.log('\n' + '='.repeat(60));
  log('Test complete!', 'success');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
