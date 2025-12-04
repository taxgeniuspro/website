/**
 * Send Test Emails Script
 *
 * Sends test emails for:
 * 1. Preparer application (signup) - to both hiring emails
 * 2. Appointment confirmation - to both hiring emails
 */

import { Resend } from 'resend';
import { PreparerApplicationNotification } from '../emails/preparer-application-notification';
import { PreparerApplicationConfirmation } from '../emails/preparer-application-confirmation';
import { AppointmentConfirmation } from '../emails/appointment-confirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';
const hiringEmails = ['taxgenius.tax@gmail.com', 'Taxgenius.taxes@gmail.com'];

// Helper to delay between API calls (rate limit: 2 per second)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendTestEmails() {
  console.log('🚀 Starting test email send...\n');

  // Test data
  const testApplicant = {
    firstName: 'John',
    middleName: 'David',
    lastName: 'TestPreparer',
    email: 'test.preparer@example.com',
    phone: '(555) 123-4567',
    languages: 'English, Spanish',
    experienceLevel: 'INTERMEDIATE',
    taxSoftware: ['TurboTax', 'TaxAct', 'H&R Block'],
    applicationId: 'TEST-APP-' + Date.now(),
  };

  const testAppointment = {
    clientName: 'Jane TestApplicant',
    clientEmail: 'test.applicant@example.com',
    appointmentType: 'PREPARER_INTERVIEW',
    scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    preparerName: 'Tax Genius Pro Hiring Team',
    notes: 'This is a test appointment confirmation email.',
  };

  // ======================
  // Test 1: Application/Signup Emails
  // ======================
  console.log('📧 Test 1: Sending application notification emails...\n');

  for (let i = 0; i < hiringEmails.length; i++) {
    const hiringEmail = hiringEmails[i];

    // Delay before each API call to respect rate limit
    if (i > 0) {
      console.log('   ⏳ Waiting to respect rate limit...');
      await delay(600); // 600ms = ~1.6 emails/sec
    }

    try {
      console.log(`   → Sending to ${hiringEmail}...`);
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: hiringEmail,
        subject: `[TEST] New Tax Preparer Application: ${testApplicant.firstName} ${testApplicant.lastName}`,
        react: PreparerApplicationNotification({
          firstName: testApplicant.firstName,
          middleName: testApplicant.middleName,
          lastName: testApplicant.lastName,
          email: testApplicant.email,
          phone: testApplicant.phone,
          languages: testApplicant.languages,
          experienceLevel: testApplicant.experienceLevel,
          taxSoftware: testApplicant.taxSoftware,
          applicationId: testApplicant.applicationId,
        }),
      });

      if (error) {
        console.error(`   ❌ Failed to send to ${hiringEmail}:`, error);
      } else {
        console.log(`   ✅ Sent successfully! Email ID: ${data?.id}`);
      }
    } catch (error) {
      console.error(`   ❌ Error sending to ${hiringEmail}:`, error);
    }
  }

  console.log('\n   ⏳ Waiting to respect rate limit...');
  await delay(600);

  console.log('   → Sending confirmation to applicant...');
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: testApplicant.email,
      subject: '[TEST] Application Received - TaxGeniusPro Tax Preparer Position',
      react: PreparerApplicationConfirmation({
        firstName: testApplicant.firstName,
        lastName: testApplicant.lastName,
        email: testApplicant.email,
        phone: testApplicant.phone,
        experienceLevel: testApplicant.experienceLevel,
        taxSoftware: testApplicant.taxSoftware,
      }),
    });

    if (error) {
      console.error(`   ❌ Failed to send applicant confirmation:`, error);
    } else {
      console.log(`   ✅ Sent successfully! Email ID: ${data?.id}`);
    }
  } catch (error) {
    console.error(`   ❌ Error sending applicant confirmation:`, error);
  }

  // ======================
  // Test 2: Appointment Confirmation Emails
  // ======================
  console.log('\n📅 Test 2: Sending appointment confirmation emails...\n');

  for (let i = 0; i < hiringEmails.length; i++) {
    const hiringEmail = hiringEmails[i];

    // Delay before each API call to respect rate limit
    if (i > 0) {
      console.log('   ⏳ Waiting to respect rate limit...');
      await delay(600);
    } else {
      // First email in this batch needs delay from previous batch
      console.log('   ⏳ Waiting to respect rate limit...');
      await delay(600);
    }

    try {
      console.log(`   → Sending to ${hiringEmail}...`);
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: hiringEmail,
        subject: `[TEST] Appointment Confirmation - ${testAppointment.clientName}`,
        react: AppointmentConfirmation({
          clientName: testAppointment.clientName,
          clientEmail: testAppointment.clientEmail,
          appointmentType: testAppointment.appointmentType,
          scheduledFor: testAppointment.scheduledFor,
          preparerName: testAppointment.preparerName,
          notes: testAppointment.notes,
        }),
      });

      if (error) {
        console.error(`   ❌ Failed to send to ${hiringEmail}:`, error);
      } else {
        console.log(`   ✅ Sent successfully! Email ID: ${data?.id}`);
      }
    } catch (error) {
      console.error(`   ❌ Error sending to ${hiringEmail}:`, error);
    }
  }

  console.log('\n✨ Test email send complete!\n');
  console.log('📬 Check the following inboxes:');
  hiringEmails.forEach(email => console.log(`   - ${email}`));
  console.log(`   - ${testApplicant.email} (applicant confirmation)`);
  console.log('\n💡 Note: Emails are marked with [TEST] in the subject line.\n');
}

// Run the script
sendTestEmails()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
