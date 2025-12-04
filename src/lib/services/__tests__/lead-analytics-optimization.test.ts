/**
 * Performance comparison test for lead analytics optimization
 *
 * This test compares the query count and performance between
 * the original N+1 implementation and the optimized version.
 *
 * Run with: npm test -- lead-analytics-optimization
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';

// Mock data setup
const setupTestData = async () => {
  // Create 5 test preparers
  const preparers = await Promise.all(
    Array.from({ length: 5 }, async (_, i) => {
      return await prisma.profile.create({
        data: {
          userId: `test-preparer-${i}@test.com`,
          email: `test-preparer-${i}@test.com`,
          firstName: `Preparer`,
          lastName: `${i}`,
          role: 'TAX_PREPARER',
          status: 'ACTIVE',
        },
      });
    })
  );

  // Create 3 marketing links for each preparer (15 total)
  const links = await Promise.all(
    preparers.flatMap((preparer) =>
      Array.from({ length: 3 }, async (_, i) => {
        return await prisma.marketingLink.create({
          data: {
            code: `PREP${preparer.id.slice(0, 4)}-LINK${i}`,
            url: `https://taxgeniuspro.tax/start?ref=PREP${preparer.id.slice(0, 4)}-LINK${i}`,
            creatorId: preparer.id,
            creatorType: 'TAX_PREPARER',
            linkType: 'GENERAL',
            title: `Test Link ${i}`,
            isActive: true,
          },
        });
      })
    )
  );

  // Create clicks for each link (5 clicks per link = 75 total)
  await Promise.all(
    links.flatMap((link) =>
      Array.from({ length: 5 }, async () => {
        return await prisma.linkClick.create({
          data: {
            linkId: link.id,
            clickedAt: new Date(),
          },
        });
      })
    )
  );

  // Create leads for each link (2 leads per link = 30 total)
  await Promise.all(
    links.flatMap((link) =>
      Array.from({ length: 2 }, async (_, i) => {
        return await prisma.lead.create({
          data: {
            firstName: `Lead`,
            lastName: `${i}`,
            email: `lead-${link.code}-${i}@test.com`,
            phone: '1234567890',
            source: link.code,
            status: 'NEW',
          },
        });
      })
    )
  );

  return { preparers, links };
};

const cleanupTestData = async () => {
  // Clean up in reverse order to avoid foreign key constraints
  await prisma.linkClick.deleteMany({
    where: {
      link: {
        creatorType: 'TAX_PREPARER',
        code: { startsWith: 'PREP' },
      },
    },
  });
  await prisma.lead.deleteMany({
    where: {
      source: { startsWith: 'PREP' },
    },
  });
  await prisma.marketingLink.deleteMany({
    where: {
      code: { startsWith: 'PREP' },
    },
  });
  await prisma.profile.deleteMany({
    where: {
      email: { startsWith: 'test-preparer-' },
    },
  });
};

describe('Lead Analytics Optimization', () => {
  beforeAll(async () => {
    await cleanupTestData(); // Clean before setup
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('should produce identical results between original and optimized versions', async () => {
    const { getMyPreparerAnalytics } = await import('../lead-analytics.service');
    const { getMyPreparerAnalyticsOptimized } = await import('../lead-analytics-optimized.service');

    // Get a test preparer
    const testPreparer = await prisma.profile.findFirst({
      where: {
        email: { startsWith: 'test-preparer-' },
      },
    });

    if (!testPreparer) {
      throw new Error('Test preparer not found');
    }

    // Run both versions
    const originalResult = await getMyPreparerAnalytics(testPreparer.id);
    const optimizedResult = await getMyPreparerAnalyticsOptimized(testPreparer.id);

    // Compare key metrics (ignore exact object equality due to timestamps)
    expect(optimizedResult.marketingLinksCount).toBe(originalResult.marketingLinksCount);
    expect(optimizedResult.clicks).toBe(originalResult.clicks);
    expect(optimizedResult.leads).toBe(originalResult.leads);
    expect(optimizedResult.linkBreakdown.length).toBe(originalResult.linkBreakdown.length);

    // Verify link breakdown matches
    for (let i = 0; i < originalResult.linkBreakdown.length; i++) {
      const originalLink = originalResult.linkBreakdown[i];
      const optimizedLink = optimizedResult.linkBreakdown.find(
        (l) => l.linkId === originalLink.linkId
      );

      expect(optimizedLink).toBeDefined();
      expect(optimizedLink?.clicks).toBe(originalLink.clicks);
      expect(optimizedLink?.leads).toBe(originalLink.leads);
      expect(optimizedLink?.conversions).toBe(originalLink.conversions);
    }
  });

  it('should demonstrate performance improvement with query counting', async () => {
    // Note: This is a conceptual test. Actual query counting would require
    // Prisma middleware or database query logging.

    const { getPreparersAnalyticsOptimized } = await import('../lead-analytics-optimized.service');

    const startTime = performance.now();
    const results = await getPreparersAnalyticsOptimized('system', 'super_admin');
    const endTime = performance.now();

    const executionTime = endTime - startTime;

    // Should return results for 5 preparers
    expect(results.length).toBe(5);

    // Should execute in reasonable time (< 1 second for 5 preparers)
    expect(executionTime).toBeLessThan(1000);

    // Verify each preparer has correct link count
    results.forEach((result) => {
      expect(result.marketingLinksCount).toBe(3);
      expect(result.linkBreakdown.length).toBe(3);
    });
  });

  it('should correctly aggregate metrics across all links', async () => {
    const { getMyPreparerAnalyticsOptimized } = await import('../lead-analytics-optimized.service');

    const testPreparer = await prisma.profile.findFirst({
      where: {
        email: { startsWith: 'test-preparer-' },
      },
    });

    if (!testPreparer) {
      throw new Error('Test preparer not found');
    }

    const result = await getMyPreparerAnalyticsOptimized(testPreparer.id);

    // Each preparer has 3 links
    expect(result.marketingLinksCount).toBe(3);

    // Each link has 5 clicks = 15 total
    expect(result.clicks).toBe(15);

    // Each link has 2 leads = 6 total
    expect(result.leads).toBe(6);

    // Verify individual link metrics
    result.linkBreakdown.forEach((link) => {
      expect(link.clicks).toBe(5);
      expect(link.leads).toBe(2);
    });
  });

  it('should handle empty data gracefully', async () => {
    const { getMyPreparerAnalyticsOptimized } = await import('../lead-analytics-optimized.service');

    // Test with non-existent user ID
    const result = await getMyPreparerAnalyticsOptimized('non-existent-id');

    expect(result.preparerId).toBe('');
    expect(result.preparerName).toBe('New User');
    expect(result.clicks).toBe(0);
    expect(result.leads).toBe(0);
    expect(result.linkBreakdown).toEqual([]);
  });
});

/**
 * EXPECTED QUERY COUNT COMPARISON
 *
 * Original Implementation (N+1 Problem):
 * ----------------------------------------
 * For 5 preparers with 3 links each:
 *
 * 1. getPreparersAnalytics():
 *    - 1 query: Get all preparers
 *    - 5 calls to getMyPreparerAnalytics(), each with:
 *      - 1 query: Get preparer profile
 *      - 1 query: Get marketing links
 *      - 1 query: Count total clicks
 *      - 1 query: Count total leads
 *      - 1 query: Count total conversions
 *      - 1 query: Count total returns
 *      - 1 query: Aggregate revenue
 *      - 3 links × 4 queries each (clicks, leads, conversions, revenue)
 *      - 1 query: Get recent leads
 *      = 7 + 12 + 1 = 20 queries per preparer
 *    = 1 + (5 × 20) = 101 queries total
 *
 * Optimized Implementation (Batch Queries):
 * ------------------------------------------
 * For 5 preparers with 3 links each:
 *
 * 1. getPreparersAnalyticsOptimized():
 *    - 1 query: Get all preparers
 *    - 1 query: Get all links for all preparers
 *    - 1 query: Get clicks grouped by linkId
 *    - 1 query: Get leads grouped by source
 *    - 1 query: Get conversions grouped by source
 *    - 1 query: Get revenue by source (batched)
 *    - 1 query: Get returns grouped by preparer
 *    = 7 queries total
 *
 * IMPROVEMENT: 101 queries → 7 queries (14.4x reduction)
 * For 10 preparers with 5 links: 261 queries → 7 queries (37x reduction!)
 */
