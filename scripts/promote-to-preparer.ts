/**
 * Promote User to Tax Preparer Script
 *
 * This script promotes a client account to tax_preparer role:
 * 1. Updates profile.role to 'tax_preparer'
 * 2. Generates/assigns tracking code
 * 3. Creates 3 marketing links (lead, intake, appointment)
 * 4. Generates QR codes with their avatar
 * 5. Sends welcome email
 *
 * Usage:
 *   npx tsx scripts/promote-to-preparer.ts user@email.com
 *   npx tsx scripts/promote-to-preparer.ts user@email.com --code=gw
 *   npx tsx scripts/promote-to-preparer.ts user@email.com --code=gw --dry-run
 *   npx tsx scripts/promote-to-preparer.ts user@email.com --skip-email
 *
 * Options:
 *   --code=XX    Assign specific tracking code (e.g., gw, rh, iw)
 *   --dry-run    Preview changes without making them
 *   --skip-email Skip sending welcome email
 */

import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const email = args.find((arg) => !arg.startsWith('--'));
const codeArg = args.find((arg) => arg.startsWith('--code='));
const customCode = codeArg ? codeArg.split('=')[1] : null;
const isDryRun = args.includes('--dry-run');
const skipEmail = args.includes('--skip-email');

// Link type definitions matching the schema
const LINK_TYPES = {
  LEAD: {
    suffix: '-lead',
    targetPage: '/contact',
    title: 'Lead Capture Form',
  },
  INTAKE: {
    suffix: '-intake',
    targetPage: '/start-filing/form',
    title: 'Tax Intake Form',
  },
  APPOINTMENT: {
    suffix: '-appt',
    targetPage: '/book',
    title: 'Appointment Booking',
  },
};

async function generateTrackingCode(firstName: string, lastName: string): Promise<string> {
  // Generate code from initials (lowercase)
  const baseCode = `${(firstName?.[0] || 'x').toLowerCase()}${(lastName?.[0] || 'x').toLowerCase()}`;

  // Check if code is taken
  const existing = await prisma.profile.findFirst({
    where: {
      OR: [{ customTrackingCode: baseCode }, { trackingCode: baseCode }],
    },
  });

  if (existing) {
    // Try with number suffix
    let counter = 1;
    let code = `${baseCode}${counter}`;
    while (
      await prisma.profile.findFirst({
        where: { OR: [{ customTrackingCode: code }, { trackingCode: code }] },
      })
    ) {
      counter++;
      code = `${baseCode}${counter}`;
    }
    return code;
  }

  return baseCode;
}

async function generateQRCodeWithLogo(url: string, logoUrl?: string | null): Promise<string> {
  // Generate basic QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 512,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  // For now, return the basic QR code
  // Logo overlay would require canvas manipulation (can add later if needed)
  return qrDataUrl;
}

async function createMarketingLinks(profileId: string, trackingCode: string): Promise<void> {
  console.log('\n📎 Creating marketing links...\n');

  for (const [type, config] of Object.entries(LINK_TYPES)) {
    const code = `${trackingCode}${config.suffix}`;
    const url = `${config.targetPage}?ref=${trackingCode}`;

    // Check if link already exists
    const existing = await prisma.marketingLink.findUnique({
      where: { code },
    });

    if (existing) {
      console.log(`   ⚠️  Link ${code} already exists, skipping`);
      continue;
    }

    // Generate QR code for this link
    const fullUrl = `https://taxgeniuspro.tax/go/${code}`;
    const qrCodeImageUrl = await generateQRCodeWithLogo(fullUrl);

    if (!isDryRun) {
      await prisma.marketingLink.create({
        data: {
          creatorId: profileId,
          creatorType: 'TAX_PREPARER',
          linkType: type as 'LEAD' | 'INTAKE' | 'APPOINTMENT',
          code,
          url,
          shortUrl: `/go/${code}`,
          title: config.title,
          targetPage: config.targetPage,
          qrCodeImageUrl,
          isActive: true,
        },
      });
      console.log(`   ✅ Created link: /go/${code} → ${url}`);
    } else {
      console.log(`   [DRY RUN] Would create: /go/${code} → ${url}`);
    }
  }
}

async function updateProfileToTaxPreparer(
  profileId: string,
  trackingCode: string,
  avatarUrl: string | null
): Promise<void> {
  console.log('\n👤 Updating profile to tax_preparer...\n');

  // Generate profile QR code (for their main QR with photo)
  const profileQrUrl = `https://taxgeniuspro.tax/go/${trackingCode}-intake`;
  const qrCodeImageUrl = await generateQRCodeWithLogo(profileQrUrl, avatarUrl);

  if (!isDryRun) {
    await prisma.profile.update({
      where: { id: profileId },
      data: {
        role: 'tax_preparer',
        customTrackingCode: trackingCode,
        trackingCode: trackingCode, // Also set the auto-generated field
        trackingCodeFinalized: true,
        shortLinkUsername: trackingCode,
        usePhotoInQRCodes: true,
        qrCodeLogoUrl: avatarUrl, // Use avatar in QR codes
        trackingCodeQRUrl: qrCodeImageUrl,
      },
    });
    console.log(`   ✅ Profile updated to tax_preparer`);
    console.log(`   ✅ Tracking code set to: ${trackingCode}`);
    console.log(`   ✅ QR code generated`);
  } else {
    console.log(`   [DRY RUN] Would update profile to tax_preparer`);
    console.log(`   [DRY RUN] Would set tracking code: ${trackingCode}`);
  }
}

async function sendWelcomeEmail(email: string, firstName: string, trackingCode: string): Promise<void> {
  if (skipEmail) {
    console.log('\n📧 Skipping welcome email (--skip-email)');
    return;
  }

  console.log('\n📧 Sending welcome email...\n');

  if (!isDryRun) {
    // Import dynamically to avoid issues if Resend isn't configured
    try {
      const { Resend } = await import('resend');
      const { TaxPreparerWelcome2025 } = await import('../emails/tax-preparer-welcome-2025');

      if (!process.env.RESEND_API_KEY) {
        console.log('   ⚠️  RESEND_API_KEY not set, skipping email');
        return;
      }

      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `Welcome to Tax Season 2025, ${firstName}! Your Dashboard is Ready`,
        react: TaxPreparerWelcome2025({
          firstName,
          lastName: '',
          email,
          trackingCode,
          avatarUrl: undefined,
          dashboardUrl: 'https://taxgeniuspro.tax/auth/signin',
          contactFormLink: `https://taxgeniuspro.tax/go/${trackingCode}-lead`,
          intakeFormLink: `https://taxgeniuspro.tax/go/${trackingCode}-intake`,
          appointmentLink: `https://taxgeniuspro.tax/go/${trackingCode}-appt`,
          hasProfessionalEmail: false,
          professionalEmail: undefined,
        }),
      });

      if (error) {
        console.log(`   ⚠️  Email failed: ${error.message}`);
      } else {
        console.log(`   ✅ Welcome email sent (${data?.id})`);
      }
    } catch (err) {
      console.log(`   ⚠️  Email error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  } else {
    console.log(`   [DRY RUN] Would send welcome email to: ${email}`);
  }
}

async function main() {
  console.log('===========================================');
  console.log('   PROMOTE USER TO TAX PREPARER');
  console.log('===========================================');

  if (!email) {
    console.error('\n❌ Error: Please provide an email address');
    console.log('\nUsage: npx tsx scripts/promote-to-preparer.ts user@email.com');
    console.log('       npx tsx scripts/promote-to-preparer.ts user@email.com --code=gw');
    process.exit(1);
  }

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  console.log(`\n📧 Looking up user: ${email}`);
  if (customCode) {
    console.log(`   Using custom tracking code: ${customCode}`);
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      profile: true,
    },
  });

  if (!user) {
    console.error(`\n❌ Error: User not found with email: ${email}`);
    console.log('   Make sure the user has registered first via Google OAuth.');
    process.exit(1);
  }

  if (!user.profile) {
    console.error(`\n❌ Error: User has no profile. This shouldn't happen.`);
    process.exit(1);
  }

  console.log(`\n✅ Found user: ${user.name || 'No name'}`);
  console.log(`   User ID: ${user.id}`);
  console.log(`   Profile ID: ${user.profile.id}`);
  console.log(`   Current role: ${user.profile.role}`);

  if (user.profile.role === 'tax_preparer') {
    console.log('\n⚠️  User is already a tax preparer!');
    console.log(`   Current tracking code: ${user.profile.customTrackingCode || user.profile.trackingCode || 'None'}`);

    if (!customCode) {
      console.log('   No changes needed. Use --code=XX to change tracking code.');
      return;
    }
  }

  // Determine tracking code
  let trackingCode: string;
  if (customCode) {
    // Check if custom code is available
    const existing = await prisma.profile.findFirst({
      where: {
        OR: [{ customTrackingCode: customCode }, { trackingCode: customCode }],
        NOT: { id: user.profile.id },
      },
    });

    if (existing) {
      console.error(`\n❌ Error: Tracking code '${customCode}' is already taken`);
      process.exit(1);
    }
    trackingCode = customCode;
  } else {
    trackingCode = await generateTrackingCode(
      user.profile.firstName || user.name?.split(' ')[0] || 'x',
      user.profile.lastName || user.name?.split(' ').slice(1).join(' ') || 'x'
    );
  }

  console.log(`\n🔑 Tracking code will be: ${trackingCode}`);

  // Update profile to tax_preparer
  await updateProfileToTaxPreparer(user.profile.id, trackingCode, user.profile.avatarUrl);

  // Create marketing links
  await createMarketingLinks(user.profile.id, trackingCode);

  // Send welcome email
  await sendWelcomeEmail(email, user.profile.firstName || user.name?.split(' ')[0] || 'Tax Preparer', trackingCode);

  console.log('\n===========================================');
  console.log('   ✅ PROMOTION COMPLETE');
  console.log('===========================================');
  console.log(`\n📋 Summary for ${user.name || email}:`);
  console.log(`   Role: tax_preparer`);
  console.log(`   Tracking code: ${trackingCode}`);
  console.log(`   Marketing links:`);
  console.log(`     - Lead: https://taxgeniuspro.tax/go/${trackingCode}-lead`);
  console.log(`     - Intake: https://taxgeniuspro.tax/go/${trackingCode}-intake`);
  console.log(`     - Appointment: https://taxgeniuspro.tax/go/${trackingCode}-appt`);
  console.log('\n   The user can now log in at: https://taxgeniuspro.tax/auth/signin');
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
