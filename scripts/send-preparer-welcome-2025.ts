/**
 * Tax Preparer Welcome 2025 Email Campaign Script
 *
 * This script sends personalized welcome emails to all active tax preparers
 * for the 2025 tax season.
 *
 * Usage:
 *   npx tsx scripts/send-preparer-welcome-2025.ts
 *
 * Options:
 *   --test    Send only to test email (iradwatkins@gmail.com)
 *   --dry-run Show what would be sent without actually sending
 *   --email   Send to a specific email address only
 */

import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { TaxPreparerWelcome2025 } from '../emails/tax-preparer-welcome-2025';

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const isTest = args.includes('--test');
const isDryRun = args.includes('--dry-run');
const emailIndex = args.indexOf('--email');
const specificEmail = emailIndex !== -1 ? args[emailIndex + 1] : null;

// Test recipient for --test mode
const TEST_EMAIL = 'iradwatkins@gmail.com';

interface PreparerInfo {
  email: string;
  firstName: string;
  lastName: string;
  trackingCode: string;
  avatarUrl: string | null;
  qrCodeImageUrl: string | null;
  hasProfessionalEmail: boolean;
  professionalEmail: string | null;
  marketingImages: Array<{ url: string; alt: string; title: string }>;
}

async function getPreparerMarketingImages(
  profileId: string
): Promise<Array<{ url: string; alt: string; title: string }>> {
  // Fetch any custom marketing materials for this preparer
  // If they have uploaded their own images, use those; otherwise use defaults
  try {
    const materials = await prisma.marketingMaterial.findMany({
      where: {
        creatorId: profileId,
        status: 'APPROVED',
        isActive: true,
      },
      take: 3,
      orderBy: { createdAt: 'desc' },
    });

    if (materials.length > 0) {
      return materials.map((m) => ({
        url: m.imageUrl,
        alt: m.title || 'Marketing Material',
        title: m.title || 'Share on Social',
      }));
    }
  } catch {
    // MarketingMaterial table may not exist yet, use defaults
  }

  // Default marketing images
  return [
    {
      url: 'https://taxgeniuspro.tax/images/marketing/social-share-1.jpg',
      alt: 'Tax Genius Pro - Get Your Taxes Done',
      title: 'Instagram Post',
    },
    {
      url: 'https://taxgeniuspro.tax/images/marketing/social-share-2.jpg',
      alt: 'Up to $7,000 Cash Advance',
      title: 'Facebook Post',
    },
    {
      url: 'https://taxgeniuspro.tax/images/marketing/social-share-3.jpg',
      alt: 'Refer a Friend - Earn $50',
      title: 'Story Template',
    },
  ];
}

async function getAllTaxPreparers(): Promise<PreparerInfo[]> {
  const preparers = await prisma.user.findMany({
    where: {
      profile: {
        role: 'tax_preparer',
      },
    },
    include: {
      profile: {
        include: {
          professionalEmails: {
            where: {
              isPrimary: true,
              status: 'ACTIVE',
            },
            take: 1,
          },
        },
      },
    },
    orderBy: { email: 'asc' },
  });

  const preparerInfos: PreparerInfo[] = [];

  for (const preparer of preparers) {
    if (!preparer.profile) continue;

    const marketingImages = await getPreparerMarketingImages(preparer.profile.id);

    preparerInfos.push({
      email: preparer.email,
      firstName: preparer.profile.firstName || preparer.firstName || 'Tax Preparer',
      lastName: preparer.profile.lastName || preparer.lastName || '',
      trackingCode: preparer.profile.customTrackingCode || 'ow',
      avatarUrl: preparer.profile.avatarUrl,
      qrCodeImageUrl: preparer.profile.qrCodeImageUrl,
      hasProfessionalEmail: preparer.profile.professionalEmails.length > 0,
      professionalEmail: preparer.profile.professionalEmails[0]?.emailAddress || null,
      marketingImages,
    });
  }

  return preparerInfos;
}

async function sendWelcomeEmail(
  resend: Resend,
  preparer: PreparerInfo,
  recipientEmail: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';
    const dashboardUrl = 'https://taxgeniuspro.tax/auth/signin';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: `Welcome to Tax Season 2025, ${preparer.firstName}! Your Dashboard is Ready`,
      react: TaxPreparerWelcome2025({
        firstName: preparer.firstName,
        lastName: preparer.lastName,
        email: preparer.email,
        trackingCode: preparer.trackingCode,
        avatarUrl: preparer.avatarUrl || undefined,
        qrCodeImageUrl: preparer.qrCodeImageUrl || undefined,
        dashboardUrl,
        contactFormLink: `https://taxgeniuspro.tax/go/${preparer.trackingCode}-lead`,
        intakeFormLink: `https://taxgeniuspro.tax/go/${preparer.trackingCode}-intake`,
        appointmentLink: `https://taxgeniuspro.tax/go/${preparer.trackingCode}-appt`,
        marketingImages: preparer.marketingImages,
        hasProfessionalEmail: preparer.hasProfessionalEmail,
        professionalEmail: preparer.professionalEmail || undefined,
      }),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, emailId: data?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function main() {
  console.log('=== TAX PREPARER WELCOME 2025 EMAIL CAMPAIGN ===\n');

  if (isDryRun) {
    console.log('DRY RUN MODE - No emails will be sent\n');
  }

  if (isTest) {
    console.log(`TEST MODE - Sending to ${TEST_EMAIL} only\n`);
  }

  if (specificEmail) {
    console.log(`SPECIFIC EMAIL MODE - Sending to ${specificEmail} only\n`);
  }

  // Initialize Resend
  if (!process.env.RESEND_API_KEY) {
    console.error('ERROR: RESEND_API_KEY environment variable is not set');
    process.exit(1);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Fetch all tax preparers
  console.log('Fetching tax preparers...');
  let preparers = await getAllTaxPreparers();

  if (specificEmail) {
    preparers = preparers.filter((p) => p.email === specificEmail);
    if (preparers.length === 0) {
      console.error(`ERROR: No preparer found with email ${specificEmail}`);
      process.exit(1);
    }
  }

  console.log(`Found ${preparers.length} tax preparers\n`);

  // Display preview
  console.log('=== PREPARERS TO EMAIL ===\n');
  console.log(
    '| # | Name | Email | Tracking Code | Has Avatar | Has QR | Has Pro Email |'
  );
  console.log(
    '|---|------|-------|---------------|------------|--------|---------------|'
  );

  preparers.forEach((p, i) => {
    const name = `${p.firstName} ${p.lastName}`.trim();
    console.log(
      `| ${i + 1} | ${name} | ${p.email} | ${p.trackingCode} | ${p.avatarUrl ? 'Yes' : 'No'} | ${p.qrCodeImageUrl ? 'Yes' : 'No'} | ${p.hasProfessionalEmail ? 'Yes' : 'No'} |`
    );
  });

  console.log('');

  if (isDryRun) {
    console.log('DRY RUN - Would send emails to the above preparers');
    console.log('\nTo actually send emails, run without --dry-run flag');
    await prisma.$disconnect();
    return;
  }

  // Send emails
  console.log('=== SENDING EMAILS ===\n');

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const preparer of preparers) {
    const recipientEmail = isTest ? TEST_EMAIL : preparer.email;

    process.stdout.write(`Sending to ${preparer.email}... `);

    const result = await sendWelcomeEmail(resend, preparer, recipientEmail);

    if (result.success) {
      console.log(`OK (${result.emailId})`);
      successCount++;
    } else {
      console.log(`FAILED: ${result.error}`);
      errors.push({ email: preparer.email, error: result.error || 'Unknown error' });
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));

    // In test mode, only send one email
    if (isTest) {
      console.log('\nTEST MODE - Stopping after first email');
      break;
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===\n');
  console.log(`Total preparers: ${preparers.length}`);
  console.log(`Emails sent successfully: ${successCount}`);
  console.log(`Emails failed: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n=== ERRORS ===\n');
    errors.forEach((e) => {
      console.log(`  - ${e.email}: ${e.error}`);
    });
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
