/**
 * Update Ray Hamilton's Profile
 * - Fix name spelling (Hamalton → Hamilton)
 * - Ensure profile picture is set
 * - Regenerate QR codes
 * - Verify tracking links
 */

import { PrismaClient } from '@prisma/client';
import { assignTrackingCodeToUser } from '../src/lib/services/tracking-code.service';

const prisma = new PrismaClient();

const RAY_USER_ID = 'cmh9ze4530000jx5kc6b0vqz2';

async function updateRayHamilton() {
  console.log('🔍 Finding Ray Hamilton\'s account...');

  const user = await prisma.user.findUnique({
    where: { id: RAY_USER_ID },
    include: { profile: true },
  });

  if (!user || !user.profile) {
    console.error('❌ Ray Hamilton not found!');
    process.exit(1);
  }

  console.log('✅ Found Ray Hamilton');
  console.log('📧 Email:', user.email);
  console.log('👤 Name:', user.profile.firstName, user.profile.lastName);
  console.log('🔖 Tracking Code:', user.profile.trackingCode);
  console.log('🖼️  Avatar URL:', user.profile.avatarUrl ? 'Set' : 'Not set');
  console.log('📷 QR Logo URL:', user.profile.qrCodeLogoUrl ? 'Set' : 'Not set');
  console.log('🔲 QR Code URL:', user.profile.trackingCodeQRUrl ? 'Set' : 'Not set');

  // Step 1: Fix name spelling if needed
  if (user.profile.lastName === 'Hamalton') {
    console.log('\n📝 Fixing name spelling: Hamalton → Hamilton');
    await prisma.profile.update({
      where: { id: user.profile.id },
      data: { lastName: 'Hamilton' },
    });
    console.log('✅ Name corrected');
  } else {
    console.log('\n✅ Name already correct:', user.profile.lastName);
  }

  // Step 2: Check tracking code
  const trackingCode = user.profile.trackingCode || user.profile.customTrackingCode;
  if (!trackingCode) {
    console.error('❌ No tracking code found!');
    process.exit(1);
  }

  console.log('\n🔖 Using tracking code:', trackingCode);

  // Step 3: Regenerate QR codes
  console.log('\n🔄 Regenerating QR codes and tracking URLs...');
  try {
    await assignTrackingCodeToUser(RAY_USER_ID, trackingCode);
    console.log('✅ QR codes regenerated successfully');
  } catch (error) {
    console.error('❌ Error regenerating QR codes:', error);
    throw error;
  }

  // Step 4: Verify final state
  const updatedProfile = await prisma.profile.findUnique({
    where: { userId: RAY_USER_ID },
  });

  console.log('\n✅ FINAL STATE:');
  console.log('👤 Name:', updatedProfile?.firstName, updatedProfile?.lastName);
  console.log('🔖 Tracking Code:', updatedProfile?.trackingCode);
  console.log('🖼️  Avatar URL:', updatedProfile?.avatarUrl ? '✓ Set' : '✗ Not set');
  console.log('📷 QR Logo URL:', updatedProfile?.qrCodeLogoUrl ? '✓ Set' : '✗ Not set');
  console.log('🔲 QR Code URL:', updatedProfile?.trackingCodeQRUrl ? '✓ Set' : '✗ Not set');

  // Step 5: Show referral URLs
  const baseUrl = 'https://taxgeniuspro.tax';
  console.log('\n🔗 REFERRAL LINKS:');
  console.log('📋 Intake Form:', `${baseUrl}/start-filing/form?ref=${trackingCode}`);
  console.log('📅 Appointment:', `${baseUrl}/book-appointment?ref=${trackingCode}`);
  console.log('🏠 Homepage:', `${baseUrl}?ref=${trackingCode}`);

  if (updatedProfile?.trackingCodeQRUrl) {
    console.log('\n📱 QR CODE URL:');
    console.log(updatedProfile.trackingCodeQRUrl);
  }

  console.log('\n✨ Ray Hamilton\'s profile update complete!');
}

updateRayHamilton()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
