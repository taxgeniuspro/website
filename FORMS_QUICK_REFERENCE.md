# Tax Genius Pro - Forms Quick Reference Table

## All 6 Forms at a Glance

| Form # | Name | Route | Endpoint | Required Fields | Status |
|--------|------|-------|----------|-----------------|--------|
| 4 | Preparer Application | `/preparer/apply` | `POST /api/preparers/apply` | firstName, lastName, email, phone, languages, smsConsent | Active |
| 5 | Referral Signup | `/referral/signup` | `POST /api/referrals/signup` | firstName, lastName, email, phone | Active |
| 6 | Affiliate Application | `/affiliate/apply` | `POST /api/applications/affiliate` | firstName, lastName, email, phone, agreeToTerms | Active |
| 7 | Customer Lead (Tax Intake) | `/start-filing/form` | `POST /api/tax-intake/lead` | first_name, last_name, email, phone (+ address) | Active |
| 8 | Preparer Lead | API Only | `POST /api/leads/preparer` | firstName, lastName, email, phone, ptin | Active |
| 9 | Affiliate Lead | API Only | `POST /api/leads/affiliate` | firstName, lastName, email, phone | Active |

---

## API Endpoint Quick Commands

### Test Form 4: Preparer Application
```bash
curl -X POST http://localhost:3005/api/preparers/apply \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "phone": "(404) 555-1234",
    "languages": "Both",
    "experienceLevel": "INTERMEDIATE",
    "taxSoftware": ["ProSeries", "Drake"],
    "smsConsent": "yes"
  }'
```

### Test Form 5: Referral Signup
```bash
curl -X POST http://localhost:3005/api/referrals/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Sarah",
    "lastName": "Johnson",
    "email": "sarah@example.com",
    "phone": "(404) 555-5678"
  }'
```

### Test Form 6: Affiliate Application
```bash
curl -X POST http://localhost:3005/api/applications/affiliate \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Emily",
    "lastName": "Rodriguez",
    "email": "emily@example.com",
    "phone": "(678) 555-9999",
    "experience": "5 years in digital marketing",
    "audience": "Small business owners",
    "platforms": ["Facebook", "Instagram"],
    "agreeToTerms": true
  }'
```

### Test Form 7: Customer Lead (Tax Intake)
```bash
curl -X POST http://localhost:3005/api/tax-intake/lead \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Michael",
    "last_name": "Anderson",
    "email": "michael@example.com",
    "phone": "(404) 555-2222",
    "address_line_1": "456 Oak Ave",
    "city": "Atlanta",
    "state": "GA",
    "zip_code": "30305"
  }'
```

### Test Form 8: Preparer Lead
```bash
curl -X POST http://localhost:3005/api/leads/preparer \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "James",
    "lastName": "Peterson",
    "email": "james@example.com",
    "phone": "(770) 555-3333",
    "ptin": "P12345678",
    "certification": "CPA",
    "experience": "10 years"
  }'
```

### Test Form 9: Affiliate Lead
```bash
curl -X POST http://localhost:3005/api/leads/affiliate \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jessica",
    "lastName": "Wilson",
    "email": "jessica@example.com",
    "phone": "(404) 555-7777",
    "experience": "8 years in content marketing",
    "audience": "Entrepreneurs"
  }'
```

---

## CRM Integration Summary

All 6 forms automatically create CRM records:

### CRMContact Creation
- **Key Field**: email (used for upsert)
- **Always Set**: contactType, stage ('NEW'), source, lastContactedAt
- **Conditional**: assignedPreparerId (tax intake only), attributionFields

### CRMInteraction Logging
- **Always Created**: One NOTE interaction per form submission
- **Format**: Markdown with structured data
- **Direction**: Always 'INBOUND'
- **Subject**: Emoji + description of form type

### Contact Types
- `PREPARER` - Forms 4, 8
- `AFFILIATE` - Forms 5, 6, 9
- `LEAD` - Form 7

---

## Response Format Examples

### Success Response (201 Created)
```json
{
  "success": true,
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Form submitted successfully"
}
```

### Validation Error (400)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

### Duplicate Entry (409)
```json
{
  "error": "An application with this email already exists"
}
```

---

## Database Schema Quick Reference

### Form 4 Storage
- `PreparerApplication` table
- `CRMContact` (contactType='PREPARER')
- `CRMInteraction` (subject='Tax Preparer Application')

### Form 5 Storage
- `ReferrerApplication` table
- `CRMContact` (contactType='AFFILIATE')
- `CRMInteraction` (subject='Referral Program Signup')

### Form 6 Storage
- `Lead` table (type='AFFILIATE')
- `CRMContact` (contactType='AFFILIATE')
- `CRMInteraction` (subject='Affiliate Application')

### Form 7 Storage
- `TaxIntakeLead` table
- `CRMContact` (contactType='LEAD')
- `CRMInteraction` (subject='Tax Intake Form')

### Form 8 Storage
- `Lead` table (type='TAX_PREPARER')
- `CRMContact` (contactType='PREPARER')
- `CRMInteraction` (subject='Tax Preparer Lead Inquiry')

### Form 9 Storage
- `Lead` table (type='AFFILIATE')
- `CRMContact` (contactType='AFFILIATE')
- `CRMInteraction` (subject='Affiliate Lead Inquiry')

---

## Email Notifications

| Form | Admin Email | Applicant Email | Status |
|------|-----------|-----------------|--------|
| 4 | taxgenius.tax@gmail.com, Taxgenius.taxes@gmail.com | Yes (via Resend) | Implemented |
| 5 | TODO | TODO | Not Implemented |
| 6 | TODO | TODO | Not Implemented |
| 7 | To assigned preparer | No | Implemented |
| 8 | TODO | TODO | Not Implemented |
| 9 | TODO | TODO | Not Implemented |

---

## Attribution Tracking

### Forms with Attribution
- Form 6 (Affiliate Application)
- Form 7 (Customer Lead)
- Form 8 (Preparer Lead)
- Form 9 (Affiliate Lead)

### Attribution Sources (in priority order)
1. URL ref parameter: `?ref=trackingCode`
2. Cookie data
3. Email matching
4. Phone matching
5. Direct (no attribution)

### Fields Stored
- `referrerUsername` - Username or code of referrer
- `referrerType` - AFFILIATE, TAX_PREPARER, CLIENT, etc.
- `commissionRate` - Commission percentage (if applicable)
- `attributionMethod` - How attribution was determined
- `attributionConfidence` - Confidence level (high/medium/low)

---

## Form Component Locations

| Form | Component | Path |
|------|-----------|------|
| 4 | TaxPreparerApplicationForm | `/src/components/TaxPreparerApplicationForm.tsx` |
| 5 | ReferralSignupForm | `/src/components/ReferralSignupForm.tsx` |
| 6 | AffiliateApplicationForm | `/src/app/affiliate/apply/page.tsx` |
| 7 | SimpleTaxForm | `/src/components/SimpleTaxForm.tsx` |
| 8 | N/A (API Only) | - |
| 9 | N/A (API Only) | - |

---

## Validation Rules Summary

### All Forms
- Email: Valid email format (RFC compliant)
- Phone: Minimum 10 digits
- Names: Min 1 character, max 50 characters

### Form 4 Only
- SMS Consent: MUST be 'yes'
- Experience Level: NEW, INTERMEDIATE, or SEASONED
- Languages: English, Spanish, or Both

### Form 6 & 7
- agreeToTerms: MUST be true
- website: Valid URL format (if provided)

### Form 7
- Date fields: YYYY-MM-DD format
- SSN: XXX-XX-XXXX format (if provided)
- has_dependents + number_of_dependents: Conditional required

### Form 8
- PTIN: Required (Preparer Tax ID Number)

---

## Error Handling

### Common Error Codes
- `400 Bad Request` - Validation failed (missing/invalid fields)
- `409 Conflict` - Duplicate email/application
- `500 Server Error` - Database or processing error

### CRM Errors
- CRM failures do NOT block form submission
- Logged but form data still saved
- Graceful degradation: lead saved even if CRM fails

---

## Field Naming Conventions

### camelCase (Most Forms)
- firstName, lastName, email, phone
- experienceLevel, agreeToTerms

### snake_case (Form 7 Tax Intake)
- first_name, last_name, address_line_1
- filing_status, employment_type, date_of_birth

### Note
Forms 4, 5, 6, 8, 9 use camelCase. Form 7 uses snake_case.

---

## Next Steps for Testing

1. **Start with Form 4** (Preparer Application) - simplest form
2. **Test Form 5** (Referral) - validates referral code generation
3. **Test Form 6** (Affiliate Application) - tests bonding logic
4. **Test Form 7** (Tax Intake) - tests multi-page form and partial submissions
5. **Test Forms 8 & 9** - validate API-only endpoint handling

### Testing Checklist
- [ ] Form submits successfully
- [ ] CRMContact created
- [ ] CRMInteraction logged
- [ ] Response contains correct IDs
- [ ] Validation errors work correctly
- [ ] Duplicate entries return 409
- [ ] Email notifications queued (if implemented)

