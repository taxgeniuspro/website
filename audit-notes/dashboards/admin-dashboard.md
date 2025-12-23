# Admin Dashboard Audit

## Overview

**Access**: Users with `admin` role only
**Location**: `/admin/*`

---

## Dashboard Home

### Checklist

- [ ] Loads without errors
- [ ] Key metrics displayed
- [ ] Recent activity shown
- [ ] Quick actions available
- [ ] COMPARE: As useful as HubSpot admin?

---

## User Management

### Checklist

- [ ] List all users
- [ ] Search users
- [ ] Filter by role
- [ ] Sort by date/name
- [ ] View user details
- [ ] Edit user profile
- [ ] Change user role
- [ ] Enable/disable user
- [ ] Delete user (with confirmation)
- [ ] Bulk actions

### Issues Found
*To be populated during audit*

---

## Tax Preparer Management

### Checklist

- [ ] List all preparers
- [ ] View applications
- [ ] Approve/reject applications
- [ ] View preparer's clients
- [ ] View preparer's tracking codes
- [ ] Suspend/unsuspend preparer
- [ ] Edit preparer profile

### Issues Found
*To be populated during audit*

---

## Affiliate Management

### Checklist

- [ ] List all affiliates
- [ ] View applications
- [ ] Approve/reject applications
- [ ] View affiliate's referrals
- [ ] View payment history
- [ ] Suspend/unsuspend affiliate

### Issues Found
*To be populated during audit*

---

## Lead/Contact Management

### Checklist

- [ ] View all leads
- [ ] Search/filter leads
- [ ] Assign leads to preparers
- [ ] View lead details
- [ ] Export leads

### Issues Found
*To be populated during audit*

---

## Security

### Checklist

- [ ] Regular users blocked from admin routes
- [ ] API endpoints check admin role server-side
- [ ] Sensitive actions logged
- [ ] COMPARE: Industry standard security?

### Issues Found
*To be populated during audit*

---

## Files to Review

- `/src/app/(protected)/admin/` - Admin pages
- `/src/app/api/admin/` - Admin API routes
- `/src/lib/permissions.ts` - Permission checks
