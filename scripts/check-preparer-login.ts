import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 CHECKING TAX PREPARER ACCOUNT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const user = await prisma.user.findUnique({
    where: { email: 'appvillagellc@gmail.com' },
    include: {
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          trackingCode: true,
          customTrackingCode: true,
          shortLinkUsername: true,
        },
      },
    },
  });

  if (user) {
    console.log('✅ TAX GENIUS PRO ACCOUNT FOUND');
    console.log('');
    console.log('📧 Email:', user.email);
    console.log('👤 Name:', user.name);
    console.log('🎭 Role:', user.role);
    console.log('🆔 User ID:', user.id);
    console.log('');

    if (user.profile) {
      console.log('📊 PROFILE DETAILS:');
      console.log('  Profile ID:', user.profile.id);
      console.log('  Full Name:', user.profile.firstName, user.profile.lastName);
      console.log('  Tracking Code:', user.profile.trackingCode || '(None)');
      console.log('  Custom Code:', user.profile.customTrackingCode || '(None)');
      console.log('  Short Link:', user.profile.shortLinkUsername || '(None)');
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 LOGIN INSTRUCTIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('1. Go to: https://taxgeniuspro.tax/auth/signin');
    console.log('2. Email: appvillagellc@gmail.com');
    console.log('3. Password: (Check your password manager or reset)');
    console.log('');
    console.log('4. To view leads: https://taxgeniuspro.tax/dashboard/tax-preparer/leads');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📬 TO CHECK EMAILS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Gmail: https://mail.google.com');
    console.log('Email: appvillagellc@gmail.com');
    console.log('Password: (Your Gmail password)');
    console.log('');
  } else {
    console.log('❌ No account found for appvillagellc@gmail.com');
    console.log('');
    console.log('Create account at: https://taxgeniuspro.tax/auth/signup');
  }
}

main().finally(() => prisma.$disconnect());
