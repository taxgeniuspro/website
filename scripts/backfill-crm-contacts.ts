#!/usr/bin/env tsx
/**
 * Backfill CRM Contacts from existing Users, Profiles, and Leads
 *
 * This script creates CRMContact records for all existing:
 * - Clients (role: client)
 * - Leads (from Lead table)
 * - Affiliates (role: affiliate)
 * - Tax Preparers (role: tax_preparer)
 * - Tax Intake Leads (from TaxIntakeLead table) - NEW!
 *
 * The script is idempotent - it can be run multiple times safely.
 *
 * Note: This app uses NextAuth (not Clerk), so we use userId (not clerkUserId)
 */

import { PrismaClient, ContactType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

interface BackfillStats {
  totalProcessed: number;
  clients: number;
  leads: number;
  taxIntakeLeads: number;
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
    taxIntakeLeads: 0,
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
        // Check if CRM contact already exists by userId or email
        const existing = await prisma.cRMContact.findFirst({
          where: {
            OR: [
              { userId: profile.userId },
              { email: profile.user?.email?.toLowerCase() },
            ].filter(Boolean),
          },
        });

        if (existing) {
          stats.skipped++;
          continue;
        }

        // Create CRM contact
        await prisma.cRMContact.create({
          data: {
            userId: profile.userId,
            contactType: ContactType.CLIENT,
            firstName: profile.firstName || 'Unknown',
            lastName: profile.lastName || 'Unknown',
            email: profile.user?.email?.toLowerCase() || `client-${profile.id}@unknown.com`,
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
        // Check if CRM contact already exists by userId or email
        const existing = await prisma.cRMContact.findFirst({
          where: {
            OR: [
              { userId: profile.userId },
              { email: profile.user?.email?.toLowerCase() },
            ].filter(Boolean),
          },
        });

        if (existing) {
          stats.skipped++;
          continue;
        }

        // Create CRM contact
        await prisma.cRMContact.create({
          data: {
            userId: profile.userId,
            contactType: ContactType.PREPARER,
            firstName: profile.firstName || 'Unknown',
            lastName: profile.lastName || 'Unknown',
            email: profile.user?.email?.toLowerCase() || `preparer-${profile.id}@unknown.com`,
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

    // 3. Backfill Affiliates from Profiles (new affiliate role)
    console.log('📋 Backfilling AFFILIATES from Profiles...');
    const affiliateProfiles = await prisma.profile.findMany({
      where: {
        role: UserRole.affiliate,
      },
      include: {
        user: true,
      },
    });

    for (const profile of affiliateProfiles) {
      try {
        // Check if CRM contact already exists by userId or email
        const existing = await prisma.cRMContact.findFirst({
          where: {
            OR: [
              { userId: profile.userId },
              { email: profile.user?.email?.toLowerCase() },
            ].filter(Boolean),
          },
        });

        if (existing) {
          stats.skipped++;
          continue;
        }

        // Create CRM contact
        await prisma.cRMContact.create({
          data: {
            userId: profile.userId,
            contactType: ContactType.AFFILIATE,
            firstName: profile.firstName || 'Unknown',
            lastName: profile.lastName || 'Unknown',
            email: profile.user?.email?.toLowerCase() || `affiliate-${profile.id}@unknown.com`,
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
            contactType: ContactType.CLIENT, // Converted = Client
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email.toLowerCase(),
            phone: lead.phone,
            source: lead.source || 'lead_form',
            stage: 'CLOSED', // Converted leads have completed their return
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

    // 6. Backfill from TaxIntakeLead table (CRITICAL - this is where most recent leads come from!)
    console.log('📋 Backfilling LEADS from TaxIntakeLead table...');
    const taxIntakeLeads = await prisma.taxIntakeLead.findMany({
      orderBy: { created_at: 'desc' },
    });

    let taxIntakeCount = 0;
    for (const lead of taxIntakeLeads) {
      try {
        // Check if CRM contact already exists by email (case-insensitive)
        const existing = await prisma.cRMContact.findUnique({
          where: { email: lead.email.toLowerCase() },
        });

        if (existing) {
          stats.skipped++;
          continue;
        }

        // Determine stage based on completion status
        let stage = 'NEW';
        if (lead.completed) {
          stage = 'QUALIFIED'; // Completed intake = qualified lead
        }
        if (lead.convertedToClient) {
          stage = 'CLOSED'; // Converted to client = closed
        }

        // Create CRM contact from TaxIntakeLead
        await prisma.cRMContact.create({
          data: {
            userId: lead.profileId, // Link to profile if converted
            contactType: ContactType.LEAD,
            firstName: lead.first_name,
            lastName: lead.last_name,
            email: lead.email.toLowerCase(),
            phone: lead.phone,
            source: 'tax_intake_form',
            stage,
            assignedPreparerId: lead.assignedPreparerId,
            referrerUsername: lead.referrerUsername,
            referrerType: lead.referrerType,
            commissionRate: lead.commissionRate,
            commissionRateLockedAt: lead.commissionRateLockedAt,
            attributionMethod: lead.attributionMethod,
            attributionConfidence: lead.attributionConfidence,
            taxYear: lead.tax_year,
            leadScore: lead.leadScore,
            createdAt: lead.created_at,
            updatedAt: lead.updated_at,
            lastContactedAt: lead.lastContactedAt,
          },
        });

        taxIntakeCount++;
        stats.taxIntakeLeads++;
        stats.totalProcessed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing TaxIntakeLead ${lead.id}:`, errorMessage);
        stats.errors++;
      }
    }
    console.log(`✅ Backfilled ${taxIntakeCount} leads from TaxIntakeLead table\n`);

    // Print final statistics
    console.log('=' .repeat(50));
    console.log('📊 BACKFILL SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Total Processed:    ${stats.totalProcessed}`);
    console.log(`   - Clients:          ${stats.clients}`);
    console.log(`   - Tax Preparers:    ${stats.preparers}`);
    console.log(`   - Affiliates:       ${stats.affiliates}`);
    console.log(`   - Leads (Lead):     ${stats.leads}`);
    console.log(`   - Leads (Intake):   ${stats.taxIntakeLeads}`);
    console.log(`⏭️  Skipped (exists):   ${stats.skipped}`);
    console.log(`❌ Errors:             ${stats.errors}`);
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
