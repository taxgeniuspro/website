import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { finalizeTrackingCode } from '../src/lib/services/tracking-code.service';
import { generateAffiliateStandardLinks } from '../src/lib/services/affiliate-links.service';

const prisma = new PrismaClient();

async function setup() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 FINALIZING TEST AFFILIATE TRACKING CODE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const profile = await prisma.profile.findFirst({
    where: {
      user: { email: 'test-affiliate@example.com' },
    },
  });

  if (!profile) {
    console.log('❌ Profile not found');
    return;
  }

  console.log('📋 Profile ID:', profile.id);
  console.log('🏷️  Tracking Code:', profile.customTrackingCode || profile.trackingCode);
  console.log('');

  // Finalize tracking code
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
  console.log('🔒 Finalizing tracking code...');
  const result = await finalizeTrackingCode(profile.id, baseUrl);

  if (!result.success) {
    console.log('❌ Error:', result.error);
    return;
  }

  console.log('✅ Tracking code finalized!');
  console.log('');

  // Generate affiliate links
  console.log('🔗 Generating affiliate links...');
  const links = await generateAffiliateStandardLinks(profile.id);

  console.log('✅ Affiliate links generated successfully!');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 LEAD FORM LINK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Code:', links.leadLink.code);
  console.log('Short URL:', links.leadLink.shortUrl);
  console.log('Full URL:', links.leadLink.url);
  console.log('QR Code:', links.leadLink.qrCodeDataUrl ? 'Generated ✅' : 'Missing ❌');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 INTAKE FORM LINK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Code:', links.intakeLink.code);
  console.log('Short URL:', links.intakeLink.shortUrl);
  console.log('Full URL:', links.intakeLink.url);
  console.log('QR Code:', links.intakeLink.qrCodeDataUrl ? 'Generated ✅' : 'Missing ❌');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 LOGIN CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('URL: https://taxgeniuspro.tax/auth/signin');
  console.log('Email: test-affiliate@example.com');
  console.log('Password: TestAffiliate123!');
  console.log('');
  console.log('📊 After logging in, go to:');
  console.log('https://taxgeniuspro.tax/dashboard/affiliate');
  console.log('Click the "Links & QR" tab to see your affiliate links');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await prisma.$disconnect();
}

setup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
