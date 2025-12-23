# Integration Flows Audit

## External Service Integrations

---

## 1. Resend (Email)

### Integration Points
- Registration emails
- Password reset
- Lead notifications
- Appointment confirmations
- Referral invitations

### Checklist

- [ ] API key configured
- [ ] From address verified
- [ ] Templates render correctly
- [ ] Delivery tracked
- [ ] Error handling

### Issues Found
*To be populated during audit*

---

## 2. Square (Payment Tracking)

### Integration Points
- Payment logging (if integrated)
- Transaction references

### Checklist

- [ ] API configured (if used)
- [ ] Proper error handling
- [ ] Secure credential storage

### Issues Found
*To be populated during audit*

---

## 3. Cloudinary (Images)

### Integration Points
- Avatar uploads
- QR code storage
- Marketing asset storage

### Checklist

- [ ] Upload works
- [ ] Proper file type validation
- [ ] Size limits enforced
- [ ] URLs accessible
- [ ] Secure signed URLs (if needed)

### Issues Found
*To be populated during audit*

---

## 4. Google OAuth

### Integration Points
- Login with Google
- Account linking

### Checklist

- [ ] OAuth flow works
- [ ] Proper scopes
- [ ] Account creation/linking
- [ ] Error handling

### Issues Found
*To be populated during audit*

---

## 5. Socket.io (Real-time)

### Integration Points
- Live notifications
- Real-time updates

### Checklist

- [ ] Connection established
- [ ] Events emitted correctly
- [ ] Client receives events
- [ ] Reconnection handling

### Issues Found
*To be populated during audit*

---

## Files to Review

- `/src/lib/services/` - Service integrations
- `.env` variables - API keys (check configured)
