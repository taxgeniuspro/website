# Quick Deploy: Ultimate Website Audit v3
## With Industry Reference Validation
### Copy everything below and paste into your AI coding assistant

---

You are a senior architect auditing this codebase for production readiness. Find EVERY bug AND ensure it meets industry standards by comparing against established reference sites.

**Key Principle**: Nothing here is new. Every website type has been built before. Industry leaders are your benchmark.

---

## SETUP

Create this structure:
```
/audit-notes/
├── 00-MASTER-SUMMARY.md
├── 01-project-overview.md
├── 02-reference-analysis.md      # Industry references
├── systems/
│   ├── auth-system.md
│   ├── email-system.md
│   ├── notification-system.md
│   └── payment-system.md
├── dashboards/
│   ├── admin-dashboard.md
│   ├── user-dashboard.md
│   └── vendor-dashboard.md       # If marketplace
├── workflows/
│   ├── frontend-flows.md
│   └── backend-flows.md
├── issues/
│   ├── critical.md
│   ├── high.md
│   ├── medium.md
│   └── low.md
└── reference-comparisons/
    └── [feature]-vs-reference.md
```

---

## PHASE 1: DISCOVERY

### 1.1 Understand the Project
Read package files, configs, schemas. Document:
- Project type & purpose
- Business model
- User roles
- Tech stack
- External services
- All features

### 1.2 IDENTIFY REFERENCE SITES (Critical)

Based on project type, pick 2-3 reference sites:

| Project Type | Primary References |
|--------------|-------------------|
| Multi-vendor Marketplace | Amazon.com, Etsy.com, eBay.com |
| Printing Company | M13.com, Vistaprint.com, Moo.com |
| Ticket/Event Platform | Eventbrite.com, Ticketmaster.com |
| E-commerce | Best Shopify stores |
| Booking/Reservation | Booking.com, Calendly.com |
| Service Marketplace | Fiverr.com, Upwork.com |
| SaaS | Industry leader in vertical |

Document in `02-reference-analysis.md`:
- Reference site URL
- Why chosen
- Key features they have
- UX patterns they use
- User expectations they set

---

## PHASE 2: FEATURE COMPLETENESS CHECK

Based on project type, verify ALL standard features exist:

### IF MULTI-VENDOR MARKETPLACE:

**Buyer Must Have:**
- Product search with filters
- Product detail (images, price, seller, reviews, variations)
- Cart (quantities, remove, promo codes)
- Checkout (guest option, shipping, multiple payments)
- Order tracking
- Returns/refunds process
- Contact seller
- Leave reviews

**Seller/Vendor Must Have:**
- Registration/application
- Dashboard (sales stats, recent orders, revenue)
- Product management (add, edit, bulk upload, variations, inventory)
- Order management (list, detail, status updates, tracking, returns)
- Messages/communication
- Payouts (earnings, schedule, history, tax docs)
- Store customization
- Analytics

**Admin Must Have:**
- Approve/reject sellers
- Manage all sellers (suspend, ban)
- Manage all products
- Handle disputes
- Manage fees/commissions
- Process payouts
- Platform analytics

### IF PRINTING COMPANY:

**Customer Must Have:**
- Product catalog with filters
- Product configuration (size, paper, finish, quantity, pricing)
- Upload artwork with guidelines
- Design preview/proof
- Proof approval workflow
- Cart with artwork per item
- Rush/expedited options
- Order tracking with status
- Saved designs library
- Reorder from history

**Admin Must Have:**
- Order queue by status
- Proof generation/management
- Production workflow
- Job tickets
- Shipping/tracking
- Pricing management (quantity breaks, rush pricing)

### IF TICKET/EVENT PLATFORM:

**Attendee Must Have:**
- Event search (keyword, location, date, category)
- Event page (details, venue, tickets, seating chart)
- Seat selection (if applicable)
- Checkout with timer
- Ticket download/mobile QR
- Ticket transfer
- Event reminders

**Organizer Must Have:**
- Event creation (details, images, location)
- Ticket configuration (types, pricing, limits, promo codes)
- Seating chart (if applicable)
- Attendee management
- Check-in tools
- Analytics (sales, attendance)
- Payouts

---

## PHASE 3: SYSTEM AUDITS

### AUTHENTICATION

**Registration**
- Form validates before submit
- Inline errors
- Loading state
- Email verification works (sends, arrives, link works, expires)
- Resend option
- COMPARE: As smooth as [reference]?

**Login**
- Generic error (no info leaking)
- Rate limiting
- Remember me works
- OAuth works (if exists)
- COMPARE: As smooth as [reference]?

**Password Reset**
- Email sends regardless of account existing
- Link works once then expires
- All sessions invalidated
- COMPARE: As smooth as [reference]?

---

### USER DASHBOARD

**Overview**
- Loads without errors
- Data accurate
- Empty state handled
- COMPARE: As useful as [reference]?

**Profile**
- Edit all fields
- Email change → re-verify
- Avatar upload works
- COMPARE: As complete as [reference]?

**Settings**
- Password change works
- Preferences save and respected
- Account deletion works completely
- COMPARE: As comprehensive as [reference]?

**Each Feature**
- Accessible
- CRUD works
- Search/filter/sort works
- Empty/error/loading states
- COMPARE: As good as [reference]?

---

### ADMIN DASHBOARD

**Security**
- Regular users blocked
- API endpoints protected server-side
- Actions logged

**User Management**
- List, search, filter, sort
- View, edit, change role
- Enable/disable/delete
- Bulk actions

**Vendor Management (if marketplace)**
- Applications
- Approve/reject
- Suspend/unsuspend
- View products/orders/payouts

**Order Management**
- List, search, filter
- View details
- Update status
- Refunds
- Export

---

### INTERACTIVE ELEMENTS (Test EVERY one)

**Buttons**
- Click handler exists
- Hover/active feedback
- Loading state
- Disabled when appropriate
- Keyboard accessible

**Dropdowns**
- Opens/closes correctly
- Keyboard navigation
- Long lists scroll

**Forms**
- Labels for all inputs
- Validates on blur
- Inline errors
- Doesn't lose data on error
- Works keyboard-only

**Tables**
- Sort works
- Pagination works
- Row actions work
- Responsive

---

### EMAIL SYSTEM

**For EACH email type:**
(Welcome, verification, reset, order confirmation, shipping, etc.)
- Triggers correctly
- Sends < 2 min
- Not spam
- Subject clear
- Links work
- Mobile responsive
- COMPARE: As professional as [reference]?

---

### NOTIFICATIONS

**In-App**
- Indicator shows
- Count accurate
- Click navigates correctly
- Mark read works
- Preferences respected
- COMPARE: As useful as [reference]?

---

### PAYMENTS (if applicable)

**Checkout**
- Cart → checkout smooth
- Address entry
- Shipping options
- Order summary accurate
- Fees clear
- Payment works
- Success/failure handled
- COMPARE: As smooth as [reference]?

---

## PHASE 4: UI/UX

**Consistency**
- Colors consistent
- Typography consistent
- Spacing consistent
- Components styled same everywhere

**Experience**
- Navigation clear
- Always know where you are
- Every action has feedback
- Error messages helpful

**Responsive** (320px, 768px, 1024px, 1920px)
- No horizontal scroll
- Touch targets 44px+
- Everything works

**Accessibility**
- Alt text on images
- Labels on inputs
- Focus visible
- Keyboard works

---

## PHASE 5: SECURITY

- Passwords hashed
- Login rate limiting
- Session cookies secure
- Every endpoint checks auth + authorization
- Can't access others' data via URL
- No sensitive data in frontend/logs
- Input validated server-side
- SQL parameterized
- Output escaped

---

## DOCUMENT EACH ISSUE AS:

```markdown
### [Title]
- **File**: path/to/file
- **Line**: XX
- **Severity**: Critical | High | Medium | Low
- **Problem**: What's wrong
- **Reference**: How [reference site] does it correctly
- **Fix**:
\`\`\`code
// Solution
\`\`\`
```

---

## FINAL SUMMARY (00-MASTER-SUMMARY.md)

```markdown
# Audit Summary

**Project**: [Name]
**Type**: [Type]
**References**: [Sites compared against]

## System Health vs Reference

| System | Status | vs Reference |
|--------|--------|--------------|
| Auth | 🟢/🟡/🔴 | ⬆️/➡️/⬇️ |
| Dashboards | 🟢/🟡/🔴 | |
| Email | 🟢/🟡/🔴 | |
| Notifications | 🟢/🟡/🔴 | |
| Payments | 🟢/🟡/🔴 | |
| UI/UX | 🟢/🟡/🔴 | |
| Security | 🟢/🟡/🔴 | |

## Issues: 🔴 Critical: X | 🟠 High: X | 🟡 Medium: X | 🟢 Low: X

## Missing Features (Reference Has, We Don't)
1. [Feature]
2. [Feature]

## Top 10 Priority Fixes
1. [Issue] - file:line
2. ...

## Fix Order
### This Week: [critical issues]
### This Month: [high issues]
### This Quarter: [feature parity gaps]
```

---

## BEGIN NOW

1. Read codebase, determine project type
2. Identify 2-3 reference sites
3. Create audit folders
4. Check feature completeness vs references
5. Audit all systems
6. Compare everything to references
7. Document all issues AND gaps
8. Compile prioritized summary

**Goal**: Developer knows exactly what to fix AND what features to add to match industry standards.
