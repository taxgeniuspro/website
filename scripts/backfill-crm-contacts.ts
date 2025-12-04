#!/usr/bin/env tsx
/**
 * Backfill CRM Contacts from existing Users and Profiles
 *
 * This script creates CRMContact records for all existing:
 * - Clients (role: CLIENT)
 * - Leads (from Lead table)
 * - Affiliates (role: AFFILIATE)
 * - Tax Preparers (role: TAX_PREPARER)
 *
 * The script is idempotent - it can be run multiple times safely.
 */

import { PrismaClient, ContactType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

interface BackfillStats {
  totalProcessed: number;
  clients: number;
  leads: number;
  affiliates: number;
  preparers: number;
  skipped: number;
  errors: number;
}

async function backfillCRMContacts() {
  console.log('🚀 Starting CRM Contacts Backfill...\n');

  const stats: BackfillStats = {
    totalProcessed: 0,
    clients: 0,
    leads: 0,
    affiliates: 0,
    preparers: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // 1. Backfill Clients from Profiles
    console.log('📋 Backfilling CLIENTS from Profiles...');
    const clientProfiles = await prisma.profile.findMany({
      where: {
        role: UserRole.CLIENT,
      },
      include: {
        user: true,
      },
    });

    for (const profile of clientProfiles) {
      try {
        // Check if CRM contact already exists
        const existing = await prisma.cRMContact.findUnique({
          where: profile.clerkUserId
            ? { clerkUserId: profile.clerkUserId }
            : profile.userId
            ? { userId: profile.userId }
            : undefined,
        });

        if (existing) {
          stats.skipped++;
          continue;
        }

        // Create CRM contact
        await prisma.cRMContact.create({
          data: {
            userId: profile.userId,
            clerkUserId: profile.clerkUserId,
            contactType: ContactType.CLIENT,
            firstName: profile.firstName || 'Unknown',
            lastName: profile.lastName || 'Unknown',
            email: profile.user?.email || `client-${profile.id}@unknown.com`,
            phone: profile.phone,
            company: profile.companyName,
            source: 'backfill',
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          },
        });

        stats.clients++;
        stats.totalProcessed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing client ${profile.id}:`, errorMessage);
        stats.errors++;
      }
    }
    console.log(`✅ Backfilled ${stats.clients} clients\n`);

    // 2. Backfill Tax Preparers from Profiles
    console.log('📋 Backfilling TAX PREPARERS from Profiles...');
    const preparerProfiles = await prisma.profile.findMany({
      where: {
        role: UserRole.TAX_PREPARER,
      },
      include: {
        user: true,
      },
    });

    for (const profile of preparerProfiles) {
      try {
        // Check if CRM contact already exists
        const existing = await prisma.cRMContact.findUnique({
          where: profile.clerkUserId
            ? { clerkUserId: profile.clerkUserId }
            : profile.userId
            ? { userId: profile.userId }
            : undefined,
        });

        if (existing) {
          stats.skipped++;
          continue;
        }

        // Create CRM contact
        await prisma.cRMContact.create({
          data: {
            userId: profile.userId,
            clerkUserId: profile.clerkUserId,
            contactType: ContactType.PREPARER,
            firstName: profile.firstName || 'Unknown',
            lastName: profile.lastName || 'Unknown',
            email: profile.user?.email || `preparer-${profile.id}@unknown.com`,
            phone: profile.phone,
            company: profile.companyName,
            source: 'backfill',
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          },
        });

        stats.preparers++;
        stats.totalProcessed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing preparer ${profile.id}:`, errorMessage);
        stats.errors++;
      }
    }
    console.log(`✅ Backfilled ${stats.preparers} tax preparers\n`);

    // 3. Backfill Affiliates from Profiles
    console.log('📋 Backfilling AFFILIATES from Profiles...');
    const affiliateProfiles = await prisma.profile.findMany({
      where: {
        role: UserRole.AFFILIATE,
      },
      include: {
        user: true,
      },
    });

    for (const profile of affiliateProfiles) {
      try {
        // Check if CRM contact already exists
        const existing = await prisma.cRMContact.findUnique({
          where: profile.clerkUserId
            ? { clerkUserId: profile.clerkUserId }
            : profile.userId
            ? { userId: profile.userId }
            : undefined,
        });

        if (existing) {
          stats.skipped++;
          continue;
        }

        // Create CRM contact
        await prisma.cRMContact.create({
          data: {
            userId: profile.userId,
            clerkUserId: profile.clerkUserId,
            contactType: ContactType.AFFILIATE,
            firstName: profile.firstName || 'Unknown',
            lastName: profile.lastName || 'Unknown',
            email: profile.user?.email || `affiliate-${profile.id}@unknown.com`,
            phone: profile.phone,
            company: profile.companyName,
            source: 'backfill',
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          },
        });

        stats.affiliates++;
        stats.totalProcessed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing affiliate ${profile.id}:`, errorMessage);
        stats.errors++;
      }
    }
    console.log(`✅ Backfilled ${stats.affiliates} affiliates\n`);

    // 4. Backfill Leads from Lead table
    console.log('📋 Backfilling LEADS from Lead table...');
    const leads = await prisma.lead.findMany({
      where: {
        status: {
          not: 'CONVERTED', // Skip converted leads (they should be clients now)
        },
      },
    });

    for (const lead of leads) {
      try {
        // Check if CRM contact already exists by email
        const existing = await prisma.cRMContact.findUnique({
          where: { email: lead.email },
        });

        if (existing) {
          stats.skipped++;
          continue;
        }

        // Determine contact type based on lead type
        let contactType: ContactType;
        switch (lead.type) {
          case 'CUSTOMER':
            contactType = ContactType.LEAD;
            break;
          case 'TAX_PREPARER':
            contactType = ContactType.PREPARER;
            break;
          case 'AFFILIATE':
            contactType = ContactType.AFFILIATE;
            break;
          default:
            contactType = ContactType.LEAD;
        }

        // Create CRM contact - leads don't have users yet
        await prisma.cRMContact.create({
          data: {
            userId: null, // Leads don't have users yet
            clerkUserId: null,
            contactType,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            source: lead.source || 'lead_form',
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
            // Map lead status to pipeline stage
            stage: lead.status === 'NEW' ? 'NEW' :
                   lead.status === 'CONTACTED' ? 'CONTACTED' : 'NEW',
            // Epic 6 Attribution Integration
            referrerUsername: lead.referrerUsername,
            referrerType: lead.referrerType,
            commissionRate: lead.commissionRate,
            commissionRateLockedAt: lead.commissionRateLockedAt,
            attributionMethod: lead.attributionMethod,
            attributionConfidence: lead.attributionConfidence,
          },
        });

        stats.leads++;
        stats.totalProcessed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing lead ${lead.id}:`, errorMessage);
        stats.errors++;
      }
    }
    console.log(`✅ Backfilled ${stats.leads} leads\n`);

    // 5. Backfill Converted Leads as CLIENT contacts
    console.log('📋 Backfilling CONVERTED LEADS as CLIENTS...');
    const convertedLeads = await prisma.lead.findMany({
      where: {
        status: 'CONVERTED',
      },
    });

    let convertedCount = 0;
    for (const lead of convertedLeads) {
      try {
        // Check if CRM contact already exists by email
        const existing = await prisma.cRMContact.findUnique({
          where: { email: lead.email },
        });

        if (existing) {
          stats.skipped++;
          continue;
        }

        // Create CRM contact as CLIENT (converted leads are now clients)
        await prisma.cRMContact.create({
          data: {
            userId: null, // User account may or may not exist
            clerkUserId: null,
            contactType: ContactType.CLIENT, // Converted = Client
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            source: lead.source || 'lead_form',
            stage: 'COMPLETE', // Converted leads have completed their return
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
            // Epic 6 Attribution Integration
            referrerUsername: lead.referrerUsername,
            referrerType: lead.referrerType,
            commissionRate: lead.commissionRate,
            commissionRateLockedAt: lead.commissionRateLockedAt,
            attributionMethod: lead.attributionMethod,
            attributionConfidence: lead.attributionConfidence,
          },
        });

        convertedCount++;
        stats.clients++; // Count as clients
        stats.totalProcessed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing converted lead ${lead.id}:`, errorMessage);
        stats.errors++;
      }
    }
    console.log(`✅ Backfilled ${convertedCount} converted leads as clients\n`);

    // Print final statistics
    console.log('=' .repeat(50));
    console.log('📊 BACKFILL SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Total Processed:  ${stats.totalProcessed}`);
    console.log(`   - Clients:        ${stats.clients}`);
    console.log(`   - Tax Preparers:  ${stats.preparers}`);
    console.log(`   - Affiliates:     ${stats.affiliates}`);
    console.log(`   - Leads:          ${stats.leads}`);
    console.log(`⏭️  Skipped (exists): ${stats.skipped}`);
    console.log(`❌ Errors:           ${stats.errors}`);
    console.log('=' .repeat(50));

    if (stats.errors > 0) {
      console.log('\n⚠️  Some errors occurred. Please review the logs above.');
      process.exit(1);
    } else {
      console.log('\n🎉 Backfill completed successfully!');
    }

  } catch (error) {
    console.error('\n💥 Fatal error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillCRMContacts();
