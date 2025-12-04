import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFYING COMPREHENSIVE EMAIL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Get the most recent lead
  const lead = await prisma.taxIntakeLead.findFirst({
    orderBy: {
      created_at: 'desc',
    },
  });

  if (!lead) {
    console.log('❌ No leads found');
    return;
  }

  console.log('📋 MOST RECENT LEAD:');
  console.log('  Lead ID:', lead.id);
  console.log('  Email:', lead.email);
  console.log('  Name:', `${lead.first_name} ${lead.middle_name || ''} ${lead.last_name}`);
  console.log('  Created:', lead.created_at);
  console.log('');

  // Check if full_form_data is present
  const hasFullFormData = Boolean(lead.full_form_data);
  console.log('📊 FORM DATA STATUS:');
  console.log('  Full Form Data Present:', hasFullFormData ? '✅ Yes' : '❌ No');

  if (hasFullFormData && typeof lead.full_form_data === 'object') {
    const formData = lead.full_form_data as any;
    console.log('  SSN:', formData.ssn || '(Not provided)');
    console.log('  DOB:', formData.date_of_birth || '(Not provided)');
    console.log('  Filing Status:', formData.filing_status || '(Not provided)');
    console.log('  Employment Type:', formData.employment_type || '(Not provided)');
    console.log('  Occupation:', formData.occupation || '(Not provided)');
    console.log('  Has Dependents:', formData.has_dependents || '(Not provided)');
    console.log('  Number of Dependents:', formData.number_of_dependents || '(Not provided)');
  }
  console.log('');

  console.log('🎯 ASSIGNMENT DETAILS:');
  console.log('  Assigned Preparer ID:', lead.assignedPreparerId || '(None - Corporate)');
  console.log('  Referrer Username:', lead.referrerUsername || '(None)');
  console.log('  Referrer Type:', lead.referrerType || '(None)');
  console.log('  Attribution Method:', lead.attributionMethod || '(None)');
  console.log('');

  if (lead.assignedPreparerId) {
    // Look up the preparer
    const preparer = await prisma.user.findUnique({
      where: { id: lead.assignedPreparerId },
      include: {
        profile: true,
      },
    });

    if (preparer) {
      console.log('👨‍💼 ASSIGNED PREPARER:');
      console.log('  User ID:', preparer.id);
      console.log('  Name:', preparer.name);
      console.log('  Email:', preparer.email);
      console.log('  Tracking Code:', preparer.profile?.trackingCode || '(None)');
      console.log('');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 EMAIL NOTIFICATION ANALYSIS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Check if this should have triggered comprehensive email
      const isCompleteTaxIntake =
        hasFullFormData &&
        typeof lead.full_form_data === 'object' &&
        (lead.full_form_data as any).ssn &&
        (lead.full_form_data as any).date_of_birth &&
        (lead.full_form_data as any).filing_status;

      console.log('  Is Complete Tax Intake:', isCompleteTaxIntake ? '✅ Yes' : '❌ No');
      console.log('');

      if (isCompleteTaxIntake) {
        console.log('✅ This submission SHOULD have triggered COMPREHENSIVE email');
        console.log('');
        console.log('📬 Expected Email Content:');
        console.log('  Subject: "📋 Complete Tax Intake: ' + `${lead.first_name} ${lead.last_name}` + ' - Ready for Preparation"');
        console.log('  To:', preparer.email);
        console.log('  From: noreply@taxgeniuspro.tax');
        console.log('');
        console.log('  Should include:');
        console.log('    ✓ Personal Information (Name, DOB, SSN)');
        console.log('    ✓ Address');
        console.log('    ✓ Tax Filing Details (Filing Status, Employment, Occupation)');
        console.log('    ✓ Education Status');
        console.log('    ✓ Dependents Information');
        console.log('    ✓ Property/Mortgage Information');
        console.log('    ✓ Tax Credits History');
        console.log('    ✓ IRS PIN');
        console.log('    ✓ Refund Advance Preference');
        console.log('    ✓ Driver\'s License Information');
        console.log('    ✓ Attribution Information');
      } else {
        console.log('ℹ️  This submission triggered BASIC lead notification');
        console.log('  (Missing SSN, DOB, or Filing Status)');
      }

      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ VERIFICATION COMPLETE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📮 To confirm email delivery, check:');
      console.log('  1. Inbox: appvillagellc@gmail.com');
      console.log('  2. Spam/Junk folder');
      console.log('  3. Resend Dashboard: https://resend.com/emails');
    }
  } else {
    console.log('ℹ️  Lead assigned to Tax Genius Corporate');
    console.log('   No preparer notification sent');
  }
}

main().finally(() => prisma.$disconnect());
