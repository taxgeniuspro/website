# Tax Preparer Dashboard Audit

## Overview

**Access**: Users with `tax_preparer` role
**Location**: `/preparer/*` or `/crm/*`

---

## Dashboard Home

### Checklist

- [ ] Loads without errors
- [ ] Shows relevant stats (leads, clients, appointments)
- [ ] Recent activity displayed
- [ ] Quick actions available
- [ ] COMPARE: As useful as HubSpot CRM?

---

## CRM / Contacts

### Checklist

- [ ] View assigned contacts only
- [ ] Search contacts
- [ ] Filter by status/stage
- [ ] Sort by date/name
- [ ] Add new contact
- [ ] Edit contact details
- [ ] View contact history
- [ ] Change contact stage
- [ ] COMPARE: As complete as HubSpot?

### Issues Found
*To be populated during audit*

---

## Marketing Tools

### Checklist

- [ ] View tracking codes
- [ ] View/copy short links
- [ ] Generate QR codes with photo
- [ ] Marketing materials accessible
- [ ] COMPARE: Easy to use?

### Issues Found
*To be populated during audit*

---

## Appointments

### Checklist

- [ ] View upcoming appointments
- [ ] View past appointments
- [ ] Calendar view
- [ ] Appointment details
- [ ] Reschedule/cancel options

### Issues Found
*To be populated during audit*

---

## Referral/Affiliate Payments

### Checklist

- [ ] View their affiliates
- [ ] Log payments made to affiliates
- [ ] View payment history
- [ ] Track outstanding amounts

### Issues Found
*To be populated during audit*

---

## Profile/Settings

### Checklist

- [ ] Edit profile information
- [ ] Update availability
- [ ] Change password
- [ ] Notification preferences

### Issues Found
*To be populated during audit*

---

## Files to Review

- `/src/app/(protected)/preparer/` - Preparer pages
- `/src/app/(protected)/crm/` - CRM pages
- `/src/app/api/contacts/` - Contact API
