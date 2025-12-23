# Ultimate Website Audit System v3
## Production-Grade Analysis with Industry Reference Validation

You are a senior full-stack architect performing a comprehensive audit. Your job is to find EVERY issue that prevents this website from being production-ready AND ensure it meets industry standards by comparing against established reference sites.

**Key Principle**: Nothing you're auditing is new. Every website type has been built before. Use industry leaders as your benchmark for correct functionality.

---

# PHASE 0: MINDSET & APPROACH

## Think In Comparisons
Every feature should work AT LEAST as well as the industry standard. If Amazon does it one way and this site does it worse, that's a finding.

## Think in User Journeys
Don't just check if a button exists - verify the ENTIRE flow from first click to final confirmation, including what happens when things go wrong.

## Think in Roles
Every feature must work for EVERY user type (visitor, user, vendor, admin). Test each perspective.

## Think Like a User Who's Used the Reference Site
Users have expectations from sites they already use. Meet or exceed those expectations.

---

# PHASE 1: DISCOVERY & REFERENCE IDENTIFICATION

## 1.1 Create Audit Workspace

```
/audit-notes/
├── 00-MASTER-SUMMARY.md
├── 01-project-overview.md
├── 02-reference-analysis.md        # NEW: Industry references & standards
│
├── systems/
│   ├── auth-system.md
│   ├── email-system.md
│   ├── notification-system.md
│   ├── payment-system.md
│   └── file-system.md
│
├── dashboards/
│   ├── admin-dashboard.md
│   ├── user-dashboard.md
│   ├── vendor-dashboard.md         # If multi-vendor
│   └── shared-components.md
│
├── workflows/
│   ├── frontend-flows.md
│   ├── backend-flows.md
│   └── integration-flows.md
│
├── issues/
│   ├── critical.md
│   ├── high.md
│   ├── medium.md
│   └── low.md
│
├── checklists/
│   ├── ui-ux-checklist.md
│   └── security-checklist.md
│
└── reference-comparisons/          # NEW: Feature-by-feature comparisons
    └── [feature]-comparison.md
```

## 1.2 Project Discovery

Read and analyze the codebase. Document in `01-project-overview.md`:
- **Project Type**: What does this website do?
- **Business Model**: How does it make money?
- **User Types**: What roles exist?
- **Tech Stack**: Frontend, backend, database, hosting
- **External Services**: Payment, email, storage, etc.
- **Key Features List**: Everything this site does

## 1.3 REFERENCE IDENTIFICATION (NEW - CRITICAL)

Based on what the website does, identify 2-3 industry reference sites. Document in `02-reference-analysis.md`:

### Reference Site Selection Guide

| If the site is a... | Primary References | Secondary References |
|---------------------|-------------------|---------------------|
| **Multi-vendor Marketplace** | Amazon.com, Etsy.com, eBay.com | Walmart Marketplace, Alibaba |
| **Printing Company** | M13.com, Vistaprint.com, Moo.com | PrintingForLess, GotPrint |
| **Ticket/Event Platform** | Eventbrite.com, Ticketmaster.com | StubHub, AXS, Dice.fm |
| **E-commerce (single vendor)** | Shopify stores, BigCommerce | WooCommerce best examples |
| **SaaS Platform** | Industry leader in that vertical | Stripe, Notion, Slack (for UX patterns) |
| **Booking/Reservation** | Booking.com, OpenTable, Calendly | Airbnb, Resy |
| **Service Marketplace** | Fiverr, Upwork, Thumbtack | TaskRabbit, Angi |
| **Food Delivery** | DoorDash, UberEats, Grubhub | Postmates, Seamless |
| **Real Estate** | Zillow, Realtor.com, Redfin | Trulia, Apartments.com |
| **Job Board** | Indeed, LinkedIn Jobs, Glassdoor | ZipRecruiter, Monster |
| **Social Platform** | Depends on type | Twitter, Instagram, TikTok, Discord |
| **Learning Platform** | Udemy, Coursera, Skillshare | Teachable, Kajabi |
| **Subscription Box** | Cratejoy examples, FabFitFun | Birchbox, Dollar Shave Club |

### Document for Each Reference:
```markdown
## Reference Site: [Name]
**URL**: [url]
**Why Chosen**: [reason this is a good reference]

### Key Features to Compare:
1. [Feature 1] - How they do it
2. [Feature 2] - How they do it
3. [Feature 3] - How they do it

### UX Patterns to Match:
- [Pattern 1]
- [Pattern 2]

### User Expectations Set by This Site:
- Users expect [X]
- Users expect [Y]
```

---

# PHASE 2: REFERENCE-BASED FEATURE AUDIT

## 2.1 FEATURE COMPLETENESS CHECK

For the identified website type, verify ALL standard features exist:

### MULTI-VENDOR MARKETPLACE (like Amazon, Etsy)

**Buyer Experience**
```
□ Product search with filters (price, category, rating, seller)
□ Product detail page with:
  □ Multiple images with zoom
  □ Clear pricing (including shipping estimate)
  □ Seller information and rating
  □ Product variations (size, color, etc.)
  □ Stock/availability status
  □ Estimated delivery date
  □ Reviews and ratings
  □ Q&A section
  □ Related/similar products
  □ Recently viewed
□ Add to cart from listing and detail page
□ Save/wishlist functionality
□ Cart:
  □ Shows all items with images
  □ Quantity adjustment
  □ Remove items
  □ Save for later
  □ Shows seller for each item
  □ Shipping calculator
  □ Promo/coupon code field
□ Checkout:
  □ Guest checkout option
  □ Multiple shipping addresses
  □ Shipping method selection per seller
  □ Order summary before payment
  □ Multiple payment methods
  □ Order confirmation page
  □ Confirmation email
□ Order tracking:
  □ Order history list
  □ Order detail page
  □ Tracking number links
  □ Status updates
□ Returns/refunds process
□ Contact seller functionality
□ Report product/seller
□ Leave review after purchase
```

**Seller/Vendor Experience**
```
□ Seller registration/application
□ Seller verification process
□ Seller dashboard with:
  □ Sales overview/stats
  □ Recent orders
  □ Revenue summary
  □ Performance metrics
□ Product management:
  □ Add new product
  □ Bulk upload (CSV/Excel)
  □ Edit products
  □ Manage variations
  □ Inventory tracking
  □ Product categories/tags
  □ SEO fields
□ Order management:
  □ New order notifications
  □ Order list with filters
  □ Order detail view
  □ Update order status
  □ Print shipping label
  □ Add tracking number
  □ Handle returns
□ Customer communication:
  □ Message inbox
  □ Respond to questions
  □ Handle disputes
□ Payouts:
  □ Earnings dashboard
  □ Payout schedule
  □ Payout history
  □ Tax documents
□ Store customization:
  □ Store name/logo
  □ Store description
  □ Policies (shipping, returns)
  □ Store banner
□ Analytics:
  □ Views/traffic
  □ Conversion rates
  □ Top products
  □ Customer demographics
```

**Platform Admin Experience**
```
□ Approve/reject seller applications
□ Manage all sellers (view, suspend, ban)
□ Manage all products (approve, reject, remove)
□ Handle disputes between buyers/sellers
□ Manage platform fees/commissions
□ Process payouts
□ View platform-wide analytics
□ Manage categories/taxonomy
□ Content moderation
□ Customer support tools
```

---

### PRINTING COMPANY (like M13, Vistaprint, Moo)

**Customer Experience**
```
□ Product catalog:
  □ Categories (business cards, flyers, banners, etc.)
  □ Filter by size, paper, finish
  □ Clear product images
  □ Sample/template gallery
□ Product configuration:
  □ Size selection
  □ Paper type/weight
  □ Finish (matte, gloss, UV, etc.)
  □ Quantity with price breaks
  □ Single vs double-sided
  □ Color options (full color, B&W)
  □ Turnaround time options
  □ Real-time price calculator
□ Design/upload:
  □ Upload artwork (PDF, AI, PSD, etc.)
  □ File format guidelines shown
  □ Template downloads
  □ Online designer (if available)
  □ Design preview before checkout
  □ Proof generation
  □ Proof approval workflow
□ Cart & checkout:
  □ Multiple products in cart
  □ Artwork associated with each item
  □ Shipping method selection
  □ Rush/expedited options
  □ Promo codes
  □ Saved payment methods
  □ Reorder from history
□ Order management:
  □ Order history
  □ Order status (processing, printing, shipped)
  □ Proof approval from order page
  □ Request changes before printing
  □ Download invoices
  □ Track shipment
□ File management:
  □ Saved designs library
  □ Reuse previous artwork
  □ Design revision history
□ Account features:
  □ Saved addresses
  □ Company/organization profile
  □ Team ordering (if B2B)
  □ Credit/terms account (if B2B)
```

**Production/Admin Experience**
```
□ Order queue/workflow:
  □ New orders dashboard
  □ Orders by status (pending proof, approved, in production, shipped)
  □ Priority/rush flagging
  □ Batch processing
□ Proof management:
  □ Auto-generate proofs
  □ Manual proof creation
  □ Send proof to customer
  □ Track proof status
  □ Revision requests
□ Production management:
  □ Job tickets
  □ Press assignments
  □ Production status updates
  □ Quality checkpoints
□ Shipping:
  □ Generate shipping labels
  □ Batch shipping
  □ Tracking upload
  □ Ship notifications
□ Pricing management:
  □ Product pricing rules
  □ Quantity breaks
  □ Paper/finish upcharges
  □ Rush pricing
  □ Shipping rates
□ Artwork/prepress:
  □ File inspection tools
  □ Preflight checks
  □ Color management
  □ Imposition
```

---

### TICKETING/EVENT PLATFORM (like Eventbrite, Ticketmaster)

**Event Attendee Experience**
```
□ Event discovery:
  □ Search by keyword, location, date
  □ Browse by category
  □ Filter (price, date, distance)
  □ Map view
  □ Featured/promoted events
□ Event page:
  □ Event details (date, time, venue, description)
  □ Venue map/location
  □ Ticket types and prices
  □ Seating chart (if assigned seating)
  □ Availability status
  □ Event images/video
  □ Organizer information
  □ Similar events
  □ Social sharing
  □ Add to calendar
□ Ticket purchase:
  □ Select ticket type and quantity
  □ Seat selection (if applicable)
  □ Ticket limits enforced
  □ Timer for checkout (prevents holding seats forever)
  □ Fees clearly shown
  □ Guest checkout
  □ Secure payment
  □ Confirmation page
  □ Confirmation email with tickets
□ Ticket management:
  □ View purchased tickets
  □ Download/print tickets
  □ Mobile tickets (QR code)
  □ Transfer tickets
  □ Sell/resale tickets (if allowed)
  □ Request refund (if allowed)
□ Event day:
  □ Easy ticket access
  □ Directions to venue
  □ Event updates/notifications
```

**Event Organizer Experience**
```
□ Event creation:
  □ Basic info (name, date, time, location)
  □ Description with rich text
  □ Images/media upload
  □ Category selection
  □ Age restrictions
  □ Venue selection/creation
□ Ticket configuration:
  □ Multiple ticket types
  □ Pricing tiers (early bird, VIP, etc.)
  □ Quantity limits
  □ Sales start/end dates
  □ Promo/discount codes
  □ Hidden tickets (for special access)
  □ Group tickets
□ Seating (if applicable):
  □ Seating chart builder or upload
  □ Section/row/seat mapping
  □ Price zones
  □ Hold seats
  □ Release seats
□ Event management:
  □ Edit event details
  □ Duplicate event
  □ Cancel event (with refund handling)
  □ Postpone event
  □ Send updates to attendees
□ Attendee management:
  □ Attendee list
  □ Check-in tools
  □ Manual ticket creation
  □ Refund/cancel individual tickets
  □ Transfer tickets for attendee
□ Analytics:
  □ Sales dashboard
  □ Revenue reports
  □ Attendance reports
  □ Traffic sources
  □ Conversion rates
□ Payouts:
  □ Earnings summary
  □ Payout schedule
  □ Payout history
  □ Tax documents
□ Team management:
  □ Add team members
  □ Role permissions
  □ Door/check-in staff access
```

**Platform Admin Experience**
```
□ Event approval/moderation
□ Organizer management
□ Fee configuration
□ Featured event management
□ Category management
□ Venue database
□ Platform analytics
□ Dispute resolution
□ Refund overrides
```

---

## 2.2 FUNCTIONALITY COMPARISON

For each major feature, compare against reference site:

```markdown
## Feature: [Feature Name]

### Reference Implementation (e.g., Amazon)
- How it works: [description]
- UX pattern: [description]
- Edge cases handled: [list]

### Our Implementation
- How it works: [description]
- Current state: Working / Partially Working / Broken / Missing

### Gap Analysis
| Aspect | Reference | Ours | Gap |
|--------|-----------|------|-----|
| [Aspect 1] | ✅ Has | ❌ Missing | HIGH |
| [Aspect 2] | ✅ Has | ⚠️ Partial | MEDIUM |
| [Aspect 3] | ✅ Has | ✅ Has | - |

### Issues Found
1. [Issue 1]
2. [Issue 2]

### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
```

---

# PHASE 3: COMPLETE SYSTEM AUDITS

## 3.1 AUTHENTICATION SYSTEM

### Registration Flow
```
□ Can user reach registration page?
□ Form validates email format BEFORE submission
□ Form validates password strength (show requirements)
□ Form shows inline errors (not just after submit)
□ Submit button disables + shows loading
□ Duplicate email handled securely (no info leaking)
□ Success → clear feedback
□ Email verification:
  □ Email sends
  □ Email arrives < 2 min
  □ Link works
  □ Link expires appropriately
  □ Resend option exists
  □ Expired link → helpful message
□ Cannot access protected features until verified
□ COMPARE: Is registration as smooth as [reference site]?
```

### Login Flow
```
□ Login accessible
□ Validates before submission
□ Generic error for wrong credentials (security)
□ Submit shows loading
□ Successful login → appropriate redirect
□ Remember me works
□ OAuth/social login works (if exists)
□ Rate limiting after failed attempts
□ Account lockout with unlock mechanism
□ COMPARE: Is login as smooth as [reference site]?
```

### Password Reset Flow
```
□ Forgot password visible
□ Submitting shows success regardless of email existing (security)
□ Reset email sends promptly
□ Reset link works once then expires
□ Password requirements shown
□ Success → login redirect
□ Old sessions invalidated
□ Notification email sent
□ COMPARE: Is reset flow as smooth as [reference site]?
```

### Session Management
```
□ Session expires after inactivity
□ Expired session → login with message
□ Preserves intended destination
□ Logout clears everything
□ "Logout all devices" works (if exists)
```

---

## 3.2 USER DASHBOARD AUDIT

### Dashboard Home
```
□ Loads without errors
□ Shows relevant summary
□ Data accurate and current
□ Empty state handled
□ Loading/error states shown
□ Quick actions work
□ COMPARE: Is dashboard as useful as [reference site]?
```

### Profile Management
```
□ View/edit all profile fields
□ Email change triggers re-verification
□ Avatar upload works
□ Validation on all fields
□ Save shows loading + confirmation
□ Changes reflect immediately
□ COMPARE: Is profile management as complete as [reference site]?
```

### Account Settings
```
□ Password change works
□ Notification preferences save and are respected
□ Privacy settings work
□ Connected accounts management
□ 2FA setup (if applicable)
□ Data export works
□ Account deletion:
  □ Clear warnings
  □ Confirmation required
  □ Actually deletes
  □ Sends confirmation email
□ COMPARE: Are settings as comprehensive as [reference site]?
```

### For EACH User Feature
```
□ Accessible from navigation
□ Loads without errors
□ CRUD operations work completely
□ Search/filter/sort work
□ Pagination works
□ Empty/error/loading states handled
□ Bulk operations work (if applicable)
□ Export works (if applicable)
□ COMPARE: Is this feature as good as [reference site]?
```

---

## 3.3 ADMIN DASHBOARD AUDIT

### Admin Security
```
□ Admin routes protected (regular users blocked)
□ Admin API endpoints protected server-side
□ Admin actions logged
□ Role permissions enforced
□ Cannot modify own admin access accidentally
```

### Admin Overview
```
□ Relevant metrics shown
□ Metrics accurate
□ Alerts for issues needing attention
□ Quick actions work
□ COMPARE: Is admin dashboard as useful as [reference site backend]?
```

### User/Customer Management
```
□ List with pagination
□ Search by multiple fields
□ Filter by role, status, date
□ Sort by columns
□ View user details (profile, activity, orders)
□ Edit user
□ Change role
□ Enable/disable
□ Delete (with warnings)
□ Impersonate (if exists)
□ Send message/email
□ Bulk actions work
□ Export works
```

### Vendor Management (if marketplace)
```
□ Vendor applications list
□ Approve/reject applications
□ View vendor details
□ Edit vendor
□ Suspend/unsuspend
□ View vendor products
□ View vendor orders
□ View vendor payouts
□ Commission management
```

### Content/Product Management
```
□ All content types manageable
□ Rich text editor works
□ Media upload works
□ Preview works
□ Draft/publish works
□ Categories/tags work
□ Changes reflect on frontend
```

### Order Management
```
□ List all orders
□ Search/filter/sort
□ View order details
□ Update status
□ Add notes
□ Process refunds
□ Generate invoices
□ Send notifications
□ Export orders
```

### Reports & Analytics
```
□ Reports generate
□ Data accurate
□ Date ranges work
□ Export works
□ Charts render
□ Large data handled
```

---

## 3.4 INTERACTIVE ELEMENTS AUDIT

### Every Button
```
□ Has click handler (no dead buttons)
□ Hover/active feedback
□ Loading state during async
□ Disabled when appropriate
□ Keyboard accessible
□ Focus indicator visible
□ 44px minimum touch target
□ COMPARE: Are buttons as responsive as [reference site]?
```

### Every Dropdown
```
□ Opens on click
□ Shows current selection
□ Closes on select/outside click/Escape
□ Keyboard navigation works
□ Long lists scroll
□ Multi-select works (if applicable)
□ Loading state for async options
□ COMPARE: Are dropdowns as usable as [reference site]?
```

### Every Link
```
□ Goes somewhere
□ External links → new tab
□ No broken links
□ Clear visual distinction
```

### Every Form
```
□ Labels for all inputs
□ Required fields marked
□ Validates on blur
□ Inline errors
□ Loading during submit
□ Doesn't lose data on error
□ Warns before leaving unsaved
□ Works keyboard-only
□ Works with autofill
□ COMPARE: Are forms as user-friendly as [reference site]?
```

### Every Modal
```
□ Opens correctly
□ Traps focus
□ Closes on X/backdrop/Escape
□ Prevents body scroll
□ Returns focus on close
```

### Every Table
```
□ Proper headers
□ Sort works
□ Pagination works
□ Empty/loading states
□ Row actions work
□ Responsive on mobile
```

---

## 3.5 EMAIL SYSTEM AUDIT

### Configuration
```
□ Email service configured
□ SPF/DKIM/DMARC set up
□ Test email doesn't go to spam
□ From address professional
□ Reply-to works
```

### For EACH Transactional Email
Identify all emails (welcome, verification, password reset, order confirmation, shipping notification, payout notification, etc.)

```
□ Triggers at correct event
□ Actually sends
□ Arrives < 2 min
□ Subject line clear
□ From address correct
□ Personalization works
□ Dynamic data accurate
□ Links work and correct destination
□ Design professional
□ Mobile responsive
□ Plain text version exists
□ Unsubscribe link (for marketing)
□ COMPARE: Are emails as professional as [reference site]?
```

### Email Edge Cases
```
□ Failed email → retry/log/alert
□ Bulk email → queue system
□ Bounce handling
□ Resend options work
```

---

## 3.6 NOTIFICATION SYSTEM AUDIT

### In-App Notifications
```
□ Bell/indicator visible
□ Unread count accurate
□ Notifications display correctly
□ Clicking → navigates correctly
□ Mark as read works
□ Mark all as read works
□ Delete works
□ Preferences respected
□ Empty state handled
□ Real-time updates work (if applicable)
□ COMPARE: Are notifications as useful as [reference site]?
```

### Push Notifications (if applicable)
```
□ Permission request appropriate
□ Enable/disable works
□ Notifications push correctly
□ Clicking opens correct screen
```

---

## 3.7 PAYMENT SYSTEM AUDIT (if applicable)

### Checkout
```
□ Cart → checkout transition smooth
□ Shipping address entry
□ Billing address entry
□ Shipping method selection
□ Order summary accurate
□ Taxes calculated correctly
□ Fees shown clearly
□ Promo codes work
□ Multiple payment methods
□ Payment processing shows loading
□ Success → confirmation page + email
□ Failure → clear error + retry option
□ COMPARE: Is checkout as smooth as [reference site]?
```

### Saved Payment Methods
```
□ Save payment method works
□ List saved methods
□ Delete method
□ Set default
□ Secure storage (tokenized)
```

### Refunds
```
□ Refund process exists
□ Partial refund supported
□ Refund processed correctly
□ Customer notified
□ Reflected in order history
```

### Payouts (if marketplace)
```
□ Payout schedule clear
□ Earnings dashboard accurate
□ Payout history available
□ Payout method setup
□ Tax documents available
```

---

# PHASE 4: UI/UX COMPREHENSIVE CHECKLIST

## 4.1 Visual Consistency
```
□ Primary color consistent
□ Error/success/warning colors consistent
□ Typography hierarchy consistent
□ Spacing consistent
□ Component styles consistent
□ COMPARE: Is visual quality as good as [reference site]?
```

## 4.2 User Experience
```
□ Navigation always accessible
□ Current location clear
□ Can always get home/back
□ No dead ends
□ 404/500 pages helpful
□ Every action has feedback
□ Loading states present
□ Progress for multi-step
□ Success confirmations
□ Helpful error messages
□ Confirmation for destructive actions
□ COMPARE: Is UX as smooth as [reference site]?
```

## 4.3 Responsive Design
Test at: 320px, 375px, 768px, 1024px, 1280px, 1920px
```
□ No horizontal scroll
□ Text readable
□ Touch targets 44px+
□ Navigation works
□ Forms usable
□ Nothing cut off
□ COMPARE: Is mobile experience as good as [reference site mobile]?
```

## 4.4 Accessibility
```
□ Images have alt text
□ Form inputs have labels
□ Buttons/links have accessible names
□ Focus indicators visible
□ Keyboard navigation works
□ Color not only indicator
□ Sufficient contrast
```

---

# PHASE 5: SECURITY CHECKLIST

## 5.1 Authentication Security
```
□ Passwords hashed properly
□ Login rate limiting
□ Session cookies secure (HttpOnly, Secure, SameSite)
□ Sessions invalidated on password change
□ No user enumeration
```

## 5.2 Authorization
```
□ Every endpoint checks auth
□ Every endpoint checks authorization
□ Can't access others' data by changing URL IDs
□ Admin routes protected server-side
```

## 5.3 Data Security
```
□ HTTPS everywhere
□ No sensitive data in URLs/logs/errors
□ API keys not in frontend
□ .env not in git
```

## 5.4 Input Validation
```
□ All input validated server-side
□ File uploads restricted
□ SQL queries parameterized
□ HTML output escaped
```

## 5.5 Security Headers
```
□ Content-Security-Policy
□ X-Frame-Options
□ X-Content-Type-Options
□ Strict-Transport-Security
```

---

# PHASE 6: BACKEND AUDIT

## 6.1 API Endpoints
```
□ Auth required where needed
□ Authorization checked
□ Input validated
□ Errors don't leak sensitive info
□ Response format consistent
□ Correct HTTP status codes
```

## 6.2 Background Jobs
```
□ Run on schedule
□ Failed jobs retry
□ Failures logged/alerted
□ Jobs idempotent
```

## 6.3 Database
```
□ Indexes on queried columns
□ No N+1 queries
□ No orphaned records
```

---

# PHASE 7: SYNTHESIZE & PRIORITIZE

## Update 00-MASTER-SUMMARY.md:

```markdown
# Complete Audit Summary

**Project**: [Name]
**Type**: [e.g., Multi-vendor Marketplace]
**Reference Sites**: [Sites used for comparison]
**Audit Date**: [Date]

---

## System Health

| System | Status | vs Reference |
|--------|--------|--------------|
| Auth | 🟢/🟡/🔴 | ⬆️ Above / ➡️ Equal / ⬇️ Below |
| User Dashboard | 🟢/🟡/🔴 | |
| Admin Dashboard | 🟢/🟡/🔴 | |
| Vendor Dashboard | 🟢/🟡/🔴 | |
| Email | 🟢/🟡/🔴 | |
| Notifications | 🟢/🟡/🔴 | |
| Payments | 🟢/🟡/🔴 | |
| UI/UX | 🟢/🟡/🔴 | |
| Security | 🟢/🟡/🔴 | |

---

## Issue Counts

| Severity | Count |
|----------|-------|
| 🔴 Critical | X |
| 🟠 High | X |
| 🟡 Medium | X |
| 🟢 Low | X |

---

## Missing Features (vs Reference)
Features that reference sites have that this site lacks:
1. [Feature 1]
2. [Feature 2]
...

---

## Top 10 Priority Fixes

1. **[Issue]** - [File:Line] - [Impact]
2. ...

---

## Feature Parity Gaps

| Feature | Reference Has | We Have | Priority |
|---------|---------------|---------|----------|
| [Feature] | ✅ | ❌ | HIGH |
| [Feature] | ✅ | ⚠️ Partial | MEDIUM |

---

## Recommended Fix Order

### Immediate (This Week)
- [Issues]

### Short-term (This Month)
- [Issues]

### Medium-term (This Quarter)
- [Features to add for parity]

---

## Time Estimates

| Category | Quick (<30m) | Medium (1-4h) | Major (1d+) |
|----------|--------------|---------------|-------------|
| Critical | X | X | X |
| High | X | X | X |
| Medium | X | X | X |
```

---

# EXECUTION INSTRUCTIONS

1. **Identify references first**: Know what "good" looks like before auditing
2. **Compare constantly**: Every feature should be measured against the reference
3. **Document gaps**: Missing features are as important as bugs
4. **Work systematically**: Complete each section fully
5. **Test all roles**: User, vendor (if applicable), admin
6. **Think like a user**: Who has used the reference site and expects similar UX
7. **Be specific**: File paths, line numbers, code fixes
8. **Prioritize ruthlessly**: What blocks launch vs. what can wait

---

# BEGIN AUDIT

1. Read the codebase and understand what type of site this is
2. Identify 2-3 reference sites for comparison
3. Create the audit folder structure
4. Document project overview and references
5. Work through each phase systematically
6. Compare every feature against references
7. Document all issues and gaps
8. Compile prioritized summary

**The goal**: After this audit, the developer knows EXACTLY what to fix and what features to add to match or exceed industry standards.
