# Affiliate/Referral System Audit

## Overview
**Status**: 🔴 Incomplete - Core structure exists but major gaps
**Rating**: 4/10

---

## Components Audited

### 1. Affiliate Signup
- Application form at `/affiliate/apply`
- Landing page at `/affiliate/join`
- Supports tax preparer bonding

### 2. Referral Links
- 2 standard links: lead capture and intake form
- QR code generation with affiliate photo
- Stored in MarketingLink table

### 3. Lead Attribution
- Attribution service with device/source tracking
- Stored in Lead, TaxIntakeLead, Referral, ReferralClicks tables

### 4. Commission Tracking
- Commission model with types: PERCENTAGE, FLAT, TIERED
- Affiliate groups with 4 tiers: Bronze (5%), Silver (7.5%), Gold (10%), Platinum (15%)

### 5. Affiliate Dashboard
- Overview with stats
- Leads, earnings, analytics tabs
- Creatives and contests sections

### 6. Payout System
- Payout request API
- Admin approval workflow (API only)
- Note: Actual payments happen offline

---

## Critical Issues

### CRITICAL-1: No Affiliate Approval Workflow
- **Problem**: Applications stored but no approval process visible
- **Impact**: Affiliates can't get activated
- **Fix**: Build approval UI for admins

### CRITICAL-2: Hardcoded Mock Data on Earnings Page
- **File**: `/dashboard/affiliate/earnings`
- **Problem**: Shows fake commissions (Jennifer Williams, Ashley Garcia)
- **Impact**: Users see fake data, think system works
- **Fix**: Query real database for affiliate earnings

### CRITICAL-3: Offline Payment Model
- **Problem**: "Actual payments happen offline"
- **Impact**: System can't fulfill payouts automatically
- **Reality**: This is a tracking system only, not a payment system

### CRITICAL-4: No Commission Calculation Code
- **Problem**: Commission type/rate stored but calculation logic missing
- **Impact**: Can't automatically calculate what affiliates are owed
- **Fix**: Implement commission calculation service

### CRITICAL-5: Click-to-Conversion Not Linked
- **Problem**: ReferralClicks table exists but not linked to conversions
- **Impact**: Can't track which clicks led to leads
- **Fix**: Link click records to lead creation

### CRITICAL-6: Disconnect in Tax Preparer Payouts
- **Problem**: Affiliates request payouts centrally, but preparers mark paid separately
- **Impact**: No single source of truth for payments
- **Fix**: Clarify payment ownership model

---

## High Priority Issues

### HIGH-1: Incomplete Affiliate Onboarding
- No profile setup page after approval
- No vanity URL generation
- No contract/agreement management

### HIGH-2: Limited Link Customization
- Only 2 fixed links per affiliate
- Can't create custom campaigns
- No A/B testing

### HIGH-3: Missing Payout Request UI
- API exists but no UI for affiliates
- Can only request via API calls

### HIGH-4: No Real-Time Earnings Updates
- No webhook/event-driven updates
- Manual refresh required

### HIGH-5: Missing Tax Documents
- 1099-NEC forms shown but hardcoded
- No dynamic PDF generation
- No $600 threshold tracking

### HIGH-6: Admin Payout Approval Unclear
- API routes exist but no admin UI found

---

## Medium Priority Issues

### MED-1: Simple Attribution Model
- Last-click only (no multi-touch)
- No attribution window configuration
- No cross-device tracking

### MED-2: Limited Analytics
- No ROI by campaign
- No cost per acquisition
- No time-to-conversion metrics

### MED-3: No Export/Reporting
- Can't export data to CSV
- No scheduled email reports

### MED-4: Missing Alerts/Notifications
- No new lead notifications
- No tier-up notifications
- No low-balance alerts

### MED-5: No Dispute Resolution
- Can't challenge/appeal commissions

### MED-6: Affiliate as Second-Class Status
- Not a first-class role, just a status on client/preparer
- Permission checks inconsistent

---

## Permission & Access Control

### Current State
- Basic role checks (admin vs non-admin)
- `affiliateStatus`: APPROVED, SUSPENDED, INACTIVE
- `hasAffiliateAccess()` function for access control

### Issues
- No granular permissions for affiliate features
- No group admin role for large affiliate networks
- No audit logging of permission changes

---

## Comparison vs PartnerStack/Impact

| Feature | Industry Standard | Tax Genius Pro |
|---------|-------------------|----------------|
| Automated payouts | ✓ | ✗ (offline only) |
| Multi-currency | ✓ | ✗ |
| A/B testing | ✓ | ✗ |
| Real-time tracking | ✓ | Partial |
| Fraud detection | ✓ | ✗ |
| Dispute resolution | ✓ | ✗ |
| Mobile app | ✓ | ✗ |
| Partner API | ✓ | ✗ |
| Custom branding | ✓ | Partial |
| Multi-touch attribution | ✓ | ✗ |

---

## Recommendations

### Quick Wins (1-2 weeks)
1. Replace hardcoded earnings with real database queries
2. Add affiliate approval workflow
3. Create payout request UI
4. Add email alerts for new leads

### Medium Term (2-4 weeks)
1. Fix preparer payout obligations workflow
2. Implement commission calculation service
3. Add click-to-conversion tracking
4. Generate 1099 forms automatically

### Long Term (1-3 months)
1. Implement multi-touch attribution
2. Build affiliate API for partners
3. Add A/B testing for links
4. Implement fraud detection
5. Add automated payout integration

---

## Conclusion

The affiliate system has **foundational architecture in place** but suffers from **incomplete implementation**. The dashboard looks complete (shows stats, pages exist) but underlying functionality is stubbed out with mock data and offline payment handling.

**Key Concern**: System looks complete but isn't - creates false confidence for users.

**Recommendation**: Prioritize fixing critical issues before launching to actual affiliates.
