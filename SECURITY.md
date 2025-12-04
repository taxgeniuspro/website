# 🔐 Security Policy

## Overview

This document outlines security practices, procedures, and recommendations for TaxGeniusPro.

---

## 🚨 CRITICAL SECURITY INCIDENT - November 6, 2025

### What Happened

An automated security audit revealed that **production API keys and credentials were exposed** in the `ecosystem.config.js` file. This file has been **secured** as of this security update.

### Exposed Credentials (NOW SECURED)

The following credentials were found hardcoded in `ecosystem.config.js`:

| Service | Credential Type | Exposure Risk | Action Required |
|---------|----------------|---------------|-----------------|
| PostgreSQL | Database Password | 🔴 CRITICAL | Rotate immediately |
| Clerk Auth | Secret Key | 🔴 CRITICAL | Rotate immediately |
| Gmail SMTP | App Password | 🔴 CRITICAL | Rotate immediately |
| Resend | API Key | 🔴 CRITICAL | Rotate immediately |
| Square Payments | Access Token | 🔴 CRITICAL | Rotate immediately |
| OpenAI | API Key | 🟡 HIGH | Rotate immediately |
| Google Gemini | API Key | 🟡 HIGH | Rotate immediately |
| VAPID Push | Private Key | 🟡 HIGH | Regenerate keys |
| FedEx | API Keys | 🟡 HIGH | Rotate immediately |

---

## ✅ IMMEDIATE ACTIONS TAKEN

### 1. Configuration Secured ✅
- `ecosystem.config.js` now uses `process.env` variables
- All hardcoded credentials removed
- File updated with proper security comments

### 2. Environment Template Updated ✅
- `.env.example` updated with all required variables
- Security documentation added
- Setup instructions provided

### 3. Git Ignore Enhanced ✅
- `.gitignore` explicitly excludes sensitive files
- PM2 logs and backups excluded
- `.env.example` explicitly allowed

---

## 🔑 REQUIRED: API Key Rotation

**YOU MUST ROTATE ALL THE FOLLOWING API KEYS IMMEDIATELY**

### Step 1: PostgreSQL Database Password

```bash
# 1. Connect to PostgreSQL
docker exec -it taxgeniuspro-postgres psql -U postgres

# 2. Change the password
ALTER USER taxgeniuspro_user WITH PASSWORD 'NEW_SECURE_PASSWORD_HERE';

# 3. Update your .env file
DATABASE_URL=postgresql://taxgeniuspro_user:NEW_SECURE_PASSWORD_HERE@localhost:5436/taxgeniuspro_db?schema=public

# 4. Restart the application
pm2 restart taxgeniuspro
```

### Step 2: Clerk Authentication Keys

1. Go to: https://dashboard.clerk.com/last-active?path=api-keys
2. Click "Regenerate" on your secret key
3. Copy the new secret key
4. Update `.env`:
   ```
   CLERK_SECRET_KEY=sk_test_NEW_KEY_HERE
   ```
5. Restart: `pm2 restart taxgeniuspro`

### Step 3: Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Revoke the old app password
3. Generate a new app-specific password
4. Update `.env`:
   ```
   GMAIL_APP_PASSWORD=new_app_password_here
   ```
5. Restart: `pm2 restart taxgeniuspro`

### Step 4: Resend API Key

1. Go to: https://resend.com/api-keys
2. Delete the old API key
3. Create a new API key
4. Update `.env`:
   ```
   RESEND_API_KEY=re_NEW_KEY_HERE
   ```
5. Restart: `pm2 restart taxgeniuspro`

### Step 5: Square Payment Access Token

1. Go to: https://developer.squareup.com/apps
2. Select your application
3. Go to "Credentials"
4. Click "Rotate" on your access token
5. Update `.env`:
   ```
   SQUARE_ACCESS_TOKEN=NEW_ACCESS_TOKEN_HERE
   ```
6. Restart: `pm2 restart taxgeniuspro`

### Step 6: OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Revoke the old API key
3. Create a new API key
4. Update `.env`:
   ```
   OPENAI_API_KEY=sk-proj-NEW_KEY_HERE
   ```
5. Restart: `pm2 restart taxgeniuspro`

### Step 7: Google Gemini API Key

1. Go to: https://aistudio.google.com/app/apikey
2. Delete the old API key
3. Create a new API key
4. Update `.env`:
   ```
   GEMINI_API_KEY=NEW_KEY_HERE
   ```
5. Restart: `pm2 restart taxgeniuspro`

### Step 8: VAPID Keys (PWA Push Notifications)

```bash
# Generate new VAPID keys
cd /root/websites/taxgeniuspro
npx web-push generate-vapid-keys

# Update .env with the new keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=NEW_PUBLIC_KEY
VAPID_PRIVATE_KEY=NEW_PRIVATE_KEY

# Restart
pm2 restart taxgeniuspro
```

### Step 9: FedEx API Keys

1. Go to: https://developer.fedex.com/
2. Navigate to your application
3. Regenerate API keys
4. Update `.env`:
   ```
   FEDEX_API_KEY=NEW_API_KEY
   FEDEX_SECRET_KEY=NEW_SECRET_KEY
   ```
5. Restart: `pm2 restart taxgeniuspro`

---

## 📋 Verification Checklist

After rotating all keys, verify everything works:

```bash
# 1. Restart PM2
pm2 restart taxgeniuspro

# 2. Check logs for errors
pm2 logs taxgeniuspro --lines 50

# 3. Test critical functionality
# - Authentication (login/signup)
# - Email sending
# - Payment processing (test mode)
# - Database connections
# - AI features

# 4. Monitor for errors
pm2 monit
```

---

## 🔒 Security Best Practices

### 1. Environment Variables

✅ **DO:**
- Store all secrets in `.env` files
- Use different credentials for dev/staging/production
- Use strong, unique passwords
- Limit API key permissions to minimum required

❌ **DON'T:**
- Hardcode credentials in source code
- Commit `.env` files to version control
- Share API keys via email or Slack
- Use the same password across services

### 2. API Key Management

**Key Rotation Schedule:**
- **Production secrets**: Every 90 days
- **Database passwords**: Every 180 days
- **After security incident**: Immediately
- **When team member leaves**: Immediately

**Access Control:**
- Use read-only API keys where possible
- Enable IP whitelisting when available
- Set rate limits on all API keys
- Monitor API key usage for anomalies

### 3. Database Security

```bash
# Use strong passwords (minimum requirements)
# - At least 16 characters
# - Mix of uppercase, lowercase, numbers, symbols
# - No dictionary words

# Good examples:
# - aB7$mK9!pL3@xN6#qR2*wT8^
# - Tr5!Xp$2Qm#9Kj@4Hn*7Vb^

# Bad examples:
# - password123
# - TaxGenius2024
# - admin
```

### 4. Git Security

```bash
# Before committing, always check:
git diff

# Search for potential secrets
git grep -i "password"
git grep -i "api_key"
git grep -i "secret"

# If you accidentally commit secrets:
# 1. Rotate the exposed keys immediately
# 2. Use git-filter-branch or BFG Repo-Cleaner to remove from history
# 3. Force push (if on private repo)
```

---

## 🔍 Security Monitoring

### Ongoing Monitoring

**Weekly:**
- Review PM2 logs for suspicious activity
- Check failed login attempts
- Monitor API usage and costs

**Monthly:**
- Review user permissions and roles
- Audit database access logs
- Check for outdated dependencies: `npm audit`
- Review rate limiting effectiveness

**Quarterly:**
- Rotate production API keys
- Security audit of codebase
- Penetration testing
- Review and update security policies

### Setting Up Alerts

```bash
# Monitor PM2 for crashes
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Set up error notifications (optional)
# Configure PM2 Keymetrics for real-time monitoring
```

---

## 🐛 Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. **DO NOT** discuss it in public channels
3. **DO** email: security@taxgeniuspro.tax
4. **DO** include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

**Response Time:**
- Critical vulnerabilities: 24 hours
- High severity: 72 hours
- Medium/Low severity: 1 week

---

## 📚 Additional Resources

### Recommended Reading
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/pages/building-your-application/configuring/security-headers)
- [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)

### Security Tools
- `npm audit` - Check for vulnerable dependencies
- `snyk` - Continuous security monitoring
- `dotenv-vault` - Secure environment variable management
- `git-secrets` - Prevent committing secrets

### Compliance
- **PCI DSS**: Required for payment processing
- **GDPR**: Required for EU customer data
- **SOC 2**: Recommended for enterprise customers
- **HIPAA**: Not applicable (we don't handle health data)

---

## 📝 Changelog

| Date | Action | By |
|------|--------|-----|
| 2025-11-06 | Initial security audit completed | Claude Code |
| 2025-11-06 | Hardcoded credentials removed | Claude Code |
| 2025-11-06 | Environment variable system implemented | Claude Code |
| 2025-11-06 | Security documentation created | Claude Code |

---

## ✅ Post-Rotation Verification

After rotating all keys, mark completed:

- [ ] PostgreSQL password rotated
- [ ] Clerk secret key rotated
- [ ] Gmail app password rotated
- [ ] Resend API key rotated
- [ ] Square access token rotated
- [ ] OpenAI API key rotated
- [ ] Gemini API key rotated
- [ ] VAPID keys regenerated
- [ ] FedEx API keys rotated
- [ ] All services tested and working
- [ ] `.env` file created with new values
- [ ] Old keys confirmed revoked
- [ ] Application restarted successfully
- [ ] Monitoring configured
- [ ] Team notified of changes

---

**Last Updated**: November 6, 2025
**Next Review**: February 6, 2026
**Document Owner**: Security Team
