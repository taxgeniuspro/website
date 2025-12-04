/**
 * Verify Complete CRM Data After Full Testing
 * Checks all CRM contacts, interactions, and related records
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
  console.log('\n========================================');
  console.log('CRM INTEGRATION DATA VERIFICATION');
  console.log('========================================\n');

  try {
    // 1. Count all test CRM contacts
    const allContacts = await prisma.cRMContact.findMany({
      where: {
        OR: [
          { email: { contains: 'test', endsWith: '@example.com' } },
          { email: { contains: '.prep', endsWith: '@example.com' } },
          { email: { contains: '.ref', endsWith: '@example.com' } },
          { email: { contains: '.aff', endsWith: '@example.com' } },
          { email: { contains: '.cust', endsWith: '@example.com' } },
          { email: { contains: '.plead', endsWith: '@example.com' } },
          { email: { contains: '.alead', endsWith: '@example.com' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        interactions: true,
      },
    });

    console.log(`✅ TOTAL TEST CRM CONTACTS: ${allContacts.length}\n`);

    // 2. Breakdown by contact type
    const byType = {
      LEAD: allContacts.filter(c => c.contactType === 'LEAD').length,
      PREPARER: allContacts.filter(c => c.contactType === 'PREPARER').length,
      AFFILIATE: allContacts.filter(c => c.contactType === 'AFFILIATE').length,
      CLIENT: allContacts.filter(c => c.contactType === 'CLIENT').length,
    };

    console.log('📊 BREAKDOWN BY CONTACT TYPE:');
    console.log(`   - LEAD: ${byType.LEAD}`);
    console.log(`   - PREPARER: ${byType.PREPARER}`);
    console.log(`   - AFFILIATE: ${byType.AFFILIATE}`);
    console.log(`   - CLIENT: ${byType.CLIENT}`);
    console.log('');

    // 3. Breakdown by source
    const bySources = allContacts.reduce((acc, contact) => {
      const source = contact.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📋 BREAKDOWN BY SOURCE:');
    Object.entries(bySources)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`   - ${source}: ${count}`);
      });
    console.log('');

    // 4. Attribution tracking
    const withAttribution = allContacts.filter(c => c.referrerUsername === 'ray');
    console.log(`🎯 ATTRIBUTION TO RAY: ${withAttribution.length}/${allContacts.length} contacts\n`);

    // 5. Interactions count
    const totalInteractions = allContacts.reduce((sum, c) => sum + c.interactions.length, 0);
    const interactionsByType = allContacts.reduce((acc, contact) => {
      contact.interactions.forEach(interaction => {
        const type = interaction.type || 'UNKNOWN';
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    console.log(`💬 TOTAL CRM INTERACTIONS: ${totalInteractions}`);
    console.log('   Breakdown:');
    Object.entries(interactionsByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
      });
    console.log('');

    // 6. Appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        clientEmail: {
          contains: 'test',
          endsWith: '@example.com',
        },
      },
    });

    console.log(`📅 TOTAL APPOINTMENTS: ${appointments.length}`);
    if (appointments.length > 0) {
      const byStatus = appointments.reduce((acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('   By Status:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
      });
    }
    console.log('');

    // 7. Preparer Applications
    const preparerApps = await prisma.preparerApplication.findMany({
      where: {
        email: {
          contains: '.prep',
          endsWith: '@example.com',
        },
      },
    });

    console.log(`👔 PREPARER APPLICATIONS: ${preparerApps.length}`);
    if (preparerApps.length > 0) {
      console.log('   Applicants:');
      preparerApps.forEach(app => {
        console.log(`   - ${app.firstName} ${app.lastName} (${app.status})`);
      });
    }
    console.log('');

    // 8. Tax Intake Leads
    const taxLeads = await prisma.taxIntakeLead.findMany({
      where: {
        email: {
          contains: 'test',
          endsWith: '@example.com',
        },
      },
    });

    console.log(`📝 TAX INTAKE LEADS: ${taxLeads.length}`);
    console.log('');

    // 9. Recent contacts (last 27)
    console.log('📋 MOST RECENT TEST CONTACTS (Last 27):');
    const recentContacts = allContacts.slice(0, 27);
    recentContacts.forEach((contact, index) => {
      const attribution = contact.referrerUsername ? ` [Ray]` : '';
      console.log(`   ${index + 1}. ${contact.firstName} ${contact.lastName} - ${contact.contactType}${attribution} (${contact.source})`);
    });
    console.log('');

    // 10. Data integrity checks
    console.log('✅ DATA INTEGRITY CHECKS:');
    const missingPhone = allContacts.filter(c => !c.phone).length;
    const missingSource = allContacts.filter(c => !c.source).length;
    const missingLastContacted = allContacts.filter(c => !c.lastContactedAt).length;

    console.log(`   - Contacts with phone: ${allContacts.length - missingPhone}/${allContacts.length} (${Math.round(((allContacts.length - missingPhone) / allContacts.length) * 100)}%)`);
    console.log(`   - Contacts with source: ${allContacts.length - missingSource}/${allContacts.length} (${Math.round(((allContacts.length - missingSource) / allContacts.length) * 100)}%)`);
    console.log(`   - Contacts with lastContactedAt: ${allContacts.length - missingLastContacted}/${allContacts.length} (${Math.round(((allContacts.length - missingLastContacted) / allContacts.length) * 100)}%)`);
    console.log('');

    console.log('========================================');
    console.log('✅ VERIFICATION COMPLETE');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error verifying data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();
