/**
 * Backfill Script: Generate all missing marketing links
 *
 * This script ensures every user has the complete set of marketing links
 * appropriate for their role:
 *   - TAX_PREPARER: lead, intake, appt, advance (4 links)
 *   - AFFILIATE: lead, intake (2 links)
 *   - CLIENT: lead, intake (2 links)
 *
 * Run with: npx tsx scripts/backfill-marketing-links.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APP_URL = process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax';

// Link type configuration (mirrors src/lib/config/marketing-link-types.ts)
const LINK_TYPE_CONFIGS = {
  lead: {
    suffix: 'lead',
    targetPage: '/contact',
    buildUrl: (code: string) => `${APP_URL}/contact?ref=${code}`,
    title: 'Lead Capture Form',
    description: 'Quick contact form for potential clients',
    emoji: '📝',
  },
  intake: {
    suffix: 'intake',
    targetPage: '/start-filing/form',
    buildUrl: (code: string) => `${APP_URL}/start-filing/form?ref=${code}`,
    title: 'Tax Intake Form',
    description: 'Complete tax intake form for clients ready to start',
    emoji: '📋',
  },
  appt: {
    suffix: 'appt',
    targetPage: '/book',
    buildUrl: (code: string) => `${APP_URL}/book?ref=${code}`,
    title: 'Book Appointment',
    description: 'Schedule a consultation with a tax professional',
    emoji: '📅',
  },
  advance: {
    suffix: 'advance',
    targetPage: '/cash-advance',
    buildUrl: (code: string) => `${APP_URL}/cash-advance?ref=${code}`,
    title: 'Preseason Cash Advance',
    description: 'Get up to $7,000 preseason tax advance',
    emoji: '💰',
  },
} as const;

type LinkType = keyof typeof LINK_TYPE_CONFIGS;

// Role-based link sets
const ROLE_LINK_SETS: Record<string, LinkType[]> = {
  TAX_PREPARER: ['lead', 'intake', 'appt', 'advance'],
  AFFILIATE: ['lead', 'intake'],
  CLIENT: ['lead', 'intake'],
  ADMIN: ['lead', 'intake', 'appt', 'advance'],
};

function getLinkTypesForRole(role: string): LinkType[] {
  const normalizedRole = role.toUpperCase().replace(/-/g, '_');
  return ROLE_LINK_SETS[normalizedRole] || ROLE_LINK_SETS.CLIENT;
}

async function main() {
  console.log('='.repeat(60));
  console.log('MARKETING LINKS BACKFILL');
  console.log('Generating missing links for all users');
  console.log('='.repeat(60));
  console.log('');

  // Get all profiles with tracking codes
  const profiles = await prisma.profile.findMany({
    where: {
      OR: [{ trackingCode: { not: null } }, { customTrackingCode: { not: null } }],
    },
    select: {
      id: true,
      role: true,
      trackingCode: true,
      customTrackingCode: true,
      trackingCodeFinalized: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(`Found ${profiles.length} profiles to check`);
  console.log('');

  let totalCreated = 0;
  let totalSkipped = 0;
  let profilesProcessed = 0;

  for (const profile of profiles) {
    const trackingCode = profile.customTrackingCode || profile.trackingCode;
    if (!trackingCode) continue;

    // Skip tax preparers without finalized codes
    if (profile.role === 'tax_preparer' && !profile.trackingCodeFinalized) {
      console.log(
        `  [SKIP] ${profile.firstName} ${profile.lastName} (${profile.role}): Code not finalized`
      );
      totalSkipped++;
      continue;
    }

    const requiredTypes = getLinkTypesForRole(profile.role);
    let createdForProfile = 0;
    let skippedForProfile = 0;

    for (const type of requiredTypes) {
      const code = `${trackingCode}-${type}`;

      // Check if exists
      const exists = await prisma.marketingLink.findUnique({
        where: { code },
      });

      if (exists) {
        skippedForProfile++;
        continue;
      }

      const config = LINK_TYPE_CONFIGS[type];
      const url = config.buildUrl(trackingCode);
      const shortUrl = `${APP_URL}/go/${code}`;

      await prisma.marketingLink.create({
        data: {
          creatorId: profile.id,
          creatorType: profile.role.toUpperCase().replace(/-/g, '_'),
          linkType: 'QR_CODE',
          code,
          url,
          shortUrl,
          targetPage: config.targetPage,
          title: `${config.emoji} ${config.title}`,
          description: config.description,
          dateActivated: new Date(),
          isActive: true,
        },
      });

      console.log(`  [CREATED] ${code} for ${profile.firstName} ${profile.lastName}`);
      createdForProfile++;
      totalCreated++;
    }

    if (createdForProfile > 0 || skippedForProfile < requiredTypes.length) {
      profilesProcessed++;
    }
    totalSkipped += skippedForProfile;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('BACKFILL COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Profiles processed: ${profilesProcessed}`);
  console.log(`  Links created:      ${totalCreated}`);
  console.log(`  Links skipped:      ${totalSkipped} (already exist)`);
  console.log('');

  // Summary by role
  console.log('SUMMARY BY ROLE:');
  const byRole = await prisma.marketingLink.groupBy({
    by: ['creatorType'],
    _count: { id: true },
  });

  for (const row of byRole) {
    console.log(`  ${row.creatorType}: ${row._count.id} links`);
  }
  console.log('');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Backfill failed:', e);
    prisma.$disconnect();
    process.exit(1);
  });
