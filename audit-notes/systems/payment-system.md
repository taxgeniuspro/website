# Payment Tracking System Audit

## Overview

**IMPORTANT**: Tax Genius Pro does NOT process payments. All actual payments happen offline (cash, Venmo, Zelle, etc.). This system only TRACKS payment records.

**Payment Scenarios**:
1. Admin pays tax preparer (offline) → logs payment in system
2. Tax preparer pays their affiliate (offline) → logs payment in system

---

## Payment Recording Features

### Admin → Tax Preparer Payments
- [ ] Admin can log payment made to preparer
- [ ] Payment methods tracked (cash, check, Venmo, etc.)
- [ ] Payment history visible
- [ ] Both parties can see record

### Tax Preparer → Affiliate Payments
- [ ] Preparer can log payment to their affiliate
- [ ] Affiliate can see payment records
- [ ] Commission calculation visible
- [ ] Payment status tracked

---

## Checklist

### Payment Logging
- [ ] Easy to log a payment
- [ ] Required fields: amount, date, method, recipient
- [ ] Optional fields: notes, reference number
- [ ] Validation on amounts
- [ ] COMPARE: As clear as PayPal payment history?

### Payment History
- [ ] List view with search/filter
- [ ] Date range filtering
- [ ] Export to CSV
- [ ] Clear status indicators

### Permissions
- [ ] Only authorized users can log payments
- [ ] Users can only see relevant payments
- [ ] Admin can see all payments

---

## Issues Found
*To be populated during audit*

---

## Files to Review

- `/src/app/api/payouts/` - Payout API routes
- `/src/app/(protected)/payouts/` - Payout pages
- Prisma schema: Payout, PayoutRequest models
