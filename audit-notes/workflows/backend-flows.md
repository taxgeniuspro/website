# Backend Flows Audit

## API Endpoints to Verify

---

## 1. Authentication APIs

### Endpoints
- `POST /api/auth/signup` - Registration
- `POST /api/auth/callback/credentials` - Login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Get session

### Checklist

- [ ] Input validation
- [ ] Proper error responses
- [ ] Rate limiting
- [ ] Secure password handling

### Issues Found
*To be populated during audit*

---

## 2. Contact/Lead APIs

### Endpoints
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `GET /api/contacts/[id]` - Get contact
- `PUT /api/contacts/[id]` - Update contact
- `DELETE /api/contacts/[id]` - Delete contact

### Checklist

- [ ] Authorization checks
- [ ] Only see own contacts (preparer)
- [ ] Admin sees all
- [ ] Input validation
- [ ] Proper error responses

### Issues Found
*To be populated during audit*

---

## 3. Intake Form APIs

### Endpoints
- `POST /api/intake` - Submit intake
- `GET /api/intake/[id]` - Get intake

### Checklist

- [ ] Input validation
- [ ] Tracking attribution preserved
- [ ] Notification triggered
- [ ] Proper error responses

### Issues Found
*To be populated during audit*

---

## 4. Appointment APIs

### Endpoints
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/[id]` - Get appointment
- `PUT /api/appointments/[id]` - Update appointment

### Checklist

- [ ] Authorization checks
- [ ] Availability validation
- [ ] Confirmation email triggered
- [ ] Proper error responses

### Issues Found
*To be populated during audit*

---

## 5. Payout/Payment APIs

### Endpoints
- `GET /api/payouts` - List payouts
- `POST /api/payouts` - Log payout
- `GET /api/payouts/[id]` - Get payout

### Checklist

- [ ] Authorization checks
- [ ] Input validation
- [ ] Only see relevant payouts
- [ ] Proper error responses

### Issues Found
*To be populated during audit*

---

## Files to Review

- `/src/app/api/` - All API routes
- `/src/lib/` - Business logic
