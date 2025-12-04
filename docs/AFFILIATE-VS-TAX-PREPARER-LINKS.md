# Affiliate vs Tax Preparer Link Systems

## Overview

Both **Affiliates** and **Tax Preparers** get two standard tracking links with QR codes:
1. 📝 **Lead Capture Form** - Quick contact form (`/contact`)
2. 📋 **Tax Intake Form** - Full tax intake form (`/start-filing/form`)

However, there are **critical differences** in how leads are handled.

---

## 🔑 KEY DIFFERENCES

| Feature | Affiliates | Tax Preparers |
|---------|-----------|---------------|
| **Lead Assignment** | Goes to Tax Genius Corporate | Assigned DIRECTLY to preparer |
| **Lead Access** | See NAMES ONLY (privacy protected) | See FULL client details |
| **Client Relationship** | No client relationship | Clients become THEIRS |
| **Revenue Model** | Earn commissions | Direct client revenue |
| **Lead Dashboard** | Names only, conversion status | Full CRM access to all details |
| **Purpose** | Marketing/referrals | Client acquisition |

---

## 👥 AFFILIATE SYSTEM

### How It Works

```mermaid
User scans QR → Fills form → Lead created → Assigned to CORPORATE → Affiliate sees name only
```

### Test Affiliate Account

**Login:**
- URL: https://taxgeniuspro.tax/auth/signin
- Email: test-affiliate@example.com
- Password: TestAffiliate123!

**Links Generated:**
1. `https://taxgeniuspro.tax/go/testaffiliate123-lead`
2. `https://taxgeniuspro.tax/go/testaffiliate123-intake`

**Dashboard:**
https://taxgeniuspro.tax/dashboard/affiliate
- Click "Links & QR" tab to see links
- Click "Lead Management" to see leads (names only)

### What Affiliates See

**Leads Dashboard (`/dashboard/affiliate/leads`):**
```
✅ John Smith - Status: New
✅ Sarah Johnson - Status: Converted
✅ Mike Brown - Status: Contacted
```

**What They DON'T See:**
- ❌ Email addresses
- ❌ Phone numbers
- ❌ SSN
- ❌ Date of birth
- ❌ Address
- ❌ Tax information

### Technical Details

**Service:** `src/lib/services/affiliate-links.service.ts`
**API:** `/api/affiliate/links`
**Creator Type:** `AFFILIATE`
**Finalization Hook:** Lines 48-63 in `route.ts`

```typescript
if (profile.role === 'affiliate') {
  await generateAffiliateStandardLinks(profile.id);
}
```

---

## 👨‍💼 TAX PREPARER SYSTEM

### How It Works

```mermaid
User scans QR → Fills form → Lead created → Assigned to PREPARER → Preparer sees everything
```

### Test Tax Preparer Account

**Login:**
- URL: https://taxgeniuspro.tax/auth/signin
- Email: test-preparer@example.com
- Password: TestPreparer123!

**Links Generated:**
1. `https://taxgeniuspro.tax/go/testpreparer123-lead`
2. `https://taxgeniuspro.tax/go/testpreparer123-intake`

**Dashboard:**
https://taxgeniuspro.tax/dashboard/tax-preparer
- Scroll down to see "My Referral Links" section
- Visit `/dashboard/tax-preparer/leads` to see full CRM

### What Tax Preparers See

**Leads Dashboard (`/dashboard/tax-preparer/leads`):**
```
✅ John Smith
   📧 john@email.com
   📱 (555) 123-4567
   📍 123 Main St, City, State
   💰 Status: In Progress
   📋 Full tax intake data available
```

**Full Access To:**
- ✅ Email addresses
- ✅ Phone numbers
- ✅ Full address
- ✅ Filing status
- ✅ Income information
- ✅ All tax documents
- ✅ CRM management tools

### Technical Details

**Service:** `src/lib/services/tax-preparer-links.service.ts`
**API:** `/api/tax-preparer/links`
**Creator Type:** `TAX_PREPARER`
**Finalization Hook:** Lines 66-81 in `route.ts`

```typescript
if (profile.role === 'tax_preparer') {
  await generateTaxPreparerStandardLinks(profile.id);
}
```

---

## 🔄 SHARED COMPONENTS

### ReferralLinksManager Component

The same component is used by both roles, but it's **role-aware**:

```typescript
// Detects user role and fetches from appropriate endpoint
const endpoint =
  userRole === 'tax_preparer'
    ? '/api/tax-preparer/links'
    : '/api/affiliate/links';
```

**Description Changes:**
- Affiliate: "Share these links to earn commissions..."
- Tax Preparer: "Share these links with your clients. Leads come directly to you."

### Tracking Code System

Both roles use the same tracking code infrastructure:
- Auto-generated codes (e.g., `testaffiliate123`, `testpreparer123`)
- QR code generation with Tax Genius branding
- Link shortening (`/go/{code}-lead`, `/go/{code}-intake`)
- Analytics tracking (clicks, conversions, etc.)

---

## 📊 DATABASE STRUCTURE

### MarketingLink Model

```prisma
model MarketingLink {
  id          String
  creatorId   String   // Profile ID
  creatorType String   // "AFFILIATE" or "TAX_PREPARER"
  code        String   // e.g., "testaffiliate123-lead"
  url         String   // Full URL with tracking
  shortUrl    String   // Short URL for sharing
  qrCodeImageUrl String // Base64 QR code

  // Analytics
  clicks      Int
  intakeStarts Int
  conversions Int
}
```

**Creator Type Matters:**
- `AFFILIATE` → Leads go to corporate
- `TAX_PREPARER` → Leads assigned to preparer

---

## 🚀 SETUP SCRIPTS

### For Affiliates

```bash
# Create test affiliate account
npx tsx scripts/setup-test-affiliate.ts

# Backfill existing affiliates
npx tsx scripts/backfill-affiliate-links.ts
```

### For Tax Preparers

```bash
# Create test tax preparer account
npx tsx scripts/setup-test-tax-preparer.ts

# Backfill existing tax preparers
npx tsx scripts/backfill-tax-preparer-links.ts
```

---

## 🎯 TESTING GUIDE

### Test Flow

1. **Login as Affiliate:**
   - Visit dashboard → Links & QR tab
   - Download lead form QR code
   - Scan it or visit the link
   - Submit a test lead
   - Check `/dashboard/affiliate/leads` → See name only

2. **Login as Tax Preparer:**
   - Visit dashboard → Scroll to "My Referral Links"
   - Download intake form QR code
   - Scan it or visit the link
   - Submit a test lead
   - Check `/dashboard/tax-preparer/leads` → See full details

### Expected Results

| Action | Affiliate | Tax Preparer |
|--------|-----------|--------------|
| View links | ✅ Both links visible | ✅ Both links visible |
| Download QR | ✅ PNG with logo | ✅ PNG with logo |
| Lead submitted | ✅ Name appears in dashboard | ✅ Full details in CRM |
| Lead ownership | ❌ Corporate owns lead | ✅ Preparer owns lead |
| Client access | ❌ No contact info | ✅ Full client record |

---

## 🔐 PRIVACY & SECURITY

### Affiliate Privacy Protection

**API Endpoint (`/api/affiliate/leads`):**
```typescript
select: {
  id: true,
  first_name: true,
  last_name: true,
  // NO: email, phone, SSN, DOB, address
  convertedToClient: true,
  created_at: true,
}
```

### Tax Preparer Full Access

**API Endpoint (`/api/tax-preparer/leads`):**
```typescript
// Full access through LeadDashboard component
// All client data available in CRM
```

---

## 📝 NOTES

1. **Automatic Generation:** Links are auto-generated when tracking code is finalized
2. **One-Time Setup:** Each role gets their links once, they persist
3. **QR Codes:** Generated with Tax Genius logo, stored as base64
4. **Analytics:** Both roles see click/conversion tracking
5. **Idempotent:** Scripts can be run multiple times safely

---

## 🛠️ MAINTENANCE

### Update QR Codes

If logo changes, regenerate QR codes:

```typescript
// For affiliates
await regenerateQRCodes(profileId);

// For tax preparers
await regenerateTaxPreparerQRCodes(profileId);
```

### Delete and Regenerate

```typescript
// For affiliates
await deleteAffiliateLinks(profileId);
await generateAffiliateStandardLinks(profileId);

// For tax preparers
await deleteTaxPreparerLinks(profileId);
await generateTaxPreparerStandardLinks(profileId);
```

---

## 🎨 UI/UX DIFFERENCES

Both roles see the same component layout:

```
┌─────────────────────────────────────┐
│  My Referral Links                   │
├─────────────────────────────────────┤
│  📝 Lead Capture Form    📋 Intake   │
│  [QR Code]              [QR Code]   │
│  [Copy Link]            [Copy Link] │
│  [Download QR]          [Download QR]│
└─────────────────────────────────────┘
```

But the **description** changes based on role.

---

## ✅ IMPLEMENTATION CHECKLIST

- [x] Affiliate links service
- [x] Tax preparer links service
- [x] API endpoints for both roles
- [x] Role-aware ReferralLinksManager
- [x] Finalization hooks for both roles
- [x] Backfill scripts
- [x] Test accounts
- [x] Privacy protection for affiliates
- [x] Full access for tax preparers
- [x] QR code generation
- [x] Analytics tracking
- [x] Documentation

---

**Last Updated:** 2025-01-09
**Version:** 1.0.0
