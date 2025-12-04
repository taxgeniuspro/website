import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { finalizeTrackingCode } from '../src/lib/services/tracking-code.service';
import { generateTaxPreparerStandardLinks } from '../src/lib/services/tax-preparer-links.service';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👨‍💼 SETUP TEST TAX PREPARER ACCOUNT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const email = 'test-preparer@example.com';
  const password = 'TestPreparer123!';
  const name = 'Test Tax Preparer';

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (!user) {
    console.log('📝 Creating new tax preparer user...');
    const hashedPassword = await bcrypt.hash(password, 10);

    user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
        emailVerified: new Date(),
      },
      include: { profile: true },
    });
    console.log('✅ User created');
  } else {
    console.log('✅ User already exists');
  }

  // Create or update profile
  let profile = user.profile;

  if (!profile) {
    console.log('📝 Creating tax preparer profile...');
    profile = await prisma.profile.create({
      data: {
        userId: user.id,
        role: 'tax_preparer',
        trackingCode: 'testpreparer',
        customTrackingCode: 'testpreparer123',
      },
    });
    console.log('✅ Profile created');
  } else if (profile.role !== 'tax_preparer') {
    console.log('📝 Updating profile to tax_preparer role...');
    profile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        role: 'tax_preparer',
        trackingCode: 'testpreparer',
        customTrackingCode: 'testpreparer123',
      },
    });
    console.log('✅ Profile updated');
  }

  console.log('');
  console.log('📋 Profile ID:', profile.id);
  console.log('🏷️  Tracking Code:', profile.customTrackingCode || profile.trackingCode);
  console.log('');

  // Finalize tracking code
  if (!profile.trackingCodeFinalized) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
    console.log('🔒 Finalizing tracking code...');
    const result = await finalizeTrackingCode(profile.id, baseUrl);

    if (!result.success) {
      console.log('❌ Error:', result.error);
      return;
    }

    console.log('✅ Tracking code finalized!');
    console.log('');
  } else {
    console.log('✅ Tracking code already finalized');
    console.log('');
  }

  // Generate tax preparer links
  console.log('🔗 Generating tax preparer links...');
  const links = await generateTaxPreparerStandardLinks(profile.id);

  console.log('✅ Tax preparer links generated successfully!');
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
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('');
  console.log('📊 After logging in, go to:');
  console.log('https://taxgeniuspro.tax/dashboard/tax-preparer');
  console.log('Scroll down to see "My Referral Links" section');
  console.log('');
  console.log('🎯 KEY DIFFERENCE FROM AFFILIATES:');
  console.log('→ Leads from these links are ASSIGNED TO YOU');
  console.log('→ You can see full client details (not just names)');
  console.log('→ Clients become YOUR clients automatically');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
