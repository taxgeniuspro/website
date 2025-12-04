/**
 * Setup Preparer Availability Script
 *
 * This script sets up the default availability schedule for the Tax Genius Pro Team preparer
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupPreparerAvailability() {
  try {
    console.log('🔍 Finding tax preparers...\n');

    // Find all tax preparers via Profile
    const profiles = await prisma.profile.findMany({
      where: {
        role: 'tax_preparer'
      },
      include: {
        user: true,
      },
      take: 10
    });

    console.log(`Found ${profiles.length} tax preparer(s):\n`);

    profiles.forEach((p, idx) => {
      console.log(`${idx + 1}. Name: ${p.user.name}`);
      console.log(`   Email: ${p.user.email}`);
      console.log(`   Profile ID: ${p.id}`);
      console.log(`   User ID: ${p.userId}\n`);
    });

    // Find the default preparer - prioritize taxgenius.tax@gmail.com
    const defaultProfile = profiles.find(p =>
      p.user.email === 'taxgenius.tax@gmail.com'
    ) || profiles.find(p =>
      p.user.email?.includes('owilver') ||
      p.user.name?.includes('Oliver') ||
      p.user.name?.includes('Tax Genius Pro Team')
    ) || profiles[0];

    if (!defaultProfile) {
      console.error('❌ No tax preparer found!');
      return;
    }

    console.log(`✅ Using preparer: ${defaultProfile.user.name} (${defaultProfile.user.email})`);
    console.log(`   Profile ID: ${defaultProfile.id}\n`);

    // Get existing availability
    const existingAvailability = await prisma.preparerAvailability.findMany({
      where: { preparerId: defaultProfile.id }
    });

    // Delete existing availability
    if (existingAvailability.length > 0) {
      console.log(`🗑️  Deleting ${existingAvailability.length} existing availability entries...`);
      await prisma.preparerAvailability.deleteMany({
        where: { preparerId: defaultProfile.id }
      });
      console.log('✅ Existing availability deleted\n');
    }

    // Create new availability schedule based on business hours
    // Monday-Friday: 9:00 AM - 7:00 PM
    // Saturday: 10:00 AM - 5:00 PM
    // Sunday: Closed

    console.log('📅 Creating new availability schedule...\n');

    const availabilitySchedule = [
      // Monday
      { dayOfWeek: 1, startTime: '09:00', endTime: '19:00', isAvailable: true },
      // Tuesday
      { dayOfWeek: 2, startTime: '09:00', endTime: '19:00', isAvailable: true },
      // Wednesday
      { dayOfWeek: 3, startTime: '09:00', endTime: '19:00', isAvailable: true },
      // Thursday
      { dayOfWeek: 4, startTime: '09:00', endTime: '19:00', isAvailable: true },
      // Friday
      { dayOfWeek: 5, startTime: '09:00', endTime: '19:00', isAvailable: true },
      // Saturday
      { dayOfWeek: 6, startTime: '10:00', endTime: '17:00', isAvailable: true },
      // Sunday - Closed (no entry needed, but adding for completeness)
      { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', isAvailable: false },
    ];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const schedule of availabilitySchedule) {
      await prisma.preparerAvailability.create({
        data: {
          preparerId: defaultProfile.id,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isActive: schedule.isAvailable,
          serviceIds: [], // All services allowed
        }
      });

      if (schedule.isAvailable) {
        console.log(`✅ ${dayNames[schedule.dayOfWeek]}: ${schedule.startTime} - ${schedule.endTime}`);
      } else {
        console.log(`❌ ${dayNames[schedule.dayOfWeek]}: Closed`);
      }
    }

    console.log('\n🎉 Availability schedule setup complete!\n');
    console.log('📋 Summary:');
    console.log(`   Preparer: ${defaultProfile.user.name}`);
    console.log(`   Email: ${defaultProfile.user.email}`);
    console.log(`   Profile ID: ${defaultProfile.id}`);
    console.log(`   Available: Mon-Fri 9AM-7PM, Sat 10AM-5PM`);
    console.log(`   Closed: Sunday\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupPreparerAvailability();
