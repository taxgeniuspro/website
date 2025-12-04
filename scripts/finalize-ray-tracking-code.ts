/**
 * Finalize Ray Hamilton's Tracking Code and Generate Links
 */

import { PrismaClient } from '@prisma/client';
import { finalizeTrackingCode } from '../src/lib/services/tracking-code.service';
import { generateTaxPreparerStandardLinks } from '../src/lib/services/tax-preparer-links.service';

const prisma = new PrismaClient();

async function finalizeRayTrackingCode() {
  try {
    console.log('\n🔧 Finalizing Ray Hamilton\'s Tracking Code...\n');

    const preparerId = 'cmh9ze4aj0002jx5kkpnnu3no';
    const baseUrl = 'https://taxgeniuspro.tax';

    // Check current status
    const profile = await prisma.profile.findUnique({
      where: { id: preparerId },
      select: {
        trackingCode: true,
        customTrackingCode: true,
        trackingCodeFinalized: true,
        qrCodeLogoUrl: true,
      }
    });

    console.log('Current Status:');
    console.log(`  Tracking Code: ${profile?.trackingCode}`);
    console.log(`  Custom Code: ${profile?.customTrackingCode}`);
    console.log(`  Finalized: ${profile?.trackingCodeFinalized}`);
    console.log(`  Has Custom Logo: ${profile?.qrCodeLogoUrl ? 'YES' : 'NO'}`);
    console.log();

    if (profile?.trackingCodeFinalized) {
      console.log('✅ Tracking code already finalized!');
      console.log('   Checking if links exist...\n');

      const existingLinks = await prisma.marketingLink.findMany({
        where: { creatorId: preparerId }
      });

      console.log(`   Found ${existingLinks.length} existing links`);

      if (existingLinks.length < 2) {
        console.log('   ⚠️  Missing lead/intake links. Generating now...\n');
      } else {
        console.log('   Links already exist. Regenerating to ensure correct format...\n');

        // Delete old links to regenerate fresh ones
        await prisma.marketingLink.deleteMany({
          where: { creatorId: preparerId }
        });
        console.log('   🗑️  Deleted old links\n');
      }
    } else {
      console.log('📝 Finalizing tracking code...');

      // Finalize tracking code
      const result = await finalizeTrackingCode(preparerId, baseUrl);

      if (!result.success) {
        throw new Error(result.error || 'Failed to finalize tracking code');
      }

      console.log('✅ Tracking code finalized!\n');
    }

    // Generate the two standard links
    console.log('🎯 Generating tax preparer standard links...\n');

    const links = await generateTaxPreparerStandardLinks(preparerId);

    console.log('✅ Links generated successfully!\n');
    console.log('════════════════════════════════════════\n');

    console.log('1️⃣  LEAD FORM LINK (Contact Form)');
    console.log(`   Code: ${links.leadLink.code}`);
    console.log(`   URL: ${links.leadLink.url}`);
    console.log(`   Short: ${links.leadLink.shortUrl}`);
    console.log(`   Title: ${links.leadLink.title}`);
    console.log(`   QR Code: ${links.leadLink.qrCodeDataUrl ? 'Generated' : 'Missing'}`);
    console.log();

    console.log('2️⃣  INTAKE FORM LINK (Tax Filing Form)');
    console.log(`   Code: ${links.intakeLink.code}`);
    console.log(`   URL: ${links.intakeLink.url}`);
    console.log(`   Short: ${links.intakeLink.shortUrl}`);
    console.log(`   Title: ${links.intakeLink.title}`);
    console.log(`   QR Code: ${links.intakeLink.qrCodeDataUrl ? 'Generated' : 'Missing'}`);
    console.log();

    console.log('════════════════════════════════════════\n');
    console.log('🎉 Done! Both links with QR codes are ready!');
    console.log('   Visit: https://taxgeniuspro.tax/dashboard/tax-preparer/tracking\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalizeRayTrackingCode();
