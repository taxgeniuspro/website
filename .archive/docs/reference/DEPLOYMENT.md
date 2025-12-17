# TaxGeniusPro Deployment Guide

**Version:** 1.0.0  
**Last Updated:** October 2025  
**Maintainer:** DevOps Team

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [First-Time Setup](#first-time-setup)
3. [Deployment Process](#deployment-process)
4. [Troubleshooting](#troubleshooting)
5. [Rollback Procedures](#rollback-procedures)
6. [Best Practices](#best-practices)
7. [Monitoring](#monitoring)

---

## Prerequisites

### System Requirements

- **Operating System:** Ubuntu 20.04+ or similar Linux distribution
- **Node.js:** Version 18.x or higher
- **npm:** Version 9.x or higher
- **PM2:** Version 5.x or higher (process manager)
- **Docker:** Version 24.x+ (for PostgreSQL and Redis containers)
- **Disk Space:** Minimum 5GB free space
- **Memory:** Minimum 2GB RAM (4GB recommended)

### Required Services

| Service | Port | Status Check |
|---------|------|--------------|
| PostgreSQL | 5436 | `docker ps \| grep taxgeniuspro-postgres` |
| Redis | 6305 | `docker ps \| grep taxgeniuspro-redis` |
| Ollama | 11434 | `curl http://localhost:11434` |

### Installing Prerequisites

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Verify installations
node --version    # Should be v18.x or higher
npm --version     # Should be 9.x or higher
pm2 --version     # Should be 5.x or higher
```

---

## First-Time Setup

### 1. Clone Repository (if not already done)

```bash
cd /root/websites
git clone <repository-url> taxgeniuspro
cd taxgeniuspro
```

### 2. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env
cp .env.example .env.local

# Edit environment files
nano .env
nano .env.local
```

**Required Variables to Set:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `CLERK_SECRET_KEY` - Authentication secret
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Authentication public key
- `RESEND_API_KEY` - Email service key

See `.env.example` for complete list and documentation.

### 3. Install Dependencies

```bash
npm ci --production=false
```

### 4. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# (Optional) Seed database with sample data
npx prisma db seed
```

### 5. First Deployment

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run initial deployment
./scripts/deploy.sh
```

---

## Deployment Process

### Standard Deployment

For regular updates and deployments:

```bash
cd /root/websites/taxgeniuspro
./scripts/deploy.sh
```

The deployment script will automatically:
1. ✅ Check prerequisites
2. ✅ Create backup of current deployment
3. ✅ Build the application
4. ✅ Copy environment files
5. ✅ Deploy to PM2
6. ✅ Verify deployment health
7. ✅ Rollback on failure

### Manual Deployment (Advanced)

If you need to deploy manually:

```bash
# 1. Build application
npm run build

# 2. Copy environment files to standalone
cp .env .env.local .next/standalone/

# 3. Copy static assets
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# 4. Deploy to PM2
pm2 stop taxgeniuspro || true
pm2 delete taxgeniuspro || true
PORT=3005 pm2 start .next/standalone/server.js --name taxgeniuspro
pm2 save

# 5. Verify deployment
curl http://localhost:3005/
```

### Deployment Checklist

Before deploying to production:

- [ ] All environment variables are set correctly
- [ ] Database migrations are up to date
- [ ] Build completes without errors
- [ ] All tests pass (if applicable)
- [ ] No console.log statements in code
- [ ] Dependencies are up to date
- [ ] Backup exists
- [ ] Monitoring is active

---

## Troubleshooting

### Issue: Website Returns HTTP 500 Errors

**Symptoms:**
- All pages return 500 Internal Server Error
- PM2 shows status as "online" but pages don't load

**Diagnosis:**
```bash
# Check error logs
pm2 logs taxgeniuspro --err --lines 50

# Common causes:
# 1. Missing environment variables
# 2. Missing .env files in standalone directory
# 3. Clerk authentication keys missing
```

**Fix:**
```bash
# Ensure environment files are in standalone directory
cp .env .env.local .next/standalone/
pm2 restart taxgeniuspro

# Check logs again
pm2 logs taxgeniuspro --lines 20
```

### Issue: PM2 Process Keeps Restarting

**Symptoms:**
- PM2 shows high restart count
- Application status flips between "online" and "errored"

**Diagnosis:**
```bash
# Check restart count and status
pm2 status taxgeniuspro

# View error logs
pm2 logs taxgeniuspro --err --lines 100
```

**Common Causes & Fixes:**

1. **Port Already in Use:**
   ```bash
   # Check what's using port 3005
   sudo lsof -i :3005
   
   # Kill conflicting process
   sudo kill -9 <PID>
   ```

2. **Memory Issues:**
   ```bash
   # Increase memory limit
   pm2 delete taxgeniuspro
   PORT=3005 pm2 start .next/standalone/server.js \
     --name taxgeniuspro \
     --max-memory-restart 1G
   pm2 save
   ```

3. **Missing Dependencies:**
   ```bash
   cd .next/standalone
   npm install --production
   ```

### Issue: Build Fails

**Symptoms:**
- `npm run build` command fails
- Deployment script stops at build step

**Common Causes:**

1. **TypeScript Errors:**
   ```bash
   # Check for type errors
   npx tsc --noEmit
   
   # Fix errors or disable type checking (not recommended)
   # In next.config.ts: typescript: { ignoreBuildErrors: true }
   ```

2. **ESLint Errors:**
   ```bash
   # Check for linting errors
   npm run lint
   
   # Auto-fix where possible
   npm run lint:fix
   ```

3. **Out of Memory:**
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

### Issue: Database Connection Fails

**Symptoms:**
- Prisma errors in logs
- "Can't reach database server" errors

**Fix:**
```bash
# Check if PostgreSQL container is running
docker ps | grep taxgeniuspro-postgres

# If not running, start it
docker start taxgeniuspro-postgres

# Test connection
npx prisma db pull

# Regenerate Prisma Client
npx prisma generate
```

### Issue: Redis Connection Fails

**Symptoms:**
- Redis connection errors in logs
- Rate limiting not working

**Fix:**
```bash
# Check if Redis container is running
docker ps | grep taxgeniuspro-redis

# If not running, start it
docker start taxgeniuspro-redis

# Test connection
redis-cli -p 6305 ping
# Should return: PONG
```

---

## Rollback Procedures

### Automatic Rollback

The deployment script includes automatic rollback on failure.

If deployment fails:
```
Deployment verification failed!
Attempt rollback? (y/n)
```

Type `y` to automatically rollback to the previous version.

### Manual Rollback

If you need to manually rollback:

```bash
# 1. List available backups
ls -lth /root/backups/taxgeniuspro/

# 2. Restore from backup
cd /root/websites/taxgeniuspro
tar -xzf /root/backups/taxgeniuspro/taxgeniuspro_TIMESTAMP.tar.gz

# 3. Restart PM2
pm2 restart taxgeniuspro

# 4. Verify
curl http://localhost:3005/
```

### Emergency Rollback

For critical issues:

```bash
# Quick rollback to last known good backup
cd /root/websites/taxgeniuspro
tar -xzf $(cat /tmp/taxgeniuspro_last_backup.txt)
pm2 restart taxgeniuspro
```

---

## Best Practices

### 1. Always Test Before Deploying

```bash
# Run in development mode first
npm run dev

# Test key functionality
# - Homepage loads
# - Authentication works
# - Database connections work
```

### 2. Deploy During Low-Traffic Hours

- Recommended: 2-4 AM EST (lowest traffic)
- Avoid: Monday mornings, end of month, tax deadlines

### 3. Monitor After Deployment

```bash
# Watch logs in real-time
pm2 logs taxgeniuspro

# Check application status
pm2 status taxgeniuspro

# Monitor system resources
pm2 monit
```

### 4. Keep Dependencies Updated

```bash
# Check for outdated packages
npm outdated

# Update non-breaking changes
npm update

# For major updates, test thoroughly first
npm install <package>@latest --save
```

### 5. Regular Backups

Automated backups are created during deployment, but also:

```bash
# Manual backup before major changes
tar -czf /root/backups/taxgeniuspro/manual_$(date +%Y%m%d_%H%M%S).tar.gz \
  .next .env .env.local
```

### 6. Security Practices

- Rotate API keys every 90 days
- Use different credentials for dev/staging/production
- Never commit `.env` files to version control
- Review access logs weekly
- Keep Node.js and dependencies updated

---

## Monitoring

### Health Checks

```bash
# Check application status
curl http://localhost:3005/

# Check PM2 status
pm2 status taxgeniuspro

# View recent logs
pm2 logs taxgeniuspro --lines 50

# Check system resources
pm2 monit
```

### Log Files

| Log Type | Location | Command |
|----------|----------|---------|
| Deployment | `/var/log/taxgeniuspro-deploy.log` | `tail -f /var/log/taxgeniuspro-deploy.log` |
| Application Out | `~/.pm2/logs/taxgeniuspro-out.log` | `pm2 logs taxgeniuspro --out` |
| Application Error | `~/.pm2/logs/taxgeniuspro-error.log` | `pm2 logs taxgeniuspro --err` |

### Performance Monitoring

```bash
# CPU and Memory usage
pm2 monit

# Detailed process info
pm2 describe taxgeniuspro

# Restart count (high count indicates issues)
pm2 status | grep restart
```

### Automated Monitoring Setup

```bash
# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Enable PM2 monitoring
pm2 install pm2-logrotate
```

---

## Quick Reference

### Common Commands

| Task | Command |
|------|---------|
| Deploy | `./scripts/deploy.sh` |
| View Logs | `pm2 logs taxgeniuspro` |
| Restart App | `pm2 restart taxgeniuspro` |
| Stop App | `pm2 stop taxgeniuspro` |
| App Status | `pm2 status taxgeniuspro` |
| Build Only | `npm run build` |
| Dev Mode | `npm run dev` |

### Emergency Contacts

- **DevOps Team:** devops@taxgeniuspro.tax
- **On-Call:** [Phone Number]
- **Escalation:** [Manager Contact]

### Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

---

**Last Updated:** October 2025  
**Document Version:** 1.0.0  
**Maintained By:** DevOps Team
