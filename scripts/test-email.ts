#!/usr/bin/env tsx
/**
 * Email Testing Script - Epic 3 Polish
 *
 * This script tests the Resend email integration by sending test emails
 * for each of the three email templates created in Epic 3.
 *
 * Usage:
 *   npx tsx scripts/test-email.ts <your-email@example.com>
 *
 * Example:
 *   npx tsx scripts/test-email.ts john@example.com
 */

import { Resend } from 'resend'
import { DocumentsReceivedEmail } from '../emails/documents-received'
import { ReturnFiledEmail } from '../emails/return-filed'
import { ReferralInvitationEmail } from '../emails/referral-invitation'

// Load environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax'

// Test data
const TEST_DATA = {
  clientName: 'Test User',
  preparerName: 'Sarah Johnson',
  preparerEmail: 'sarah@taxgeniuspro.tax',
  taxYear: 2024,
  documentCount: 5,
  refundAmount: 2500,
  filedDate: new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
  dashboardUrl: 'https://taxgeniuspro.tax/dashboard/client',
  signupUrl: 'https://taxgeniuspro.tax/auth/signup?role=referrer',
}

async function testEmail(recipientEmail: string) {
  if (!RESEND_API_KEY) {
    console.error('❌ ERROR: RESEND_API_KEY not found in environment variables')
    console.log('\nPlease ensure .env.local contains:')
    console.log('RESEND_API_KEY=re_...')
    process.exit(1)
  }

  if (!recipientEmail) {
    console.error('❌ ERROR: No recipient email provided')
    console.log('\nUsage: npx tsx scripts/test-email.ts <your-email@example.com>')
    process.exit(1)
  }

  console.log('📧 Tax Genius Pro - Email Testing Script\n')
  console.log('Configuration:')
  console.log(`  From: ${RESEND_FROM_EMAIL}`)
  console.log(`  To: ${recipientEmail}`)
  console.log(`  API Key: ${RESEND_API_KEY.substring(0, 10)}...`)
  console.log('\n' + '='.repeat(60) + '\n')

  const resend = new Resend(RESEND_API_KEY)

  // Test 1: Documents Received Email
  console.log('Test 1: Documents Received Email')
  console.log('─'.repeat(60))
  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: recipientEmail,
      subject: `[TEST] Documents Received - ${TEST_DATA.clientName}`,
      react: DocumentsReceivedEmail({
        clientName: TEST_DATA.clientName,
        preparerName: TEST_DATA.preparerName,
        preparerEmail: TEST_DATA.preparerEmail,
        taxYear: TEST_DATA.taxYear,
        documentCount: TEST_DATA.documentCount,
        dashboardUrl: TEST_DATA.dashboardUrl,
      }),
    })

    if (error) {
      console.log('❌ FAILED:', error.message)
      console.log('Details:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ SUCCESS')
      console.log('Email ID:', data?.id)
    }
  } catch (err) {
    console.log('❌ EXCEPTION:', err instanceof Error ? err.message : String(err))
  }

  console.log('\n' + '='.repeat(60) + '\n')

  // Test 2: Return Filed Email
  console.log('Test 2: Return Filed Email (with refund)')
  console.log('─'.repeat(60))
  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: recipientEmail,
      subject: `[TEST] Your ${TEST_DATA.taxYear} Tax Return Has Been Filed`,
      react: ReturnFiledEmail({
        clientName: TEST_DATA.clientName,
        preparerName: TEST_DATA.preparerName,
        taxYear: TEST_DATA.taxYear,
        refundAmount: TEST_DATA.refundAmount,
        oweAmount: undefined,
        filedDate: TEST_DATA.filedDate,
        dashboardUrl: TEST_DATA.dashboardUrl,
      }),
    })

    if (error) {
      console.log('❌ FAILED:', error.message)
      console.log('Details:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ SUCCESS')
      console.log('Email ID:', data?.id)
    }
  } catch (err) {
    console.log('❌ EXCEPTION:', err instanceof Error ? err.message : String(err))
  }

  console.log('\n' + '='.repeat(60) + '\n')

  // Test 3: Referral Invitation Email
  console.log('Test 3: Referral Invitation Email')
  console.log('─'.repeat(60))
  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: recipientEmail,
      subject: `[TEST] Earn $50 Per Referral with Tax Genius Pro`,
      react: ReferralInvitationEmail({
        clientName: TEST_DATA.clientName,
        preparerName: TEST_DATA.preparerName,
        taxYear: TEST_DATA.taxYear,
        refundAmount: TEST_DATA.refundAmount,
        signupUrl: TEST_DATA.signupUrl,
      }),
    })

    if (error) {
      console.log('❌ FAILED:', error.message)
      console.log('Details:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ SUCCESS')
      console.log('Email ID:', data?.id)
    }
  } catch (err) {
    console.log('❌ EXCEPTION:', err instanceof Error ? err.message : String(err))
  }

  console.log('\n' + '='.repeat(60) + '\n')

  // Summary
  console.log('📊 Testing Complete!\n')
  console.log('Next Steps:')
  console.log('1. Check your inbox at:', recipientEmail)
  console.log('2. Verify all 3 test emails arrived')
  console.log('3. Check spam folder if emails are missing')
  console.log('4. If emails look good, update NODE_ENV to production in .env.local')
  console.log('5. Restart PM2: pm2 restart taxgeniuspro --update-env\n')

  console.log('Resend Dashboard:')
  console.log('https://resend.com/emails')
  console.log('(View sent emails, delivery status, and logs)\n')
}

// Get recipient email from command line args
const recipientEmail = process.argv[2]

testEmail(recipientEmail).catch((err) => {
  console.error('\n❌ FATAL ERROR:', err)
  process.exit(1)
})
