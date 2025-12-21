/**
 * Send Test Emails for 2025 Campaign
 *
 * This script sends all 4 email templates to a test recipient:
 * 1. Tax Preparer Welcome 2025
 * 2. Client Referral 2025
 * 3. Cash Advance Promo 2025
 * 4. Tax Preparer Welcome (for sending to all preparers to login and market)
 *
 * Usage:
 *   npx tsx scripts/send-test-emails-2025.ts
 *
 * Options:
 *   --email <email>  Send to specific email (default: iradwatkins@gmail.com)
 */

import { Resend } from 'resend';
import { TaxPreparerWelcome2025 } from '../emails/tax-preparer-welcome-2025';
import { ClientReferral2025 } from '../emails/client-referral-2025';
import { CashAdvancePromo2025 } from '../emails/cash-advance-promo-2025';

// Parse command line arguments
const args = process.argv.slice(2);
const emailIndex = args.indexOf('--email');
const testEmail = emailIndex !== -1 ? args[emailIndex + 1] : 'iradwatkins@gmail.com';

// Sample data for tests - using working Cloudinary URLs
const samplePreparer = {
  firstName: 'Ira',
  lastName: 'Watkins',
  email: 'iradwatkins@gmail.com',
  trackingCode: 'iw',
  avatarUrl: 'https://res.cloudinary.com/dhktmiigh/image/upload/v1765487887/taxgeniuspro/preparers/preparer_iw.jpg',
  qrCodeImageUrl: undefined, // Will test without QR code
  hasProfessionalEmail: true,
  professionalEmail: 'ira@taxgeniuspro.tax',
};

const sampleClient = {
  clientName: 'Ira Watkins',
  clientFirstName: 'Ira',
  referralLink: 'https://taxgeniuspro.tax/go/iw-intake',
  referralCode: 'iw',
  qrCodeImageUrl: undefined,
  preparerName: 'Tax Genius Pro',
  preparerAvatarUrl: undefined,
};

const samplePromo = {
  recipientName: 'Ira Watkins',
  recipientFirstName: 'Ira',
  trackingCode: 'iw',
  preparerName: 'Ira Watkins',
  preparerAvatarUrl: 'https://res.cloudinary.com/dhktmiigh/image/upload/v1765487887/taxgeniuspro/preparers/preparer_iw.jpg',
  preparerPhone: '+1 404-627-1015',
};

async function main() {
  console.log('=== SEND TEST EMAILS FOR 2025 CAMPAIGN ===\n');
  console.log(`Sending all 4 emails to: ${testEmail}\n`);

  // Initialize Resend
  if (!process.env.RESEND_API_KEY) {
    console.error('ERROR: RESEND_API_KEY environment variable is not set');
    process.exit(1);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

  const results: Array<{ name: string; success: boolean; emailId?: string; error?: string }> = [];

  // 1. Send Tax Preparer Welcome 2025
  console.log('1. Sending Tax Preparer Welcome 2025...');
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: testEmail,
      subject: `[TEST] Welcome to Tax Season 2025, ${samplePreparer.firstName}! Your Dashboard is Ready`,
      react: TaxPreparerWelcome2025({
        firstName: samplePreparer.firstName,
        lastName: samplePreparer.lastName,
        email: samplePreparer.email,
        trackingCode: samplePreparer.trackingCode,
        avatarUrl: samplePreparer.avatarUrl,
        qrCodeImageUrl: samplePreparer.qrCodeImageUrl,
        dashboardUrl: 'https://taxgeniuspro.tax/auth/signin',
        contactFormLink: `https://taxgeniuspro.tax/go/${samplePreparer.trackingCode}-lead`,
        intakeFormLink: `https://taxgeniuspro.tax/go/${samplePreparer.trackingCode}-intake`,
        appointmentLink: `https://taxgeniuspro.tax/go/${samplePreparer.trackingCode}-appt`,
        hasProfessionalEmail: samplePreparer.hasProfessionalEmail,
        professionalEmail: samplePreparer.professionalEmail,
      }),
    });

    if (error) {
      console.log(`   FAILED: ${error.message}`);
      results.push({ name: 'Tax Preparer Welcome', success: false, error: error.message });
    } else {
      console.log(`   OK (${data?.id})`);
      results.push({ name: 'Tax Preparer Welcome', success: true, emailId: data?.id });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.log(`   FAILED: ${errorMsg}`);
    results.push({ name: 'Tax Preparer Welcome', success: false, error: errorMsg });
  }

  // Small delay between emails
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 2. Send Client Referral 2025
  console.log('2. Sending Client Referral 2025...');
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: testEmail,
      subject: `[TEST] Earn $50 Per Referral, ${sampleClient.clientFirstName}! Share Tax Genius Pro`,
      react: ClientReferral2025({
        clientName: sampleClient.clientName,
        clientFirstName: sampleClient.clientFirstName,
        referralLink: sampleClient.referralLink,
        referralCode: sampleClient.referralCode,
        qrCodeImageUrl: sampleClient.qrCodeImageUrl,
        dashboardUrl: 'https://taxgeniuspro.tax/dashboard/client',
        preparerName: sampleClient.preparerName,
        preparerAvatarUrl: sampleClient.preparerAvatarUrl,
      }),
    });

    if (error) {
      console.log(`   FAILED: ${error.message}`);
      results.push({ name: 'Client Referral', success: false, error: error.message });
    } else {
      console.log(`   OK (${data?.id})`);
      results.push({ name: 'Client Referral', success: true, emailId: data?.id });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.log(`   FAILED: ${errorMsg}`);
    results.push({ name: 'Client Referral', success: false, error: errorMsg });
  }

  // Small delay between emails
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 3. Send Cash Advance Promo 2025 (The EXCITING version!)
  console.log('3. Sending Cash Advance Promo 2025 (EXCITING VERSION!)...');
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: testEmail,
      subject: `[TEST] TAX SEASON 2025 IS HERE! Get Up To $7,000 Cash - No Credit Check!`,
      react: CashAdvancePromo2025({
        recipientName: samplePromo.recipientName,
        recipientFirstName: samplePromo.recipientFirstName,
        trackingCode: samplePromo.trackingCode,
        cashAdvanceLink: `https://taxgeniuspro.tax/cash-advance?ref=${samplePromo.trackingCode}`,
        intakeFormLink: `https://taxgeniuspro.tax/go/${samplePromo.trackingCode}-intake`,
        preparerName: samplePromo.preparerName,
        preparerAvatarUrl: samplePromo.preparerAvatarUrl,
        preparerPhone: samplePromo.preparerPhone,
      }),
    });

    if (error) {
      console.log(`   FAILED: ${error.message}`);
      results.push({ name: 'Cash Advance Promo', success: false, error: error.message });
    } else {
      console.log(`   OK (${data?.id})`);
      results.push({ name: 'Cash Advance Promo', success: true, emailId: data?.id });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.log(`   FAILED: ${errorMsg}`);
    results.push({ name: 'Cash Advance Promo', success: false, error: errorMsg });
  }

  // Small delay between emails
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 4. Send Tax Preparer "Login and Start Marketing" Reminder
  console.log('4. Sending Tax Preparer Login Reminder...');
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: testEmail,
      subject: `[TEST] Tax Season 2025 Starts Soon! Login & Start Marketing Now`,
      react: TaxPreparerWelcome2025({
        firstName: 'Tax Preparer',
        lastName: '',
        email: 'preparer@taxgeniuspro.tax',
        trackingCode: 'xx',
        avatarUrl: undefined, // No avatar for generic message
        qrCodeImageUrl: undefined,
        dashboardUrl: 'https://taxgeniuspro.tax/auth/signin',
        contactFormLink: 'https://taxgeniuspro.tax/go/xx-lead',
        intakeFormLink: 'https://taxgeniuspro.tax/go/xx-intake',
        appointmentLink: 'https://taxgeniuspro.tax/go/xx-appt',
        hasProfessionalEmail: false,
        professionalEmail: undefined,
      }),
    });

    if (error) {
      console.log(`   FAILED: ${error.message}`);
      results.push({ name: 'Preparer Login Reminder', success: false, error: error.message });
    } else {
      console.log(`   OK (${data?.id})`);
      results.push({ name: 'Preparer Login Reminder', success: true, emailId: data?.id });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.log(`   FAILED: ${errorMsg}`);
    results.push({ name: 'Preparer Login Reminder', success: false, error: errorMsg });
  }

  // Summary
  console.log('\n=== SUMMARY ===\n');
  console.log('| Email Template          | Status | Email ID |');
  console.log('|-------------------------|--------|----------|');

  results.forEach((r) => {
    const status = r.success ? 'OK' : 'FAILED';
    const id = r.emailId || r.error || '-';
    console.log(`| ${r.name.padEnd(23)} | ${status.padEnd(6)} | ${id} |`);
  });

  const successCount = results.filter((r) => r.success).length;
  console.log(`\nSent ${successCount}/4 emails successfully to ${testEmail}`);

  if (successCount === 4) {
    console.log('\n Check your inbox at ' + testEmail);
  }
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
