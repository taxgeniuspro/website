# Project Overview - Tax Genius Pro

## Project Type & Purpose

**Tax Genius Pro** is a **Lead Generation & Affiliate Management Platform** for a tax preparation company.

**Important Clarification**: This website does NOT:
- File taxes online (tax prep happens offline)
- Process tax returns
- Process actual payments (payments happen offline)

**This website DOES**:
- Create and manage lead/intake forms for tax preparers and affiliates
- Manage client information when forms are submitted (CRM)
- Recruit and onboard tax preparers
- Recruit and onboard affiliates (paid lead generators)
- Track referral attribution
- Track payment records (record keeping only - payments are made offline)

---

## Business Model

### For Tax Preparers (Employees/Contractors)
- **Lead Forms**: Creates intake forms for tax preparers to share with potential clients
- **CRM Access**: Manages client information when it comes in from intake forms
- **Pipeline Management**: Track leads through stages (NEW → CONTACTED → QUALIFIED → etc.)
- **Marketing Tools**: Short links, QR codes with their photo, tracking codes
- **Referral Tracking**: Keep track of affiliate payments they make (offline)

### For Affiliates (Paid Lead Generators)
- **Referral Links**: Get unique links to promote Tax Genius Pro
- **Lead Attribution**: Leads are tracked back to the affiliate
- **Commission Tracking**: See how many leads they've generated
- **Payment Records**: Tax preparers log payments made to affiliates

### For Admins
- **User Management**: Manage tax preparers, affiliates, clients
- **Application Review**: Approve/reject tax preparer and affiliate applications
- **Platform Analytics**: View lead generation, conversion metrics
- **Payment Oversight**: See all payment records across the platform

---

## User Roles

| Role | Description | Count |
|------|-------------|-------|
| `admin` | Platform administrators | ~2-3 |
| `tax_preparer` | Tax preparers with CRM access | ~35 |
| `affiliate` | Paid lead generators | Variable |
| `client` | End users who fill out intake forms | Variable |

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16.0.7 (App Router)
- **React**: 19.1.0
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI + Radix primitives

### Backend
- **Runtime**: Node.js (Coolify Docker)
- **Database**: PostgreSQL (self-hosted at 72.60.28.175:5435)
- **ORM**: Prisma 6.18.0
- **Cache**: Redis (self-hosted)

### Authentication
- **Provider**: NextAuth.js v5
- **Methods**:
  - Email/Password (bcrypt)
  - Google OAuth
  - Magic Link (via Resend)
- **Sessions**: JWT (30-day duration)

### External Services
| Service | Purpose |
|---------|---------|
| Resend | Transactional email (23 templates) |
| Square | Payment integration (tracking only) |
| Cloudinary | Image storage (avatars, QR codes) |
| Socket.io | Real-time notifications |

### Hosting
- **Frontend**: Coolify self-hosted (72.60.28.175)
- **Database/Services**: Self-hosted VPS (72.60.28.175)

---

## Key Features

### 1. Lead Generation
- Client intake forms (`/start-filing/form`)
- Contact forms
- Lead capture with tracking attribution
- Bilingual support (EN/ES)

### 2. Tax Preparer System
- Preparer application/onboarding
- 35 active preparers with tracking codes
- Short links: `/go/{code}-intake`, `/go/{code}-appt`, `/go/{code}-lead`
- QR codes with preparer photo in center
- CRM dashboard for managing assigned clients

### 3. Affiliate/Referral System
- Affiliate application workflow
- Referral link generation
- Lead attribution tracking
- Commission/payout tracking (record keeping)

### 4. CRM System
- Contact management
- Lead pipeline stages
- Marketing assets
- Role-based permissions (86 total)

### 5. Booking System
- Appointment scheduling with tax preparers
- Preparer availability management
- Confirmation emails

### 6. Email System
- 23 React Email templates via Resend
- Lead notifications
- Intake complete notifications
- Referral invitations
- Bilingual support

---

## Database Schema Highlights

- 100+ Prisma models
- Key entities: User, Profile, Contact, Lead, Referral, Payout, MarketingLink
- Role-based permissions system
- Audit logging

---

## Current State

### E2E Test Results (as of Dec 2025)
- **Passed**: 103 tests
- **Failed**: 0 tests
- **Skipped**: 8 tests (require admin credentials)

### Recent Fixes (PRs #173-178)
- Login retry mechanism for E2E tests
- Signup API error handling improvements
- CRM integration and role sync
- Auto-assign contacts to creating tax preparer

---

## Core Business Flows

### Flow 1: Client Intake
```
Client visits preparer's link (/go/{code}-intake)
  → Fills intake form
  → Data saved to CRM
  → Preparer notified
  → Preparer contacts client offline for tax prep
```

### Flow 2: Tax Preparer Recruitment
```
Person applies to be tax preparer
  → Admin reviews application
  → Approved → Gets CRM access + tracking codes + marketing links
  → Manages their clients in CRM
```

### Flow 3: Affiliate Recruitment
```
Person applies to be affiliate
  → Approved → Gets referral links
  → Promotes to find clients
  → Leads come in with attribution
  → Affiliate earns commission (tracked, not paid)
  → Tax preparer pays affiliate offline
  → Payment logged in system for records
```

### Flow 4: Payment Tracking (Record Keeping Only)
```
Tax preparer pays their affiliate offline (cash, Venmo, etc.)
  → Logs payment in system
  → Both parties can see payment record
  → History kept for accounting
```
