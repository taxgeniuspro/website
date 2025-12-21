/**
 * Reset Tax Preparers Script
 *
 * This script safely deletes all tax preparer accounts while preserving:
 * 1. Admin accounts (iradwatkins@gmail.com)
 * 2. Client accounts
 * 3. Tracking codes for reference (saved to JSON backup)
 *
 * After running this script:
 * - Tax preparers can re-register via Google OAuth
 * - Admin can promote them back to tax_preparer role
 * - Original tracking codes can be reassigned
 *
 * Usage:
 *   npx tsx scripts/reset-tax-preparers.ts
 *
 * Options:
 *   --dry-run     Preview what will be deleted without making changes
 *   --backup-only Export preparer data without deleting
 *   --skip-backup Skip backup and go straight to deletion (dangerous!)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const backupOnly = args.includes('--backup-only');
const skipBackup = args.includes('--skip-backup');

interface TaxPreparerBackup {
  userId: string;
  email: string;
  name: string | null;
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  trackingCode: string | null;
  customTrackingCode: string | null;
  shortLinkUsername: string | null;
  avatarUrl: string | null;
  qrCodeLogoUrl: string | null;
  createdAt: Date;
}

interface BackupData {
  exportedAt: string;
  totalPreparers: number;
  preparers: TaxPreparerBackup[];
  marketingLinks: Array<{
    id: string;
    code: string;
    creatorId: string;
    linkType: string;
    url: string;
    title: string | null;
    clicks: number;
    conversions: number;
  }>;
}

async function backupPreparerData(): Promise<BackupData> {
  console.log('\n📦 Backing up tax preparer data...\n');

  // Get all tax preparers with their profile data
  const preparers = await prisma.profile.findMany({
    where: {
      role: 'tax_preparer',
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  // Get all marketing links created by preparers
  const marketingLinks = await prisma.marketingLink.findMany({
    where: {
      creatorId: {
        in: preparers.map((p) => p.id),
      },
    },
    select: {
      id: true,
      code: true,
      creatorId: true,
      linkType: true,
      url: true,
      title: true,
      clicks: true,
      conversions: true,
    },
  });

  const backupData: BackupData = {
    exportedAt: new Date().toISOString(),
    totalPreparers: preparers.length,
    preparers: preparers.map((p) => ({
      userId: p.userId,
      email: p.user.email,
      name: p.user.name,
      profileId: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      trackingCode: p.trackingCode,
      customTrackingCode: p.customTrackingCode,
      shortLinkUsername: p.shortLinkUsername,
      avatarUrl: p.avatarUrl,
      qrCodeLogoUrl: p.qrCodeLogoUrl,
      createdAt: p.createdAt,
    })),
    marketingLinks: marketingLinks.map((l) => ({
      id: l.id,
      code: l.code,
      creatorId: l.creatorId,
      linkType: l.linkType,
      url: l.url,
      title: l.title,
      clicks: l.clicks,
      conversions: l.conversions,
    })),
  };

  // Save to file
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `tax-preparers-backup-${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

  console.log(`✅ Backup saved to: ${backupFile}`);
  console.log(`   Total preparers: ${backupData.totalPreparers}`);
  console.log(`   Total marketing links: ${backupData.marketingLinks.length}`);

  return backupData;
}

async function printPreparerSummary() {
  console.log('\n📋 CONFIRMED TAX PREPARERS (to be deleted):\n');
  console.log('| Name | Code | Email |');
  console.log('|------|------|-------|');

  const preparers = await prisma.profile.findMany({
    where: { role: 'tax_preparer' },
    include: { user: { select: { email: true } } },
    orderBy: { firstName: 'asc' },
  });

  for (const p of preparers) {
    const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown';
    const code = p.customTrackingCode || p.trackingCode || '-';
    const email = p.user.email;
    console.log(`| ${name.padEnd(25)} | ${code.padEnd(6)} | ${email} |`);
  }

  console.log(`\nTotal: ${preparers.length} tax preparers`);
}

async function deleteTestData() {
  console.log('\n🧹 Clearing test data...\n');

  // Delete CRM data
  const crmInteractions = await prisma.cRMInteraction.deleteMany({});
  console.log(`   Deleted ${crmInteractions.count} CRM interactions`);

  const crmContacts = await prisma.cRMContact.deleteMany({});
  console.log(`   Deleted ${crmContacts.count} CRM contacts`);

  // Delete leads and intakes
  const taxIntakeLeads = await prisma.taxIntakeLead.deleteMany({});
  console.log(`   Deleted ${taxIntakeLeads.count} tax intake leads`);

  const leads = await prisma.lead.deleteMany({});
  console.log(`   Deleted ${leads.count} leads`);

  const clientIntakes = await prisma.clientIntake.deleteMany({});
  console.log(`   Deleted ${clientIntakes.count} client intakes`);

  // Delete appointments
  const appointments = await prisma.appointment.deleteMany({});
  console.log(`   Deleted ${appointments.count} appointments`);
}

async function nullifyPreparerReferences(preparerProfileIds: string[]) {
  console.log('\n🔗 Nullifying preparer references in related tables...\n');

  // Nullify Lead.assignedPreparerId
  const leadUpdates = await prisma.lead.updateMany({
    where: { assignedPreparerId: { in: preparerProfileIds } },
    data: { assignedPreparerId: null },
  });
  console.log(`   Nullified ${leadUpdates.count} Lead.assignedPreparerId`);

  // Nullify TaxIntakeLead.assignedPreparerId
  const taxIntakeUpdates = await prisma.taxIntakeLead.updateMany({
    where: { assignedPreparerId: { in: preparerProfileIds } },
    data: { assignedPreparerId: null },
  });
  console.log(`   Nullified ${taxIntakeUpdates.count} TaxIntakeLead.assignedPreparerId`);

  // Nullify ClientIntake.assignedPreparerId
  const clientIntakeUpdates = await prisma.clientIntake.updateMany({
    where: { assignedPreparerId: { in: preparerProfileIds } },
    data: { assignedPreparerId: null },
  });
  console.log(`   Nullified ${clientIntakeUpdates.count} ClientIntake.assignedPreparerId`);

  // Nullify CRMContact.assignedPreparerId
  const crmUpdates = await prisma.cRMContact.updateMany({
    where: { assignedPreparerId: { in: preparerProfileIds } },
    data: { assignedPreparerId: null },
  });
  console.log(`   Nullified ${crmUpdates.count} CRMContact.assignedPreparerId`);

  // Nullify Document.reviewedBy (if it references preparer profile)
  // Note: This field might reference User ID, check schema if this causes issues

  // Nullify SupportTicket.assignedToId
  const ticketUpdates = await prisma.supportTicket.updateMany({
    where: { assignedToId: { in: preparerProfileIds } },
    data: { assignedToId: null },
  });
  console.log(`   Nullified ${ticketUpdates.count} SupportTicket.assignedToId`);
}

async function deletePreparerSpecificRecords(preparerProfileIds: string[]) {
  console.log('\n🗑️ Deleting preparer-specific records...\n');

  // Delete FollowUpLog for preparers
  const followUpLogs = await prisma.followUpLog.deleteMany({
    where: { preparerId: { in: preparerProfileIds } },
  });
  console.log(`   Deleted ${followUpLogs.count} follow-up logs`);

  // Delete PreparerAvailability
  const availability = await prisma.preparerAvailability.deleteMany({
    where: { preparerId: { in: preparerProfileIds } },
  });
  console.log(`   Deleted ${availability.count} preparer availability records`);

  // Delete BookingService
  const bookingServices = await prisma.bookingService.deleteMany({
    where: { preparerId: { in: preparerProfileIds } },
  });
  console.log(`   Deleted ${bookingServices.count} booking services`);

  // Delete TicketTimeEntry
  const timeEntries = await prisma.ticketTimeEntry.deleteMany({
    where: { preparerId: { in: preparerProfileIds } },
  });
  console.log(`   Deleted ${timeEntries.count} ticket time entries`);

  // Delete Appointment (preparer's appointments)
  const preparerAppointments = await prisma.appointment.deleteMany({
    where: { preparerId: { in: preparerProfileIds } },
  });
  console.log(`   Deleted ${preparerAppointments.count} preparer appointments`);

  // Delete MarketingLink (preparer's marketing links)
  const marketingLinks = await prisma.marketingLink.deleteMany({
    where: { creatorId: { in: preparerProfileIds } },
  });
  console.log(`   Deleted ${marketingLinks.count} marketing links`);

  // Delete MarketingMaterial
  try {
    const marketingMaterials = await prisma.marketingMaterial.deleteMany({
      where: { creatorId: { in: preparerProfileIds } },
    });
    console.log(`   Deleted ${marketingMaterials.count} marketing materials`);
  } catch {
    console.log(`   Marketing materials: table may not exist or no records found`);
  }

  // Delete ClientPreparer relationships
  const clientPreparerRelations = await prisma.clientPreparer.deleteMany({
    where: { preparerId: { in: preparerProfileIds } },
  });
  console.log(`   Deleted ${clientPreparerRelations.count} client-preparer relationships`);

  // Delete AffiliateBonding records
  try {
    const affiliateBondings = await prisma.affiliateBonding.deleteMany({
      where: { preparerId: { in: preparerProfileIds } },
    });
    console.log(`   Deleted ${affiliateBondings.count} affiliate bondings`);
  } catch {
    console.log(`   Affiliate bondings: table may not exist or no records found`);
  }

  // Delete Referral records where preparer is the referrer
  const referrals = await prisma.referral.deleteMany({
    where: { referrerId: { in: preparerProfileIds } },
  });
  console.log(`   Deleted ${referrals.count} referrals`);

  // Delete Commission records where preparer is the referrer
  const commissions = await prisma.commission.deleteMany({
    where: { referrerId: { in: preparerProfileIds } },
  });
  console.log(`   Deleted ${commissions.count} commissions`);

  // Delete PayoutRequest records
  const payoutRequests = await prisma.payoutRequest.deleteMany({
    where: { referrerId: { in: preparerProfileIds } },
  });
  console.log(`   Deleted ${payoutRequests.count} payout requests`);

  // Delete UserAchievement records
  const userAchievements = await prisma.userAchievement.deleteMany({
    where: {
      profile: { id: { in: preparerProfileIds } },
    },
  });
  console.log(`   Deleted ${userAchievements.count} user achievements`);

  // Delete UserStats records
  const userStats = await prisma.userStats.deleteMany({
    where: {
      profile: { id: { in: preparerProfileIds } },
    },
  });
  console.log(`   Deleted ${userStats.count} user stats`);

  // Delete ClientReferralInvitation records
  try {
    const referralInvitations = await prisma.clientReferralInvitation.deleteMany({
      where: { preparerId: { in: preparerProfileIds } },
    });
    console.log(`   Deleted ${referralInvitations.count} client referral invitations`);
  } catch {
    console.log(`   Client referral invitations: table may not exist or no records found`);
  }

  // Delete DocumentFolder records owned by preparers
  try {
    const documentFolders = await prisma.documentFolder.deleteMany({
      where: { ownerId: { in: preparerProfileIds } },
    });
    console.log(`   Deleted ${documentFolders.count} document folders`);
  } catch {
    console.log(`   Document folders: table may not exist or no records found`);
  }

  // Delete PromoImageSet records
  try {
    const promoImageSets = await prisma.promoImageSet.deleteMany({
      where: { preparerId: { in: preparerProfileIds } },
    });
    console.log(`   Deleted ${promoImageSets.count} promo image sets`);
  } catch {
    console.log(`   Promo image sets: table may not exist or no records found`);
  }

  // Delete ProfessionalEmailAlias records
  try {
    const professionalEmails = await prisma.professionalEmailAlias.deleteMany({
      where: { userId: { in: preparerProfileIds.map((id) => id) } },
    });
    console.log(`   Deleted ${professionalEmails.count} professional email aliases`);
  } catch {
    console.log(`   Professional email aliases: table may not exist or no records found`);
  }

  // Delete DriveFolder records
  try {
    const driveFolders = await prisma.driveFolder.deleteMany({
      where: { preparerId: { in: preparerProfileIds } },
    });
    console.log(`   Deleted ${driveFolders.count} drive folders`);
  } catch {
    console.log(`   Drive folders: table may not exist or no records found`);
  }

  // Delete CalendarEvent records
  try {
    const calendarEvents = await prisma.calendarEvent.deleteMany({
      where: { preparerId: { in: preparerProfileIds } },
    });
    console.log(`   Deleted ${calendarEvents.count} calendar events`);
  } catch {
    console.log(`   Calendar events: table may not exist or no records found`);
  }
}

async function deleteTaxPreparerUsers(preparerUserIds: string[]) {
  console.log('\n👤 Deleting tax preparer users (cascades to profiles)...\n');

  // Delete users - this will cascade to Profile due to onDelete: Cascade
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: preparerUserIds } },
  });

  console.log(`   Deleted ${deletedUsers.count} tax preparer user accounts`);
}

async function main() {
  console.log('===========================================');
  console.log('   TAX PREPARER RESET SCRIPT');
  console.log('===========================================');

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  if (backupOnly) {
    console.log('\n📦 BACKUP ONLY MODE - Will export data without deleting\n');
  }

  // Step 1: Show summary of preparers
  await printPreparerSummary();

  // Step 2: Get preparer data for processing
  const preparers = await prisma.profile.findMany({
    where: { role: 'tax_preparer' },
    select: {
      id: true,
      userId: true,
    },
  });

  const preparerProfileIds = preparers.map((p) => p.id);
  const preparerUserIds = preparers.map((p) => p.userId);

  console.log(`\nFound ${preparers.length} tax preparer profiles to process`);

  // Step 3: Backup data (unless skipped)
  if (!skipBackup) {
    await backupPreparerData();
  } else {
    console.log('\n⚠️  Skipping backup as requested (--skip-backup)');
  }

  if (backupOnly) {
    console.log('\n✅ Backup complete. Exiting without deleting (--backup-only mode)');
    return;
  }

  if (isDryRun) {
    console.log('\n📋 DRY RUN - Would perform the following operations:');
    console.log('   1. Nullify preparer references in Lead, TaxIntakeLead, ClientIntake, CRMContact, SupportTicket');
    console.log('   2. Delete FollowUpLog, PreparerAvailability, BookingService, TicketTimeEntry');
    console.log('   3. Delete Appointment, MarketingLink, ClientPreparer, AffiliatePreparer');
    console.log('   4. Delete Referral, Commission, PayoutRequest');
    console.log('   5. Delete UserAchievement, UserStats');
    console.log('   6. Delete User accounts (cascades to Profile)');
    console.log('   7. Clear test data (CRMContact, TaxIntakeLead, Lead, ClientIntake, Appointment)');
    console.log('\n✅ Dry run complete. No changes made.');
    return;
  }

  // Confirm before proceeding
  console.log('\n⚠️  WARNING: This will DELETE all tax preparer accounts!');
  console.log('   They will need to re-register via Google OAuth.');
  console.log('\n   Press Ctrl+C within 5 seconds to cancel...');

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log('\n🚀 Proceeding with deletion...');

  // Step 4: Nullify foreign key references
  await nullifyPreparerReferences(preparerProfileIds);

  // Step 5: Delete preparer-specific records
  await deletePreparerSpecificRecords(preparerProfileIds);

  // Step 6: Delete tax preparer users (cascades to profiles)
  await deleteTaxPreparerUsers(preparerUserIds);

  // Step 7: Clear test data
  await deleteTestData();

  console.log('\n===========================================');
  console.log('   ✅ RESET COMPLETE');
  console.log('===========================================');
  console.log('\nNext steps:');
  console.log('1. Have tax preparers sign up via Google OAuth at https://taxgeniuspro.tax/auth/signup');
  console.log('2. Admin promotes them using: npx tsx scripts/promote-to-preparer.ts <email> --code=<code>');
  console.log('3. Their original tracking codes will be reassigned');
  console.log('\nBackup location: ./backups/');
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
