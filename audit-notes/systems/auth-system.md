# Authentication System Audit

## Overview
**Status**: 🟡 Good with gaps
**Rating**: 7.5/10

**Provider**: NextAuth.js v5
**Session Type**: JWT (30-day duration)
**Providers**: Credentials, Google OAuth, Magic Link (Resend)

---

## Strengths

- Strong password validation (8+ chars, uppercase, lowercase, numbers, special chars)
- Case-insensitive email handling prevents duplicate accounts
- Transaction-based user creation ensures data consistency
- Automatic profile creation with tracking code assignment
- Email enumeration protection via generic error messages
- Secure state token signing with HMAC-SHA256
- Role refresh on every JWT ensures permission updates work immediately
- Account suspension checks in signIn callback
- Proper bcryptjs hashing (12 rounds)

---

## Critical Issues

### CRITICAL-1: No Email Verification on Signup
- **Problem**: Users can sign up and access features without verifying email
- **Impact**: Invalid emails, deliverability issues, security concern
- **Current**: `emailVerified` only set for OAuth/password reset
- **Fix**: Send verification email on signup, require before full access

### CRITICAL-2: No Rate Limiting on Signup Endpoint
- **File**: `/src/app/api/auth/signup/route.ts`
- **Problem**: No rate limiting despite being exposed to anonymous users
- **Impact**: Allows rapid spam account creation
- **Fix**: Add `authRateLimit` check (already defined but unused)

### CRITICAL-3: No Rate Limiting on Forgot-Password
- **File**: `/src/app/api/auth/forgot-password/route.ts`
- **Problem**: Can spam reset emails to any address
- **Impact**: Email flooding, API quota exhaustion
- **Fix**: Add rate limiting per IP/email

---

## High Priority Issues

### HIGH-1: No Failed Login Tracking
- **Problem**: No logging of failed login attempts
- **Impact**: Can't detect brute force attacks
- **Fix**: Log failed attempts, implement account lockout after N failures

### HIGH-2: Weak Password Validation in Setup-Password
- **File**: `/src/app/api/auth/setup-password/route.ts`
- **Problem**: Only validates min length (8 chars), not full strength
- **Impact**: Weaker passwords allowed in password reset
- **Fix**: Use same validation as signup

### HIGH-3: No Session Revocation Mechanism
- **Problem**: Once JWT issued, can't revoke until expiration (30 days)
- **Impact**: Can't force logout compromised accounts
- **Fix**: Implement session blacklist in Redis

### HIGH-4: No Frontend RBAC on Routes
- **Problem**: `/dashboard/admin/*` pages accessible if JWT compromised
- **Impact**: Admin UI visible to unauthorized users (API would block)
- **Fix**: Add role checks in middleware.ts

---

## Medium Priority Issues

### MED-1: JWT Callback DB Query on Every Request
- **Problem**: Every page view queries database for role refresh
- **Impact**: Performance issue at scale
- **Recommendation**: Cache role in Redis with 5-min TTL

### MED-2: No Session Expiration Warning
- **Problem**: 30-day sessions expire without warning
- **Impact**: Users may be mid-action when session expires
- **Fix**: Add session refresh on activity, 5-min warning

### MED-3: Duplicate Password Reset Tokens
- **Problem**: Can request multiple reset tokens (both valid)
- **Fix**: Invalidate old tokens when new one requested

---

## Low Priority Issues

### LOW-1: Password Error Shows Only First Error
- Shows single error, not all requirements at once

### LOW-2: Magic Link Token Length Not Validated
- 64-char token not checked before DB lookup

### LOW-3: Error Logging Missing Request Context
- No IP, user agent in error logs

---

## Security Checklist

| Check | Status |
|-------|--------|
| Passwords hashed (bcrypt) | ✅ 12 rounds |
| Generic login errors | ✅ "Invalid email or password" |
| Rate limiting on login | ⚠️ Defined but usage unclear |
| Rate limiting on signup | ❌ Not implemented |
| Rate limiting on reset | ❌ Not implemented |
| Email verification | ❌ Not implemented |
| Session timeout | ✅ 30 days |
| Secure cookies | ✅ HttpOnly, Secure flags |
| CSRF protection | ✅ HMAC-signed state tokens |
| OAuth email linking | ✅ Safe (Google verifies email) |
| Account lockout | ❌ Not implemented |
| Session revocation | ❌ Not implemented |

---

## Comparison vs HubSpot

| Feature | HubSpot | Tax Genius Pro |
|---------|---------|----------------|
| Password strength | 8+ chars | ✓ Exceeds |
| Email verification | Required | ✗ Missing |
| Rate limiting | 5/min login | ⚠️ Lenient |
| Session timeout | 24 hours | ⚠️ 30 days |
| Brute force protection | Account lockout | ✗ Missing |
| MFA support | Optional 2FA | ✗ Missing |
| Password reset token | 24 hour expiry | ✓ 1 hour (tighter) |

---

## Files Reviewed

- `/src/lib/auth.ts` - NextAuth configuration
- `/src/app/api/auth/signup/route.ts` - Registration
- `/src/app/api/auth/forgot-password/route.ts` - Password reset
- `/src/app/api/auth/setup-password/route.ts` - Password setup
- `/src/lib/rate-limit.ts` - Rate limiting (defined)
- `/src/lib/hmac.ts` - State token signing

---

## Recommendations

### This Week
1. Add rate limiting to signup endpoint
2. Add rate limiting to forgot-password endpoint
3. Extract password validation to shared utility

### This Month
1. Implement email verification requirement
2. Add failed login attempt tracking
3. Add frontend RBAC in middleware

### This Quarter
1. Implement session revocation
2. Optimize JWT callback with Redis caching
3. Consider optional 2FA support
