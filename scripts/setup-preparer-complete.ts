import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

const prisma = new PrismaClient();

async function main() {
  const email = 'appvillagellc@gmail.com';

  console.log('Setting up tax preparer:', email);

  // Get preparer
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (!user || !user.profile) {
    console.log('❌ Preparer not found');
    process.exit(1);
  }

  console.log('✓ Found preparer:', user.profile.trackingCode);

  // Read and process the image
  const imageBuffer = readFileSync('/tmp/preparer-photo.jpg');
  const resizedImage = await sharp(imageBuffer)
    .resize(400, 400, { fit: 'cover' })
    .jpeg({ quality: 85 })
    .toBuffer();

  const base64Image = `data:image/jpeg;base64,${resizedImage.toString('base64')}`;

  console.log('✓ Processed profile photo');

  // Update profile with photo
  await prisma.profile.update({
    where: { id: user.profile.id },
    data: {
      avatarUrl: base64Image,
      qrCodeLogoUrl: base64Image,
      usePhotoInQRCodes: true,
    },
  });

  console.log('✓ Updated profile with photo');

  // Generate referral URLs
  const trackingCode = user.profile.trackingCode;
  const intakeFormUrl = `https://taxgeniuspro.tax/start-filing?ref=${trackingCode}`;
  const contactFormUrl = `https://taxgeniuspro.tax/contact?ref=${trackingCode}`;
  const appointmentUrl = `https://taxgeniuspro.tax/book-appointment?ref=${trackingCode}`;
  const referralUrl = `https://taxgeniuspro.tax/ref/${trackingCode}`;

  console.log('\n✅ Tax preparer setup complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email:', email);
  console.log('Tracking Code:', trackingCode);
  console.log('Profile Photo: Added ✓');
  console.log('\n📧 WELCOME EMAIL CONTENT:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`
Welcome to Tax Genius Pro, ${user.profile.firstName}!

Your tax preparer account is now active. Here are your personalized referral links:

🔗 YOUR REFERRAL LINKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Tax Intake Form: ${intakeFormUrl}
2. Contact Form: ${contactFormUrl}
3. Book Appointment: ${appointmentUrl}
4. General Referral: ${referralUrl}

📊 YOUR TRACKING CODE: ${trackingCode}

💡 HOW IT WORKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Share your links with potential clients
2. When they complete a form, you'll receive an email notification
3. The client will be automatically assigned to you
4. Access your dashboard to manage your clients and track earnings

📱 MOBILE APP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Download the Tax Genius Pro mobile app to:
- Track your referrals on the go
- Receive push notifications for new leads
- Manage your client relationships
- View your earnings in real-time

🎯 NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Share your referral links with your network
2. Add your tracking code to your email signature
3. Print QR codes with your photo for in-person referrals
4. Check your dashboard regularly for new leads

Need help? Contact us at support@taxgeniuspro.tax

Welcome aboard!
The Tax Genius Pro Team
`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Now prepare the actual email data
  console.log('📨 To send this via Resend, the app needs to call:');
  console.log(`EmailService.sendTaxPreparerWelcomeEmail(`);
  console.log(`  to: "${email}",`);
  console.log(`  name: "${user.profile.firstName} ${user.profile.lastName}",`);
  console.log(`  email: "${email}",`);
  console.log(`  trackingCode: "${trackingCode}",`);
  console.log(`  magicLinkUrl: "https://taxgeniuspro.tax/auth/signin",`);
  console.log(`  expiresIn: "Never"`);
  console.log(`);`);
}

main().finally(() => prisma.$disconnect());
