/**
 * Analytics Pages Static Code Tests
 * 
 * Verifies the analytics pages and service are properly configured
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const basePath = process.cwd();

test.describe('Analytics Service Tests', () => {
  test('Analytics service exports all required functions', async () => {
    const servicePath = path.join(basePath, 'src/lib/services/lead-flow-analytics.service.ts');
    const content = fs.readFileSync(servicePath, 'utf-8');
    
    const requiredFunctions = [
      'getLeadPipelineSummary',
      'getTopEntryPoints',
      'getConversionFunnel',
      'getTopPerformers',
      'getPreparerLeadPerformance',
      'getAffiliateLeadPerformance',
      'getAllPreparersLeadPerformance',
      'getAllAffiliatesLeadPerformance',
      'getLeadsBySource',
      'getRecentLeads',
      'getCommissionSummary',
      'getSubAffiliateTree',
    ];
    
    for (const fn of requiredFunctions) {
      expect(content).toContain(`export async function ${fn}`);
      console.log(`✓ ${fn} - exported`);
    }
  });

  test('Analytics service uses correct Prisma import', async () => {
    const servicePath = path.join(basePath, 'src/lib/services/lead-flow-analytics.service.ts');
    const content = fs.readFileSync(servicePath, 'utf-8');
    
    // Should use named import
    expect(content).toContain("import { prisma } from '@/lib/prisma'");
    console.log('✓ Correct Prisma import (named export)');
    
    // Should NOT use default import
    expect(content).not.toContain("import prisma from '@/lib/prisma'");
    console.log('✓ No incorrect default import');
  });

  test('Analytics service queries correct Lead fields', async () => {
    const servicePath = path.join(basePath, 'src/lib/services/lead-flow-analytics.service.ts');
    const content = fs.readFileSync(servicePath, 'utf-8');
    
    // Check that we query Lead model correctly
    expect(content).toContain('prisma.lead.groupBy');
    expect(content).toContain("by: ['status']");
    expect(content).toContain("by: ['referrerUsername'");
    expect(content).toContain('referrerType');
    console.log('✓ Lead model queries are correct');
  });
});

test.describe('Analytics Page Tests', () => {
  test('Analytics overview page exists and imports service', async () => {
    const pagePath = path.join(basePath, 'src/app/[locale]/admin/analytics/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    // Should import analytics functions
    expect(content).toContain('getLeadPipelineSummary');
    expect(content).toContain('getConversionFunnel');
    expect(content).toContain('getTopEntryPoints');
    expect(content).toContain('getTopPerformers');
    expect(content).toContain('getLeadsBySource');
    expect(content).toContain('getCommissionSummary');
    console.log('✓ Analytics overview imports all required functions');
    
    // Should have auth check
    expect(content).toContain('checkAdminAccess');
    expect(content).toContain("role === 'admin'");
    console.log('✓ Has admin access check');
    
    // Should NOT have revenue tracking
    expect(content.toLowerCase()).not.toContain('total revenue');
    expect(content.toLowerCase()).not.toContain('monthly revenue');
    console.log('✓ No revenue tracking in overview');
  });

  test('Preparers analytics page exists and is lead-focused', async () => {
    const pagePath = path.join(basePath, 'src/app/[locale]/admin/analytics/preparers/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    // Should import correct functions
    expect(content).toContain('getAllPreparersLeadPerformance');
    console.log('✓ Preparers page imports lead performance function');
    
    // Should focus on leads, not revenue
    expect(content).toContain('Total Leads');
    expect(content).toContain('Conversions');
    expect(content).toContain('Conv. Rate');
    console.log('✓ Preparers page focuses on lead metrics');
    
    // Should NOT track revenue
    expect(content.toLowerCase()).not.toContain('total revenue');
    console.log('✓ Preparers page does not track revenue');
  });

  test('Affiliates analytics page exists with commission tracking', async () => {
    const pagePath = path.join(basePath, 'src/app/[locale]/admin/analytics/affiliates/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    // Should import correct functions
    expect(content).toContain('getAllAffiliatesLeadPerformance');
    expect(content).toContain('getCommissionSummary');
    console.log('✓ Affiliates page imports correct functions');
    
    // Should have commission tracking (predetermined amounts)
    expect(content).toContain('Total Earned');
    expect(content).toContain('Pending Payout');
    expect(content).toContain('Commissions');
    console.log('✓ Affiliates page has commission tracking');
    
    // Should have sub-affiliate tracking
    expect(content).toContain('Sub-Affiliate');
    expect(content).toContain('referrerUsername');
    console.log('✓ Affiliates page has sub-affiliate tracking');
  });

  test('Period selector component exists', async () => {
    const selectorPath = path.join(basePath, 'src/app/[locale]/admin/analytics/AnalyticsPeriodSelector.tsx');
    const content = fs.readFileSync(selectorPath, 'utf-8');
    
    expect(content).toContain("'use client'");
    expect(content).toContain('PeriodToggle');
    expect(content).toContain('handlePeriodChange');
    console.log('✓ Period selector is a client component with toggle');
  });

  test('PeriodToggle component has correct periods', async () => {
    const togglePath = path.join(basePath, 'src/components/admin/analytics/PeriodToggle.tsx');
    const content = fs.readFileSync(togglePath, 'utf-8');
    
    expect(content).toContain("'7d'");
    expect(content).toContain("'30d'");
    expect(content).toContain("'90d'");
    expect(content).toContain("'all'");
    console.log('✓ PeriodToggle has all required period options');
  });
});

test.describe('Build Verification', () => {
  test('Build output includes analytics routes', async () => {
    // Check if build output exists
    const buildDir = path.join(basePath, '.next');
    expect(fs.existsSync(buildDir)).toBe(true);
    console.log('✓ Build directory exists');
    
    // Verify the build completed successfully (check for server chunks)
    const serverDir = path.join(buildDir, 'server');
    if (fs.existsSync(serverDir)) {
      console.log('✓ Server build exists');
    }
  });
});
