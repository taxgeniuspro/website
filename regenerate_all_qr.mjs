/**
 * Simple QR Code Regeneration Script
 * Uses inline QR generation to avoid TypeScript path alias issues
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

// Inline QR generation function
async function generateQRCodeWithLogo(url, profileId) {
  const size = 512;
  const qrOptions = {
    width: size,
    margin: 2,
    color: {
      dark: '#000000', // Black QR code
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
    // Check for custom logo from profile
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
        console.log('    ⚠️ Custom logo failed, using default');
      }
    }

    // Fallback to default logo
    if (!logoBuffer) {
      const logoPath = join(__dirname, 'public', 'images', 'tax-genius-logo.png');
      try {
        logoBuffer = await readFile(logoPath);
        console.log('    ✅ Default logo loaded');
      } catch (error) {
        // Try fallback icon
        const iconPath = join(__dirname, 'public', 'icon-512x512.png');
        try {
          logoBuffer = await readFile(iconPath);
          console.log('    ✅ Fallback icon loaded');
        } catch (e) {
          console.log('    ⚠️ No logo available, skipping');
          throw new Error('No logo file found');
        }
      }
    }

    // Process logo
    const logoSize = Math.floor(size * 0.2);
    const padding = Math.floor(logoSize * 0.15);

    const processedLogo = await sharp(logoBuffer)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    // Composite logo onto QR code
    qrBuffer = await sharp(qrBuffer)
      .composite([{
        input: processedLogo,
        gravity: 'center'
      }])
      .png()
      .toBuffer();

    console.log('    ✅ Logo composited successfully');
  } catch (error) {
    console.log('    ⚠️ Logo overlay failed, using plain QR:', error.message);
  }

  // Add white bevel border
  const bevelSize = Math.floor(size * 0.1);
  qrBuffer = await sharp(qrBuffer)
    .extend({
      top: bevelSize,
      bottom: bevelSize,
      left: bevelSize,
      right: bevelSize,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toBuffer();

  // Convert to data URL
  const dataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;
  return { dataUrl, size: dataUrl.length };
}

async function regenerateAllQRCodes() {
  console.log('🚀 Starting QR code regeneration for all users...\n');

  const profiles = await prisma.profile.findMany({
    where: {
      OR: [
        { trackingCode: { not: null } },
        { customTrackingCode: { not: null } }
      ]
    },
    select: {
      id: true,
      trackingCode: true,
      customTrackingCode: true,
      qrCodeLogoUrl: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  console.log(`📊 Found ${profiles.length} profiles with tracking codes\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const activeCode = profile.customTrackingCode || profile.trackingCode;
    const userName = profile.user?.name || 'Unknown';
    const userEmail = profile.user?.email || 'Unknown';

    console.log(`\n[${i + 1}/${profiles.length}] ${userName} (${userEmail})`);
    console.log(`  📝 Code: ${activeCode}`);
    console.log(`  ${profile.qrCodeLogoUrl ? '📸' : '🏢'} Custom Logo: ${profile.qrCodeLogoUrl ? 'YES' : 'NO (will use default)'}`);

    try {
      // Generate main tracking QR
      const trackingUrl = `${baseUrl}/ref/${activeCode}`;
      console.log('  🎨 Generating main tracking QR code...');
      const mainQR = await generateQRCodeWithLogo(trackingUrl, profile.id);

      await prisma.profile.update({
        where: { id: profile.id },
        data: {
          trackingCodeQRUrl: mainQR.dataUrl,
        },
      });

      const qrSizeKB = (mainQR.size * 0.75 / 1024).toFixed(2);
      console.log(`  💾 Main QR updated (${qrSizeKB} KB)`);

      // Regenerate marketing link QR codes
      const marketingLinks = await prisma.marketingLink.findMany({
        where: { creatorId: profile.id },
        select: { id: true, url: true, code: true, title: true },
      });

      if (marketingLinks.length > 0) {
        console.log(`  🔗 Found ${marketingLinks.length} marketing links`);

        for (const link of marketingLinks) {
          console.log(`    - ${link.title || link.code}`);
          const linkQR = await generateQRCodeWithLogo(link.url, profile.id);

          await prisma.marketingLink.update({
            where: { id: link.id },
            data: {
              qrCodeImageUrl: linkQR.dataUrl,
            },
          });

          const linkQRSizeKB = (linkQR.size * 0.75 / 1024).toFixed(2);
          console.log(`      ✅ Updated (${linkQRSizeKB} KB)`);
        }
      } else {
        console.log('  ℹ️  No marketing links to update');
      }

      successCount++;
      console.log(`  ✨ Success! Total QR codes regenerated: ${marketingLinks.length + 1}`);
    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 REGENERATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}/${profiles.length} profiles`);
  console.log(`❌ Failed: ${errorCount}/${profiles.length} profiles`);
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

regenerateAllQRCodes()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
