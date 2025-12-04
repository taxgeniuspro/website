/**
 * Regenerate Ray Hamilton's QR Code
 */

import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();
const baseUrl = 'https://taxgeniuspro.tax';

const RAY_PROFILE_ID = 'cmh9ze4aj0002jx5kkpnnu3no';

// Inline QR generation function
async function generateQRCodeWithLogo(url, profileId) {
  const size = 512;
  const qrOptions = {
    width: size,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  };

  // Generate base QR code
  let qrBuffer = await QRCode.toBuffer(url, {
    ...qrOptions,
    type: 'png',
  });

  // Add logo
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { qrCodeLogoUrl: true },
    });

    let logoBuffer;

    // Try custom logo first
    if (profile?.qrCodeLogoUrl) {
      try {
        console.log('    📸 Fetching custom logo...');
        const response = await fetch(profile.qrCodeLogoUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          logoBuffer = Buffer.from(arrayBuffer);
          console.log('    ✅ Custom logo loaded');
        }
      } catch (error) {
        console.log('    ⚠️  Custom logo failed, using default');
      }
    }

    // Fallback to default logo
    if (!logoBuffer) {
      const defaultLogoPath = join(
        __dirname,
        '..',
        'public',
        'images',
        'logo.png'
      );
      logoBuffer = await readFile(defaultLogoPath);
    }

    // Resize logo to fit in QR code center
    const logoSize = Math.floor(size * 0.25);
    const processedLogo = await sharp(logoBuffer)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .toBuffer();

    // Composite logo on QR code
    qrBuffer = await sharp(qrBuffer)
      .composite([
        {
          input: processedLogo,
          top: Math.floor((size - logoSize) / 2),
          left: Math.floor((size - logoSize) / 2),
        },
      ])
      .toBuffer();
  } catch (error) {
    console.log('    ⚠️  Error adding logo, using plain QR:', error.message);
  }

  // Convert to data URL
  const dataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;

  return dataUrl;
}

async function regenerateRayQR() {
  console.log('🔄 Regenerating Ray Hamilton\'s QR Code\n');

  // Get Ray's profile
  const profile = await prisma.profile.findUnique({
    where: { id: RAY_PROFILE_ID },
    select: {
      firstName: true,
      lastName: true,
      trackingCode: true,
      qrCodeLogoUrl: true,
      userId: true,
    },
  });

  if (!profile) {
    console.error('❌ Profile not found!');
    process.exit(1);
  }

  console.log(`👤 Name: ${profile.firstName} ${profile.lastName}`);
  console.log(`🔖 Tracking Code: ${profile.trackingCode}`);
  console.log(`📸 Custom Logo: ${profile.qrCodeLogoUrl ? 'Yes' : 'No'}\n`);

  // Generate tracking URL
  const trackingUrl = `${baseUrl}?ref=${profile.trackingCode}`;
  console.log(`🔗 URL: ${trackingUrl}`);

  // Generate QR code
  console.log('📱 Generating QR code...');
  const qrCodeDataUrl = await generateQRCodeWithLogo(trackingUrl, RAY_PROFILE_ID);

  // Update database
  await prisma.profile.update({
    where: { id: RAY_PROFILE_ID },
    data: {
      trackingCodeQRUrl: qrCodeDataUrl,
    },
  });

  console.log('✅ QR code regenerated and saved!\n');
  console.log('🎯 Referral Links:');
  console.log(`   📋 Intake: ${baseUrl}/start-filing/form?ref=${profile.trackingCode}`);
  console.log(`   📅 Appointment: ${baseUrl}/book-appointment?ref=${profile.trackingCode}`);
  console.log(`   🏠 Homepage: ${trackingUrl}`);
  console.log('\n✨ Complete!');
}

regenerateRayQR()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
