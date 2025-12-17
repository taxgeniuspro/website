/**
 * Test Cash Advance Form Submission
 *
 * Tests the complete flow:
 * 1. CRM Contact creation
 * 2. Preparer attribution (if ref code provided)
 * 3. Email notification to preparer + CC to Owliver Owl
 *
 * Email Routing:
 * - English: Primary → Ray Hamilton (taxgenius.taxes@gmail.com), CC → Owliver (taxgenius.tax@gmail.com)
 * - Spanish: Primary → Ale Hamilton (Goldenprotaxes@gmail.com), CC → Owliver (taxgenius.tax@gmail.com)
 * - With ref code: Primary → Assigned preparer, CC → Owliver (taxgenius.tax@gmail.com)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { prisma } from '../src/lib/prisma';
import { getResendClient } from '../src/lib/resend';
import { CashAdvanceLeadNotification } from '../emails/cash-advance-lead-notification';
import { getEmailRecipients } from '../src/config/email-routing';

async function testCashAdvanceSubmission() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 CASH ADVANCE FORM SUBMISSION TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Test data
  const testData = {
    firstName: 'TestLeadCashAdvance',
    phone: '5551234567',
    email: 'testcashadvance@example.com',
    zipCode: '30315',
    preferredFiling: 'remote',
    bestTimeToContact: 'afternoon',
    locale: 'en',
    ref: 'gw', // Gelisa White's tracking code
  };

  console.log('📋 Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('');

  try {
    // Step 1: Look up preparer by ref code
    console.log('━━━ Step 1: Preparer Attribution ━━━');
    let preparerProfile = null;
    let assignedPreparerId: string | null = null;

    if (testData.ref) {
      preparerProfile = await prisma.profile.findFirst({
        where: {
          OR: [
            { trackingCode: testData.ref },
            { customTrackingCode: testData.ref },
            { shortLinkUsername: testData.ref },
          ],
          role: 'tax_preparer',
        },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          phone: true,
          user: {
            select: { email: true },
          },
        },
      });

      if (preparerProfile) {
        assignedPreparerId = preparerProfile.userId;
        console.log(`✅ Found preparer: ${preparerProfile.firstName} ${preparerProfile.lastName}`);
        console.log(`   User ID: ${assignedPreparerId}`);
        console.log(`   Email: ${preparerProfile.user?.email}`);
      } else {
        console.log(`⚠️  No preparer found for ref code: ${testData.ref}`);
      }
    }
    console.log('');

    // Step 2: Create CRM Contact
    console.log('━━━ Step 2: CRM Contact Creation ━━━');
    const contactEmail = testData.email?.toLowerCase() || `${testData.phone}@phone.lead`;

    // Check for existing contact
    const existingContact = await prisma.cRMContact.findFirst({
      where: {
        OR: [
          { email: contactEmail },
          { phone: testData.phone },
        ],
      },
    });

    let crmContact;
    if (existingContact) {
      console.log(`⏭️  Updating existing contact: ${existingContact.id}`);
      crmContact = await prisma.cRMContact.update({
        where: { id: existingContact.id },
        data: {
          firstName: testData.firstName,
          phone: testData.phone,
          lastContactedAt: new Date(),
          ...(assignedPreparerId && { assignedPreparerId }),
        },
      });
    } else {
      console.log('✅ Creating new CRM contact...');
      crmContact = await prisma.cRMContact.create({
        data: {
          contactType: 'LEAD',
          firstName: testData.firstName,
          lastName: '',
          email: contactEmail,
          phone: testData.phone,
          source: 'preseason_cash_advance',
          stage: 'NEW',
          leadScore: 80,
          lastContactedAt: new Date(),
          assignedPreparerId,
          referrerUsername: testData.ref || null,
          referrerType: testData.ref ? 'tax_preparer' : null,
          attributionMethod: testData.ref ? 'ref_param' : null,
        },
      });
    }
    console.log(`✅ CRM Contact ID: ${crmContact.id}`);
    console.log('');

    // Step 3: Email Notification
    console.log('━━━ Step 3: Email Notification ━━━');
    const recipients = getEmailRecipients((testData.locale as 'en' | 'es') || 'en');

    let primaryRecipient: string;
    let recipientName: string;

    if (assignedPreparerId && preparerProfile) {
      primaryRecipient = preparerProfile.user?.email || recipients.primary;
      recipientName = preparerProfile.firstName || 'Tax Preparer';
    } else {
      primaryRecipient = recipients.primary;
      recipientName = recipients.recipientName;
    }

    console.log(`📧 Email Recipients:`);
    console.log(`   TO: ${primaryRecipient} (${recipientName})`);
    console.log(`   CC: ${recipients.cc} (Owliver Owl - Admin)`);
    console.log('');

    // Send email via Resend
    console.log('📤 Sending email via Resend...');
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax',
      to: [primaryRecipient],
      cc: [recipients.cc],
      subject: `💰 TEST: Preseason Cash Advance Lead - ${testData.firstName}`,
      react: CashAdvanceLeadNotification({
        firstName: testData.firstName,
        phone: testData.phone,
        email: testData.email,
        zipCode: testData.zipCode,
        preferredFiling: testData.preferredFiling,
        bestTimeToContact: testData.bestTimeToContact,
        submittedAt: new Date(),
        recipientName,
        referralCode: testData.ref || undefined,
        preparerName: preparerProfile
          ? `${preparerProfile.firstName} ${preparerProfile.lastName}`
          : undefined,
      }),
    });

    if (error) {
      console.log('❌ Email send failed:');
      console.log(error);
    } else {
      console.log('✅ Email sent successfully!');
      console.log(`   Email ID: ${data?.id}`);
    }
    console.log('');

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ CRM Contact Created: ${crmContact.id}`);
    console.log(`✅ Preparer Attribution: ${preparerProfile ? `${preparerProfile.firstName} ${preparerProfile.lastName}` : 'None (default routing)'}`);
    console.log(`✅ Email Sent To: ${primaryRecipient}`);
    console.log(`✅ Email CC To: ${recipients.cc}`);
    console.log('');

  } catch (error) {
    console.error('❌ TEST FAILED:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testCashAdvanceSubmission();
