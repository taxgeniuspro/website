# Critical Issues

Issues that block core functionality or cause data loss/security breaches.

---

## CRIT-1: No Email Verification on Signup
- **System**: Authentication / Email
- **File**: `/src/app/api/auth/signup/route.ts`
- **Problem**: Users can sign up and access features without verifying email ownership
- **Impact**: Invalid emails, deliverability issues, potential abuse
- **Fix**: Send verification email on signup, require before full account access

---

## CRIT-2: Client Referral Assignment Incomplete
- **System**: Lead Generation
- **File**: `/src/app/api/intake/route.ts` (line ~185)
- **Problem**: TODO comment - client referrals assign to corporate instead of client's preparer
- **Impact**: Lost commission tracking for tax preparers
- **Fix**: Look up client's assigned preparer via CRMContact relation

---

## CRIT-3: Affiliate Earnings Show Hardcoded Mock Data
- **System**: Affiliate/Referral
- **File**: `/dashboard/affiliate/earnings`
- **Problem**: Shows fake commissions (Jennifer Williams, Ashley Garcia) instead of real data
- **Impact**: Affiliates see incorrect earnings, complete mistrust of system
- **Fix**: Query real database for affiliate earnings

---

## CRIT-4: No Rate Limiting on Signup Endpoint
- **System**: Authentication
- **File**: `/src/app/api/auth/signup/route.ts`
- **Problem**: No rate limiting despite being exposed to anonymous users
- **Impact**: Allows rapid spam account creation, abuse
- **Fix**: Add `authRateLimit` check (already defined but unused)

---

## CRIT-5: No Rate Limiting on Forgot-Password
- **System**: Authentication
- **File**: `/src/app/api/auth/forgot-password/route.ts`
- **Problem**: Can spam reset emails to any address
- **Impact**: Email flooding, API quota exhaustion, harassment
- **Fix**: Add rate limiting per IP/email

---

## CRIT-6: Preparer Approval Workflow Missing
- **System**: Tax Preparer Management
- **Problem**: Applications collected but no approval process/UI
- **Missing**: Admin UI to review, approval → profile creation, role assignment
- **Impact**: New preparers cannot be onboarded
- **Fix**: Build approval workflow with admin dashboard

---

## CRIT-7: Affiliate Approval Workflow Missing
- **System**: Affiliate/Referral
- **Problem**: Applications stored but no approval process visible
- **Impact**: Affiliates cannot get activated
- **Fix**: Build approval UI for admins

---

## CRIT-8: No Commission Calculation Code
- **System**: Affiliate/Referral
- **Problem**: Commission type/rate stored but calculation logic not implemented
- **Impact**: Cannot automatically calculate what affiliates are owed
- **Fix**: Implement commission calculation service

---

## CRIT-9: Appointment Reminders Not Implemented
- **System**: Booking
- **Problem**: DB fields exist (`reminder48hSent`, `reminder24hSent`) but never used
- **Impact**: Higher no-show rate, poor user experience
- **Fix**: Implement scheduled job to send reminders

---

## CRIT-10: Silent Email Failures
- **System**: Email
- **Problem**: Methods return `false` on error, no retry mechanism
- **Impact**: Failed emails lost permanently
- **Fix**: Implement retry queue with exponential backoff

---

## Summary

| # | Issue | System | Severity |
|---|-------|--------|----------|
| 1 | No email verification | Auth/Email | Security |
| 2 | Client referral incomplete | Lead Gen | Business |
| 3 | Mock affiliate data | Affiliate | Trust |
| 4 | No signup rate limit | Auth | Security |
| 5 | No password reset rate limit | Auth | Security |
| 6 | Preparer approval missing | Preparer | Workflow |
| 7 | Affiliate approval missing | Affiliate | Workflow |
| 8 | No commission calc | Affiliate | Business |
| 9 | No appointment reminders | Booking | UX |
| 10 | Silent email failures | Email | Reliability |

**Total Critical Issues: 10**
