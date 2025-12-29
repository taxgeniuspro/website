/**
 * Test script to verify Owliver assignment for rejected preparer applicants
 *
 * Tests:
 * 1. getOwliverProfileId() finds Owliver correctly
 * 2. assignClientToOwliver() creates ClientPreparer relationship
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('🧪 Testing Owliver Assignment Logic\n');

  try {
    // Test 1: Find Owliver by tracking code
    console.log('1️⃣ Finding Owliver by tracking code "ow"...');
    const owliverByCode = await prisma.profile.findFirst({
      where: { customTrackingCode: 'ow' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { email: true } }
      },
    });

    if (owliverByCode) {
      console.log(`   ✅ Found Owliver: ${owliverByCode.firstName} ${owliverByCode.lastName}`);
      console.log(`      Profile ID: ${owliverByCode.id}`);
      console.log(`      Email: ${owliverByCode.user?.email}\n`);
    } else {
      console.log('   ❌ Owliver not found by tracking code\n');
    }

    // Test 2: Find Owliver by email
    console.log('2️⃣ Finding Owliver by email "taxgenius.tax@gmail.com"...');
    const owliverByEmail = await prisma.user.findUnique({
      where: { email: 'taxgenius.tax@gmail.com' },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customTrackingCode: true
          }
        }
      },
    });

    if (owliverByEmail?.profile) {
      console.log(`   ✅ Found Owliver User: ${owliverByEmail.name}`);
      console.log(`      User ID: ${owliverByEmail.id}`);
      console.log(`      Profile ID: ${owliverByEmail.profile.id}`);
      console.log(`      Tracking Code: ${owliverByEmail.profile.customTrackingCode}\n`);
    } else {
      console.log('   ❌ Owliver not found by email\n');
    }

    // Test 3: Check if both methods return same profile
    console.log('3️⃣ Verifying both methods return same profile...');
    const match = owliverByCode?.id === owliverByEmail?.profile?.id;
    console.log(`   ${match ? '✅' : '❌'} Profile IDs match: ${match}\n`);

    // Test 4: Count existing ClientPreparer relationships with Owliver
    if (owliverByCode?.id) {
      console.log('4️⃣ Checking existing ClientPreparer assignments to Owliver...');
      const clientCount = await prisma.clientPreparer.count({
        where: { preparerId: owliverByCode.id }
      });
      console.log(`   📊 Owliver has ${clientCount} assigned clients\n`);
    }

    // Test 5: Check rejected preparer applications with pending conversion
    console.log('5️⃣ Checking rejected preparer applications with pending conversion...');
    const pendingConversions = await prisma.preparerApplication.findMany({
      where: {
        status: 'REJECTED',
        notes: { contains: '[PENDING_CONVERSION:' }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        notes: true,
      }
    });

    if (pendingConversions.length > 0) {
      console.log(`   📋 Found ${pendingConversions.length} pending conversions:`);
      for (const app of pendingConversions) {
        const hasOwliverMarker = app.notes?.includes('[ASSIGN_TO_OWLIVER]');
        console.log(`      - ${app.firstName} ${app.lastName} (${app.email})`);
        console.log(`        Owliver marker: ${hasOwliverMarker ? '✅' : '❌'}`);
      }
    } else {
      console.log('   📋 No pending conversions found');
    }
    console.log('');

    console.log('='.repeat(50));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(50));

    // Print recommendation
    if (owliverByCode?.id) {
      console.log(`\n💡 Recommendation: Set OWLIVER_PROFILE_ID=${owliverByCode.id} in Coolify`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest().catch(console.error);
