/**
 * Audit Preparer Links Script
 *
 * This script audits all tax preparer marketing links, QR codes, and images
 * to ensure they are correctly configured.
 *
 * Checks:
 * 1. Profile.avatarUrl exists and is a valid URL
 * 2. Profile.qrCodeLogoUrl matches avatarUrl (for QR code center image)
 * 3. All MarketingLinks have correct `ref` parameter matching creator's code
 * 4. Marketing link destinations are valid
 * 5. Reports any issues found
 *
 * Run: npx ts-node scripts/audit-preparer-links.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditResult {
  preparerId: string;
  preparerName: string;
  preparerEmail: string;
  trackingCode: string;
  issues: string[];
  warnings: string[];
  linksChecked: number;
  linksWithIssues: number;
}

async function auditPreparerLinks(): Promise<void> {
  console.log('='.repeat(80));
  console.log('TAX GENIUS PRO - PREPARER LINKS AUDIT');
  console.log('='.repeat(80));
  console.log(`Started at: ${new Date().toISOString()}\n`);

  // Get all tax preparers
  const preparers = await prisma.profile.findMany({
    where: {
      role: 'tax_preparer',
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      firstName: 'asc',
    },
  });

  console.log(`Found ${preparers.length} tax preparers to audit\n`);

  const results: AuditResult[] = [];
  let totalIssues = 0;
  let totalWarnings = 0;

  for (const preparer of preparers) {
    const result: AuditResult = {
      preparerId: preparer.id,
      preparerName: `${preparer.firstName} ${preparer.lastName}`,
      preparerEmail: preparer.user?.email || 'NO EMAIL',
      trackingCode: preparer.customTrackingCode || preparer.trackingCode || 'NO CODE',
      issues: [],
      warnings: [],
      linksChecked: 0,
      linksWithIssues: 0,
    };

    // Check 1: Avatar URL
    if (!preparer.avatarUrl) {
      result.issues.push('Missing avatarUrl - no profile picture');
    } else if (!isValidUrl(preparer.avatarUrl)) {
      result.issues.push(`Invalid avatarUrl: ${preparer.avatarUrl}`);
    }

    // Check 2: QR Code Logo URL
    if (!preparer.qrCodeLogoUrl) {
      result.warnings.push('Missing qrCodeLogoUrl - QR codes may not have center image');
    } else if (preparer.avatarUrl && preparer.qrCodeLogoUrl !== preparer.avatarUrl) {
      result.warnings.push(
        `qrCodeLogoUrl doesn't match avatarUrl - may show wrong image in QR codes`
      );
    }

    // Check 3: Tracking code
    const trackingCode = preparer.customTrackingCode || preparer.trackingCode;
    if (!trackingCode) {
      result.issues.push('Missing tracking code - cannot attribute referrals');
    }

    // Check 4: Marketing Links
    const marketingLinks = await prisma.marketingLink.findMany({
      where: {
        creatorId: preparer.id,
      },
    });

    result.linksChecked = marketingLinks.length;

    if (marketingLinks.length === 0) {
      result.warnings.push('No marketing links found');
    } else {
      for (const link of marketingLinks) {
        const linkIssues: string[] = [];

        // Check if URL contains correct ref parameter
        if (link.url) {
          try {
            const url = new URL(link.url);
            const refParam = url.searchParams.get('ref');

            if (!refParam) {
              linkIssues.push(`Link "${link.code}": Missing ref parameter in URL`);
            } else if (refParam !== trackingCode) {
              linkIssues.push(
                `Link "${link.code}": ref="${refParam}" but should be "${trackingCode}"`
              );
            }
          } catch {
            linkIssues.push(`Link "${link.code}": Invalid URL format: ${link.url}`);
          }
        } else {
          linkIssues.push(`Link "${link.code}": Missing URL`);
        }

        // Check if link is active
        if (!link.isActive) {
          result.warnings.push(`Link "${link.code}" is inactive`);
        }

        if (linkIssues.length > 0) {
          result.linksWithIssues++;
          result.issues.push(...linkIssues);
        }
      }
    }

    // Check expected links exist
    const expectedLinkTypes = ['lead', 'intake', 'appt'];
    for (const type of expectedLinkTypes) {
      const expectedCode = `${trackingCode}-${type}`;
      const hasLink = marketingLinks.some(
        (l) => l.code.toLowerCase() === expectedCode.toLowerCase()
      );
      if (!hasLink) {
        result.warnings.push(`Missing expected link: ${expectedCode}`);
      }
    }

    results.push(result);
    totalIssues += result.issues.length;
    totalWarnings += result.warnings.length;

    // Print result
    const status =
      result.issues.length === 0
        ? result.warnings.length === 0
          ? '✅'
          : '⚠️'
        : '❌';

    console.log(`${status} ${result.preparerName} (${result.trackingCode})`);
    console.log(`   Email: ${result.preparerEmail}`);
    console.log(`   Links: ${result.linksChecked} (${result.linksWithIssues} with issues)`);

    if (result.issues.length > 0) {
      console.log('   ISSUES:');
      result.issues.forEach((issue) => console.log(`   - ${issue}`));
    }

    if (result.warnings.length > 0) {
      console.log('   WARNINGS:');
      result.warnings.forEach((warning) => console.log(`   - ${warning}`));
    }

    console.log('');
  }

  // Summary
  console.log('='.repeat(80));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Preparers: ${preparers.length}`);
  console.log(`Total Issues: ${totalIssues}`);
  console.log(`Total Warnings: ${totalWarnings}`);
  console.log('');

  // Preparers with issues
  const preparersWithIssues = results.filter((r) => r.issues.length > 0);
  if (preparersWithIssues.length > 0) {
    console.log('PREPARERS WITH ISSUES:');
    preparersWithIssues.forEach((r) => {
      console.log(`  ❌ ${r.preparerName} (${r.trackingCode}): ${r.issues.length} issues`);
    });
    console.log('');
  }

  // Preparers without any links
  const preparersWithoutLinks = results.filter((r) => r.linksChecked === 0);
  if (preparersWithoutLinks.length > 0) {
    console.log('PREPARERS WITHOUT MARKETING LINKS:');
    preparersWithoutLinks.forEach((r) => {
      console.log(`  ⚠️ ${r.preparerName} (${r.trackingCode})`);
    });
    console.log('');
  }

  console.log(`Completed at: ${new Date().toISOString()}`);

  await prisma.$disconnect();
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// Run the audit
auditPreparerLinks().catch((error) => {
  console.error('Audit failed:', error);
  process.exit(1);
});
