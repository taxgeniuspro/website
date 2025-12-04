# Tax Genius Pro - Testing Scripts

This directory contains utility scripts for testing and development.

---

## 📧 Email Testing Script

**File**: `test-email.ts`

**Purpose**: Test the Resend email integration by sending all 3 Epic 3 email templates to your inbox.

### Prerequisites

1. **Resend API Key**: Ensure `.env.local` contains `RESEND_API_KEY`
2. **Resend Domain Verified**: Your domain must be verified in Resend dashboard
3. **Node.js Dependencies**: Run `npm install` if you haven't already

### Usage

```bash
# From project root directory:
cd /root/websites/taxgeniuspro

# Run the test script with your email address:
npx tsx scripts/test-email.ts your-email@example.com
```

### Example Output

```
📧 Tax Genius Pro - Email Testing Script

Configuration:
  From: noreply@taxgeniuspro.tax
  To: john@example.com
  API Key: re_etoZgio...

============================================================

Test 1: Documents Received Email
────────────────────────────────────────────────────────────
✅ SUCCESS
Email ID: abc123-def456-ghi789

============================================================

Test 2: Return Filed Email (with refund)
────────────────────────────────────────────────────────────
✅ SUCCESS
Email ID: xyz789-uvw456-rst123

============================================================

Test 3: Referral Invitation Email
────────────────────────────────────────────────────────────
✅ SUCCESS
Email ID: mno345-pqr678-stu901

============================================================

📊 Testing Complete!

Next Steps:
1. Check your inbox at: john@example.com
2. Verify all 3 test emails arrived
3. Check spam folder if emails are missing
4. If emails look good, update NODE_ENV to production in .env.local
5. Restart PM2: pm2 restart taxgeniuspro --update-env

Resend Dashboard:
https://resend.com/emails
(View sent emails, delivery status, and logs)
```

### What Gets Tested

The script sends 3 test emails using the templates from Epic 3:

1. **Documents Received Email** (`emails/documents-received.tsx`)
   - Sent when client submits tax documents
   - Shows preparer name, document count
   - Includes dashboard link

2. **Return Filed Email** (`emails/return-filed.tsx`)
   - Sent when preparer files tax return
   - Shows refund/owe amount with conditional styling
   - Includes filing date and next steps

3. **Referral Invitation Email** (`emails/referral-invitation.tsx`)
   - Sent after return is filed
   - Promotes referral program ($50 per referral)
   - Includes signup link with role parameter

### Troubleshooting

**Error: "RESEND_API_KEY not found"**
- Check `.env.local` has `RESEND_API_KEY=re_...`
- Ensure you're running from project root

**Error: "Domain not verified"**
1. Log into Resend: https://resend.com/domains
2. Add `taxgeniuspro.tax` domain
3. Add DNS records provided by Resend
4. Wait for verification (5-10 minutes)

**Emails not arriving**
1. Check Resend dashboard for delivery status
2. Check spam folder
3. Verify recipient email is valid
4. Check Resend logs for bounce/reject reasons

**Success but emails look wrong**
- Email templates render correctly in Resend's preview
- Test in multiple email clients (Gmail, Outlook, Apple Mail)
- Check for HTML rendering issues

---

## 🔧 Future Scripts (To Be Added)

- `test-database.ts` - Verify database connections and schema
- `seed-test-data.ts` - Create test users and sample data
- `cleanup-dev-data.ts` - Remove test data from development database
- `migrate-users.ts` - Lucia to Clerk user migration (Story 1.1 AC6)

---

## 📚 Related Documentation

- **Epic 3 Completion**: `/docs/EPIC-3-COMPLETE.md`
- **Email Architecture**: `/docs/architecture/06-email-resend.md`
- **Resend Dashboard**: https://resend.com/emails
- **React Email Docs**: https://react.email/docs/introduction

---

*Created: October 10, 2025*
*Updated by: PM Agent (John)*
