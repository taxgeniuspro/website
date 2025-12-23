# High Priority Issues

Issues that significantly impact user experience or major features.

---

## HIGH-1: Dual Data Systems (CRM vs Lead Tables)
- **System**: Lead Generation / CRM
- **Problem**: Both CRMContact and TaxIntakeLead track same person
- **Impact**: Status changes don't sync, data inconsistency
- **Fix**: Consolidate to single CRMContact as source of truth

---

## HIGH-2: No Failed Login Tracking
- **System**: Authentication
- **Problem**: No logging of failed login attempts
- **Impact**: Can't detect brute force attacks
- **Fix**: Log failed attempts, implement account lockout after N failures

---

## HIGH-3: No Session Revocation Mechanism
- **System**: Authentication
- **Problem**: Once JWT issued, can't revoke until expiration (30 days)
- **Impact**: Can't force logout compromised accounts
- **Fix**: Implement session blacklist in Redis

---

## HIGH-4: PTIN Verification Missing
- **System**: Tax Preparer Management
- **Problem**: Marketing mentions PTIN requirement but form doesn't collect it
- **Impact**: Cannot verify preparers are licensed
- **Fix**: Add PTIN field with IRS validation

---

## HIGH-5: Background Check Integration Missing
- **System**: Tax Preparer Management
- **Problem**: No BGC API integration or status tracking
- **Impact**: Compliance risk
- **Fix**: Integrate background check provider API

---

## HIGH-6: No Public Reschedule/Cancel UI
- **System**: Booking
- **Problem**: APIs exist but no user interface
- **Impact**: Clients can't self-service reschedule/cancel
- **Fix**: Create `/appointments/{id}/reschedule` and `/cancel` pages

---

## HIGH-7: Incomplete Bilingual Email Support
- **System**: Email
- **Problem**: Only 2/23 templates are bilingual
- **Impact**: Spanish-speaking users get English emails
- **Fix**: Integrate translations.ts into all templates

---

## HIGH-8: Marketing Links Not Auto-Generated
- **System**: Tax Preparer Management
- **Problem**: Links only created on first access after code finalized
- **Impact**: New preparers don't have marketing tools ready
- **Fix**: Auto-create all 3 link types on finalization

---

## HIGH-9: Service Field Not Validated
- **System**: Lead Generation
- **File**: `/src/app/api/contact/submit/route.ts`
- **Problem**: Frontend dropdown validated, backend accepts any value
- **Risk**: API injection possible
- **Fix**: Add validation against allowed service list

---

## HIGH-10: Phone Number Validation Missing
- **System**: Lead Generation
- **Problem**: Contact form has HTML pattern but no backend check
- **Impact**: Malformed phone numbers stored
- **Fix**: Add phone format validation in API

---

## HIGH-11: No Preparer Directory
- **System**: Booking
- **Problem**: Can only book via direct link
- **Impact**: Can't discover/compare preparers
- **Fix**: Create preparer listing page

---

## HIGH-12: Missing Calendar Integration
- **System**: Booking
- **Problem**: No Google/Outlook/Apple Calendar sync
- **Impact**: Double-booking risk, no calendar updates
- **Fix**: Connect `/api/google/calendar/route.ts`

---

## HIGH-13: No Delivery Confirmation (Email)
- **System**: Email
- **Problem**: Can't verify emails reached inbox
- **Impact**: No feedback on bounce/failure
- **Fix**: Integrate Resend webhooks

---

## HIGH-14: Missing Reschedule/Cancel Email Notifications
- **System**: Booking / Email
- **Problem**: TODO comments in code, not implemented
- **Files**: `reschedule/route.ts:115`, `cancel/route.ts:87`
- **Fix**: Implement notification emails

---

## HIGH-15: Affiliate Payout Systems Disconnected
- **System**: Affiliate/Referral
- **Problem**: Affiliates request payouts centrally, but preparers mark paid separately
- **Impact**: No single source of truth for payments
- **Fix**: Clarify and unify payment ownership model

---

## HIGH-16: Click-to-Conversion Not Linked
- **System**: Affiliate/Referral
- **Problem**: ReferralClicks table exists but not linked to actual conversions
- **Impact**: Can't track which clicks led to leads
- **Fix**: Link click records to lead creation

---

## HIGH-17: Permission Features Defined But Not Implemented
- **System**: CRM
- **Problem**: Permissions granted for non-existent features (crmEmailAutomation, crmWorkflowAutomation)
- **Impact**: Misleading to users
- **Fix**: Implement features or remove permissions

---

## HIGH-18: No Stage History Tracking
- **System**: Lead Generation
- **Problem**: CRMStageHistory table exists but not populated
- **Impact**: Can't analyze pipeline performance
- **Fix**: Populate stage history on every stage change

---

## Summary

| # | Issue | System |
|---|-------|--------|
| 1 | Dual data systems | Lead/CRM |
| 2 | No failed login tracking | Auth |
| 3 | No session revocation | Auth |
| 4 | PTIN verification missing | Preparer |
| 5 | BGC integration missing | Preparer |
| 6 | No reschedule/cancel UI | Booking |
| 7 | Incomplete bilingual emails | Email |
| 8 | Links not auto-generated | Preparer |
| 9 | Service field not validated | Lead Gen |
| 10 | Phone validation missing | Lead Gen |
| 11 | No preparer directory | Booking |
| 12 | No calendar integration | Booking |
| 13 | No email delivery confirmation | Email |
| 14 | No reschedule/cancel emails | Booking |
| 15 | Affiliate payout disconnect | Affiliate |
| 16 | Click-to-conversion not linked | Affiliate |
| 17 | Permissions not implemented | CRM |
| 18 | No stage history tracking | Lead Gen |

**Total High Priority Issues: 18**
