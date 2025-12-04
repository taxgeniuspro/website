# Tax Genius Pro - Forms & API Reference Guide

## Overview
This document provides a comprehensive reference for all 6 forms used in the Tax Genius Pro system, including their API endpoints, required fields, CRM integration, and expected responses.

---

## Form 1: Preparer Application Form (Form 4)

### Form Location
- **Component**: `/src/components/TaxPreparerApplicationForm.tsx`
- **Page Route**: `/preparer/apply`
- **Form Type**: Tax Preparer Recruitment Application

### API Endpoint
```
POST /api/preparers/apply
```

### Required Fields (Request Body)
```json
{
  "firstName": "string (required)",
  "middleName": "string (optional)",
  "lastName": "string (required)",
  "email": "string (required, valid email format)",
  "phone": "string (required, valid phone format)",
  "languages": "string (required) - Options: 'English', 'Spanish', 'Both'",
  "experienceLevel": "string (optional) - Options: 'NEW', 'INTERMEDIATE', 'SEASONED'",
  "taxSoftware": "array of strings (optional) - e.g., ['ATX', 'ProSeries', 'Drake']",
  "smsConsent": "'yes' | 'no' (required) - Must be 'yes'"
}
```

### Expected Response
```json
{
  "success": true,
  "applicationId": "string (UUID)",
  "message": "Application submitted successfully! Check your email for confirmation."
}
```

### Validation Rules
- Email must be valid email format
- Phone must be valid phone number
- SMS consent MUST be 'yes' or request fails (400 Bad Request)
- Experience level must be one of: NEW, INTERMEDIATE, or SEASONED
- All required fields must be present or request fails (400 Bad Request)

### CRM Integration
**Automatic CRM Contact Creation:**
- Creates `CRMContact` with:
  - `contactType`: 'PREPARER'
  - `firstName`, `lastName`, `email`, `phone`
  - `stage`: 'NEW'
  - `source`: 'preparer_application'
  - `lastContactedAt`: Current timestamp

**Automatic CRM Interaction Logging:**
- Creates `CRMInteraction` with type 'NOTE':
  - `subject`: '👔 Tax Preparer Application Submitted'
  - `body`: Formatted markdown with all application details
  - `direction`: 'INBOUND'
  - `occurredAt`: Current timestamp

### Email Notifications
- **Applicant Confirmation**: Sent via Resend to applicant email
- **Admin Notification**: Sent to 2 hiring addresses:
  - taxgenius.tax@gmail.com
  - Taxgenius.taxes@gmail.com

### Post-Submission UX Flow
1. Application saved successfully
2. Calendar booking widget displayed (Fluid Booking)
3. User can optionally schedule interview
4. Confirmation details shown with applicant information

### Test Data Example
```json
{
  "firstName": "John",
  "middleName": "Michael",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "(404) 555-1234",
  "languages": "Both",
  "experienceLevel": "INTERMEDIATE",
  "taxSoftware": ["ProSeries", "Drake", "Lacerte"],
  "smsConsent": "yes"
}
```

---

## Form 2: Referral Signup Form (Form 5)

### Form Location
- **Component**: `/src/components/ReferralSignupForm.tsx`
- **Page Route**: `/referral/signup`
- **Form Type**: Referral Program Enrollment

### API Endpoint
```
POST /api/referrals/signup
```

### Required Fields (Request Body)
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required, valid email format)",
  "phone": "string (required, valid phone format)"
}
```

### Expected Response
```json
{
  "success": true,
  "applicationId": "string (UUID)",
  "referralCode": "string (8-char unique code, e.g., 'ABC12XY3')",
  "referralLink": "string (full URL with ref parameter)",
  "message": "Referral signup successful"
}
```

### Validation Rules
- All 4 fields are required
- Email must be valid format
- Phone must be valid format
- Email must be unique (409 Conflict error if duplicate exists)
- Referral code is auto-generated and guaranteed unique

### CRM Integration
**Automatic CRM Contact Creation:**
- Creates `CRMContact` with:
  - `contactType`: 'AFFILIATE'
  - `firstName`, `lastName`, `email`, `phone`
  - `stage`: 'NEW'
  - `source`: 'referral_program_signup'
  - `lastContactedAt`: Current timestamp

**Automatic CRM Interaction Logging:**
- Creates `CRMInteraction` with type 'NOTE':
  - `subject`: '🤝 Referral Program Signup'
  - `body`: Includes referrer info, referral code, and referral link
  - `direction`: 'INBOUND'
  - `occurredAt`: Current timestamp

### Email Notifications
- **TODO**: Welcome email with referral link (not yet implemented)
- **TODO**: SMS notification (not yet implemented)

### Post-Submission UX Flow
1. Signup saved successfully
2. Success page displays with:
   - "Welcome to Tax Genius Referral Program!"
   - Next steps (check email, get referral link, start sharing)
   - Bonus information ($50 per referral + $25 bonus for first 3)
   - Email and SMS confirmation details

### Test Data Example
```json
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "email": "sarah.johnson@example.com",
  "phone": "(404) 555-5678"
}
```

---

## Form 3: Affiliate Application Form (Form 6)

### Form Location
- **Page Route**: `/affiliate/apply`
- **Optional URL Parameters**: `?preparer=username` (for preparer bonding)
- **Form Type**: Affiliate Marketing Program Application

### API Endpoint
```
POST /api/applications/affiliate
```

### Required Fields (Request Body)
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required, valid email format)",
  "phone": "string (required, min 10 digits)",
  "experience": "string (optional)",
  "audience": "string (optional)",
  "platforms": "array of strings (optional) - e.g., ['Facebook', 'Instagram', 'YouTube']",
  "website": "string (optional, valid URL if provided)",
  "socialMedia": {
    "facebook": "string (optional)",
    "instagram": "string (optional)",
    "twitter": "string (optional)",
    "tiktok": "string (optional)",
    "youtube": "string (optional)"
  },
  "message": "string (optional)",
  "agreeToTerms": "boolean (required, must be true)",
  "bondToPreparerUsername": "string (optional) - Tax preparer username for bonding"
}
```

### Expected Response
```json
{
  "success": true,
  "leadId": "string (UUID)",
  "message": "Your affiliate application has been submitted! [bonding message if applicable]"
}
```

### Validation Rules
- All required fields must be present
- Email must be valid format
- Phone must be at least 10 digits
- Website must be valid URL format if provided
- agreeToTerms MUST be true
- Email must be unique (400 Bad Request if duplicate exists)
- If `bondToPreparerUsername` provided, preparer must exist and be TAX_PREPARER role

### CRM Integration
**Automatic CRM Contact Creation:**
- Creates `CRMContact` with:
  - `contactType`: 'AFFILIATE'
  - `firstName`, `lastName`, `email`, `phone`
  - `stage`: 'NEW'
  - `source`: 'affiliate_application'
  - `referrerUsername`, `referrerType`, `attributionMethod` (from attribution service)
  - `lastContactedAt`: Current timestamp

**Automatic CRM Interaction Logging:**
- Creates `CRMInteraction` with type 'NOTE':
  - `subject`: '🤝 Affiliate Application Submitted' or '🤝 Affiliate Application (Bonding Request)'
  - `body`: Formatted markdown with:
    - Applicant information
    - Marketing experience and audience
    - Platform list
    - Website and social media profiles
    - Bonding request details (if applicable)
    - Attribution information
    - Lead ID
  - `direction`: 'INBOUND'
  - `occurredAt`: Current timestamp

### Attribution Tracking
- Automatically detects and records attribution from:
  - Cookie data
  - Email matching
  - Phone matching
  - Direct (no attribution)
- Stores: `referrerUsername`, `referrerType`, `commissionRate`, `attributionMethod`, `attributionConfidence`

### Email Notifications
- **Admin Notification**: Queued (TODO: not yet implemented)
- **Applicant Confirmation**: Queued (TODO: not yet implemented)
- **Preparer Notification**: If bonding request, notified (TODO: not yet implemented)

### Post-Submission UX Flow
1. Application submitted
2. Success page with:
   - Checkmark icon indicating success
   - "Application Submitted!" message
   - Next steps (email confirmation, team review, login credentials)
   - If bonding: preparer review status

### Test Data Example
```json
{
  "firstName": "Emily",
  "lastName": "Rodriguez",
  "email": "emily.rodriguez@example.com",
  "phone": "(678) 555-9999",
  "experience": "5 years in digital marketing",
  "audience": "Small business owners and entrepreneurs",
  "platforms": ["Facebook", "Instagram", "YouTube"],
  "website": "https://emilysblog.com",
  "socialMedia": {
    "facebook": "facebook.com/emilyrodriguez",
    "instagram": "@emilyrodriguez",
    "youtube": "youtube.com/@emilyrodriguez"
  },
  "message": "I have a strong following of entrepreneurs and would love to share tax services with them.",
  "agreeToTerms": true,
  "bondToPreparerUsername": "johnsmith"
}
```

---

## Form 4: Customer Lead Form (Form 7)

### Form Location
- **Component**: `/src/components/SimpleTaxForm.tsx`
- **Page Route**: `/start-filing/form`
- **Form Type**: Tax Intake Form (Multi-page progressive form)

### API Endpoint
```
POST /api/tax-intake/lead
```

### Required Fields (Request Body)

#### Personal Information (Page 1-2)
```json
{
  "first_name": "string (required)",
  "middle_name": "string (optional)",
  "last_name": "string (required)",
  "email": "string (required, valid email)",
  "phone": "string (required, valid phone)",
  "country_code": "string (optional, default '+1')"
}
```

#### Address Information (Page 2-3)
```json
{
  "address_line_1": "string (required)",
  "address_line_2": "string (optional)",
  "city": "string (required)",
  "state": "string (required, e.g., 'GA')",
  "zip_code": "string (required, e.g., '30315')"
}
```

#### Identity Information (Page 3-4)
```json
{
  "date_of_birth": "string (optional, date format YYYY-MM-DD)",
  "ssn": "string (optional, format: XXX-XX-XXXX)"
}
```

#### Tax Filing Information (Page 4-6)
```json
{
  "filing_status": "string (optional) - Options: 'Single', 'Married filing jointly', 'Married filing separately', 'Head of House Hold', 'Qualifying widow(er) with dependent child'",
  "employment_type": "string (optional) - Options: 'W2', '1099', 'Both'",
  "occupation": "string (optional)",
  "claimed_as_dependent": "'yes' | 'no' (optional)"
}
```

#### Education & Dependents (Page 5-8)
```json
{
  "in_college": "'yes' | 'no' (optional)",
  "has_dependents": "'yes' | 'none' (optional)",
  "number_of_dependents": "string (conditional - required if has_dependents === 'yes')",
  "dependents_under_24_student_or_disabled": "'yes' | 'no' (optional)",
  "dependents_in_college": "'yes' | 'no' (optional)",
  "child_care_provider": "'yes' | 'no' (optional)"
}
```

#### Property & Tax Info (Page 6-7)
```json
{
  "has_mortgage": "'yes' | 'no' (optional)",
  "denied_eitc": "'yes' | 'no' (optional)",
  "has_irs_pin": "'yes' | 'no' | 'yes_locate' (optional)",
  "irs_pin": "string (conditional - required if has_irs_pin === 'yes')"
}
```

#### Refund & Identity (Page 8-9)
```json
{
  "wants_refund_advance": "'yes' | 'no' (optional)",
  "drivers_license": "string (optional, e.g., 'DL123456789')",
  "license_expiration": "string (optional, date format YYYY-MM-DD)",
  "license_file": "file (optional, not sent in JSON body)"
}
```

#### Complete Form Data
```json
{
  "full_form_data": "object (optional) - entire form data as JSON"
}
```

### Expected Response
```json
{
  "success": true,
  "leadId": "string (UUID)",
  "message": "Lead information saved successfully"
}
```

### Validation Rules
- Minimum required: `first_name`, `last_name`, `email`, `phone`
- At least address information must be provided for lead creation
- Date fields must be valid date format
- SSN format optional but if provided should be XXX-XX-XXXX
- `has_dependents` cannot have value without `number_of_dependents`
- `has_irs_pin === 'yes'` requires `irs_pin` value

### Partial Submissions
- Form supports saving partial submissions at page breaks
- Saves data after page 2/3 (after address information)
- Lead created even if not all pages completed

### CRM Integration
**Automatic CRM Contact Creation:**
- Creates `CRMContact` with:
  - `contactType`: 'LEAD'
  - `firstName`, `lastName`, `email`, `phone`
  - `stage`: 'NEW'
  - `source`: 'tax_intake_form'
  - `assignedPreparerId`: Based on referrer role (null if no referrer)
  - `filingStatus`, `dependents`, `taxYear`
  - `referrerUsername`, `referrerType`, `attributionMethod`
  - `lastContactedAt`: Current timestamp

**Automatic CRM Interaction Logging:**
- Creates `CRMInteraction` with type 'NOTE':
  - `subject`: '📋 Complete Tax Intake Form Submitted' or '📝 Tax Intake Form Started (Partial)'
  - `body`: Comprehensive formatted markdown with:
    - Personal information and address
    - Tax filing information
    - Dependent details
    - Attribution source and referrer
    - Lead ID
  - `direction`: 'INBOUND'
  - `occurredAt`: Current timestamp

### Attribution & Lead Assignment
- Detects referrer from URL parameter: `?ref=trackingCode`
- Supports tracking codes, custom codes, and shortLinkUsername
- **Smart Assignment Logic**:
  - If referred by CLIENT → Assign to Tax Genius corporate (null)
  - If referred by AFFILIATE → Assign to Tax Genius corporate (null)
  - If referred by TAX_PREPARER → Assign to that preparer
  - Otherwise → Assign to Tax Genius corporate (null)

### Email Notifications
- **If Complete Tax Intake**: Sends comprehensive email to assigned preparer with all details
- **If Partial Submission**: Sends basic lead notification to preparer
- Only sent if lead is assigned to specific preparer (not corporate)

### Journey Tracking
- Records stage: 'INTAKE_COMPLETED' in journey tracking system

### Post-Submission UX Flow (Unauthenticated Users)
1. Form completed
2. Thank you message displayed
3. Auto-redirect to signup with:
   - Email pre-filled
   - Hint: 'tax_client'
   - Redirect to referral dashboard after signup

### Post-Submission UX Flow (Authenticated Users)
1. Form completed
2. Redirect to client dashboard with referral tab
3. Option to get referral link and start earning

### Test Data Example
```json
{
  "first_name": "Michael",
  "middle_name": "James",
  "last_name": "Anderson",
  "email": "michael.anderson@example.com",
  "phone": "(404) 555-2222",
  "country_code": "+1",
  "address_line_1": "456 Oak Avenue",
  "address_line_2": "Suite 200",
  "city": "Atlanta",
  "state": "GA",
  "zip_code": "30305",
  "date_of_birth": "1985-06-15",
  "ssn": "123-45-6789",
  "filing_status": "Married filing jointly",
  "employment_type": "W2",
  "occupation": "Software Engineer",
  "claimed_as_dependent": "no",
  "in_college": "no",
  "has_dependents": "yes",
  "number_of_dependents": "2",
  "dependents_under_24_student_or_disabled": "yes",
  "dependents_in_college": "no",
  "child_care_provider": "yes",
  "has_mortgage": "yes",
  "denied_eitc": "no",
  "has_irs_pin": "no",
  "irs_pin": "",
  "wants_refund_advance": "yes",
  "drivers_license": "DL987654321",
  "license_expiration": "2026-12-31"
}
```

---

## Form 5: Preparer Lead Form (Form 8)

### Form Location
- **API Only** (No UI component found - used for external integrations/testing)
- **Lead Type**: Professional Tax Preparer Lead/Inquiry

### API Endpoint
```
POST /api/leads/preparer
```

### Required Fields (Request Body)
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required, valid email)",
  "phone": "string (required, min 10 digits)",
  "ptin": "string (required) - Preparer Tax Identification Number",
  "certification": "string (optional) - e.g., 'CPA', 'EA', 'Enrolled Agent'",
  "experience": "string (optional) - Years/description of experience",
  "message": "string (optional) - Additional information or inquiry",
  "utmSource": "string (optional)",
  "utmMedium": "string (optional)",
  "utmCampaign": "string (optional)"
}
```

### Expected Response
```json
{
  "success": true,
  "message": "Application received! Our team will review your credentials within 24-48 hours.",
  "leadId": "string (UUID)"
}
```

### Validation Rules
- All 4 core fields required: firstName, lastName, email, phone
- Email must be valid format
- Phone must be at least 10 digits
- PTIN is required and must be provided

### CRM Integration
**Automatic CRM Contact Creation:**
- Creates `CRMContact` with:
  - `contactType`: 'PREPARER'
  - `firstName`, `lastName`, `email`, `phone`
  - `stage`: 'NEW'
  - `source`: 'preparer_lead_form'
  - Attribution fields: `referrerUsername`, `referrerType`, `attributionMethod`, `attributionConfidence`
  - `lastContactedAt`: Current timestamp

**Automatic CRM Interaction Logging:**
- Creates `CRMInteraction` with type 'NOTE':
  - `subject`: '👔 Tax Preparer Lead Inquiry'
  - `body`: Formatted markdown with:
    - Contact information
    - Professional details (PTIN, certification, experience)
    - Message content
    - Attribution information
    - UTM parameters (if provided)
    - Lead ID
  - `direction`: 'INBOUND'
  - `occurredAt`: Current timestamp

### Attribution Tracking
- Auto-detects from cookies, email, phone
- Records: `referrerUsername`, `referrerType`, `commissionRate`, `attributionMethod`, `attributionConfidence`

### Email Notifications
- **Admin Notification**: Queued (TODO: not yet implemented)
- **Applicant Confirmation**: Queued (TODO: not yet implemented)

### Test Data Example
```json
{
  "firstName": "James",
  "lastName": "Peterson",
  "email": "james.peterson@example.com",
  "phone": "(770) 555-3333",
  "ptin": "P12345678",
  "certification": "CPA",
  "experience": "10 years in tax preparation",
  "message": "Interested in joining the Tax Genius team and building a client base.",
  "utmSource": "linkedin",
  "utmMedium": "social",
  "utmCampaign": "tax-professionals"
}
```

---

## Form 6: Affiliate Lead Form (Form 9)

### Form Location
- **API Only** (No UI component found - used for external integrations/testing)
- **Lead Type**: Affiliate Marketing Professional Lead/Inquiry

### API Endpoint
```
POST /api/leads/affiliate
```

### Required Fields (Request Body)
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required, valid email)",
  "phone": "string (required, min 10 digits)",
  "experience": "string (optional) - Marketing/affiliate experience",
  "audience": "string (optional) - Target audience description",
  "message": "string (optional) - Additional information or inquiry",
  "utmSource": "string (optional)",
  "utmMedium": "string (optional)",
  "utmCampaign": "string (optional)"
}
```

### Expected Response
```json
{
  "success": true,
  "message": "Thank you! We've received your information and will contact you within 24 hours.",
  "leadId": "string (UUID)"
}
```

### Validation Rules
- All 4 core fields required: firstName, lastName, email, phone
- Email must be valid format
- Phone must be at least 10 digits

### CRM Integration
**Automatic CRM Contact Creation:**
- Creates `CRMContact` with:
  - `contactType`: 'AFFILIATE'
  - `firstName`, `lastName`, `email`, `phone`
  - `stage`: 'NEW'
  - `source`: 'affiliate_lead_form'
  - Attribution fields: `referrerUsername`, `referrerType`, `attributionMethod`, `attributionConfidence`
  - `lastContactedAt`: Current timestamp

**Automatic CRM Interaction Logging:**
- Creates `CRMInteraction` with type 'NOTE':
  - `subject`: '🤝 Affiliate Lead Inquiry'
  - `body`: Formatted markdown with:
    - Contact information
    - Marketing details (experience, audience)
    - Message content
    - Attribution information
    - UTM parameters (if provided)
    - Lead ID
  - `direction`: 'INBOUND'
  - `occurredAt`: Current timestamp

### Attribution Tracking
- Auto-detects from cookies, email, phone
- Records: `referrerUsername`, `referrerType`, `commissionRate`, `attributionMethod`, `attributionConfidence`

### Email Notifications
- **Admin Notification**: Queued (TODO: not yet implemented)
- **Applicant Confirmation**: Queued (TODO: not yet implemented)

### Test Data Example
```json
{
  "firstName": "Jessica",
  "lastName": "Wilson",
  "email": "jessica.wilson@example.com",
  "phone": "(404) 555-7777",
  "experience": "8 years in content marketing and influencer partnerships",
  "audience": "Entrepreneurs and side-hustle seekers",
  "message": "I have a large email list of small business owners interested in tax solutions.",
  "utmSource": "instagram",
  "utmMedium": "social",
  "utmCampaign": "affiliate-recruitment"
}
```

---

## Common Features Across All Forms

### Request Metadata Captured
- IP Address (from x-forwarded-for, x-real-ip, cf-connecting-ip headers)
- User Agent (browser and OS detection)
- Referrer URL
- UTM Parameters (source, medium, campaign, term, content)

### Standard Response Format
```json
{
  "success": boolean,
  "message": "string",
  "leadId": "string (UUID, if applicable)",
  "applicationId": "string (UUID, if applicable)",
  "referralCode": "string (if referral form)"
}
```

### Error Response Format
```json
{
  "error": "string (error message)",
  "details": "string or object (validation details if applicable)"
}
```

### HTTP Status Codes
- **200**: Successful GET request
- **201**: Successful POST request (lead/application created)
- **400**: Bad Request (validation error)
- **409**: Conflict (duplicate email/application)
- **500**: Server error

### Database Tables Involved
- `PreparerApplication` (Form 4)
- `ReferrerApplication` (Form 5)
- `Lead` (Forms 3, 5, 6)
- `TaxIntakeLead` (Form 7)
- `CRMContact` (All forms)
- `CRMInteraction` (All forms)

### Common Validation Helpers
- Email validation: Standard email regex
- Phone validation: Min 10 digits
- URL validation: Valid HTTP/HTTPS URL
- Date validation: YYYY-MM-DD format

---

## Implementation Notes

### CRM Integration Pattern
All forms implement the same CRM integration pattern:
1. Primary form data saved to specific table
2. CRMContact created/updated with upsert (email as key)
3. CRMInteraction created to log the submission
4. Email notifications queued (some not yet implemented)

### Attribution Service
All lead forms use unified attribution service:
- Checks cookies first
- Falls back to email matching
- Falls back to phone matching
- Defaults to direct if no match
- Records method and confidence level

### Error Handling
- Validation errors return 400 with detailed field errors
- Database errors return 500 with generic message
- Duplicate entries return 409 Conflict
- CRM integration failures logged but don't block lead creation

---

