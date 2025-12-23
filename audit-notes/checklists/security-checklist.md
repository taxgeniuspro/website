# Security Audit Checklist

## Authentication

### Password Security
- [ ] Passwords hashed (bcrypt)
- [ ] Min length enforced (8+)
- [ ] Complexity requirements
- [ ] No plain text storage
- [ ] No passwords in logs

### Session Security
- [ ] Secure cookie flags (HttpOnly, Secure, SameSite)
- [ ] Session expiration (30 days)
- [ ] Session invalidation on password change
- [ ] Session invalidation on logout

### Login Security
- [ ] Rate limiting on login
- [ ] Generic error messages (no enumeration)
- [ ] Account lockout after failures
- [ ] Brute force protection

---

## Authorization

### Route Protection
- [ ] All protected routes check auth
- [ ] Role-based access enforced
- [ ] Admin routes check admin role
- [ ] Preparer routes check preparer role

### API Protection
- [ ] Every endpoint checks authentication
- [ ] Every endpoint checks authorization
- [ ] Can't access others' data via URL manipulation
- [ ] Server-side checks (not just client)

### Data Access
- [ ] Preparers only see their contacts
- [ ] Affiliates only see their referrals
- [ ] Clients only see their data
- [ ] Admin can see all (authorized)

---

## Input Validation

### Client-Side
- [ ] Form validation present
- [ ] Type checking
- [ ] Format validation (email, phone)

### Server-Side
- [ ] All inputs validated
- [ ] Type coercion handled
- [ ] Unexpected fields rejected
- [ ] Size limits enforced

### Database
- [ ] SQL injection prevented (Prisma parameterized)
- [ ] NoSQL injection prevented
- [ ] ORM used properly

---

## Output Security

### XSS Prevention
- [ ] User input escaped in HTML
- [ ] React auto-escaping used
- [ ] dangerouslySetInnerHTML avoided
- [ ] Content-Security-Policy header

### Data Exposure
- [ ] No sensitive data in frontend bundle
- [ ] No API keys in client code
- [ ] No debug info in production errors
- [ ] No stack traces to users

---

## Sensitive Data

### PII Handling
- [ ] SSN encrypted at rest (if stored)
- [ ] Personal data access logged
- [ ] Data retention policy
- [ ] Deletion actually deletes

### Secrets Management
- [ ] API keys in environment variables
- [ ] No secrets in code
- [ ] No secrets in git
- [ ] Secrets rotated periodically

---

## Communication Security

### HTTPS
- [ ] All traffic over HTTPS
- [ ] HTTP redirects to HTTPS
- [ ] HSTS header set
- [ ] No mixed content

### API Security
- [ ] CORS configured properly
- [ ] CSRF protection
- [ ] Rate limiting

---

## Logging & Monitoring

### Audit Logging
- [ ] Authentication events logged
- [ ] Authorization failures logged
- [ ] Sensitive actions logged
- [ ] No sensitive data in logs

### Error Handling
- [ ] Errors caught gracefully
- [ ] Generic messages to users
- [ ] Detailed logs for debugging
- [ ] No stack traces exposed

---

## Issues Found
*To be populated during audit*

---

## Files to Review

- `/src/lib/auth.ts` - Auth configuration
- `/src/middleware.ts` - Route protection
- `/src/lib/permissions.ts` - Authorization
- `/src/app/api/` - API routes
- `.env` - Environment variables
