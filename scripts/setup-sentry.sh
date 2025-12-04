#!/bin/bash

################################################################################
# Sentry Setup Helper Script
#
# This script helps you configure Sentry error tracking (100% FREE)
#
# Usage: ./scripts/setup-sentry.sh
################################################################################

set -euo pipefail

readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  Sentry Configuration Helper"
echo "========================================"
echo ""

# Check if Sentry is already configured
if grep -q "^NEXT_PUBLIC_SENTRY_DSN=https://" .env 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Sentry is already configured!"
    echo ""
    echo "Current configuration:"
    grep "SENTRY" .env | sed 's/=.*/=***HIDDEN***/'
    echo ""
    exit 0
fi

echo -e "${YELLOW}Sentry is not configured yet.${NC}"
echo ""
echo "Sentry provides FREE error tracking for your application:"
echo "  ✅ 5,000 errors/month (FREE forever)"
echo "  ✅ Email alerts for new errors"
echo "  ✅ Stack traces with line numbers"
echo "  ✅ Performance monitoring"
echo "  ✅ Session replay"
echo ""
echo "Follow these steps:"
echo ""
echo -e "${BLUE}Step 1:${NC} Create FREE Sentry Account"
echo "  → Open: https://sentry.io/signup/"
echo "  → Sign up with GitHub or Google"
echo ""
echo -e "${BLUE}Step 2:${NC} Create New Project"
echo "  → Select: 'Next.js'"
echo "  → Name: 'taxgeniuspro'"
echo ""
echo -e "${BLUE}Step 3:${NC} Copy Your Credentials"
echo "  You'll see a DSN like:"
echo "  https://xxxxxxxxxxxxx@xxxxx.ingest.sentry.io/xxxxx"
echo ""
read -p "Press ENTER when you're ready to input your Sentry credentials..."
echo ""

# Prompt for DSN
echo -e "${BLUE}Enter your SENTRY_DSN:${NC}"
echo "(Example: https://xxxxxxxxxxxxx@xxxxx.ingest.sentry.io/xxxxx)"
read -p "DSN: " SENTRY_DSN

# Validate DSN format
if [[ ! "$SENTRY_DSN" =~ ^https://.*@.*\.ingest\.sentry\.io/.* ]]; then
    echo -e "${RED}✗ Invalid DSN format${NC}"
    echo "DSN should start with: https:// and contain .ingest.sentry.io"
    exit 1
fi

# Prompt for Auth Token
echo ""
echo -e "${BLUE}Enter your SENTRY_AUTH_TOKEN:${NC}"
echo "To create token:"
echo "  → Go to: https://sentry.io/settings/account/api/auth-tokens/"
echo "  → Click 'Create New Token'"
echo "  → Select: 'Project Write' permission"
echo "  → Copy the token"
read -p "Auth Token: " SENTRY_AUTH_TOKEN

# Prompt for Organization
echo ""
echo -e "${BLUE}Enter your SENTRY_ORG:${NC}"
echo "(Your organization name from Sentry)"
read -p "Organization: " SENTRY_ORG

# Prompt for Project
echo ""
echo -e "${BLUE}Enter your SENTRY_PROJECT:${NC}"
echo "(Usually: taxgeniuspro)"
read -p "Project: " SENTRY_PROJECT

# Add to .env files
echo ""
echo "Adding Sentry configuration to .env files..."

# Backup existing .env
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Add to .env
cat >> .env <<EOF

# ==============================================================================
# SENTRY ERROR TRACKING (Added: $(date))
# ==============================================================================
NEXT_PUBLIC_SENTRY_DSN=${SENTRY_DSN}
SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
SENTRY_ORG=${SENTRY_ORG}
SENTRY_PROJECT=${SENTRY_PROJECT}
EOF

# Add to .env.local if it exists
if [ -f .env.local ]; then
    cat >> .env.local <<EOF

# ==============================================================================
# SENTRY ERROR TRACKING (Added: $(date))
# ==============================================================================
NEXT_PUBLIC_SENTRY_DSN=${SENTRY_DSN}
SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
SENTRY_ORG=${SENTRY_ORG}
SENTRY_PROJECT=${SENTRY_PROJECT}
EOF
fi

echo -e "${GREEN}✓ Sentry configuration added!${NC}"
echo ""
echo "Next steps:"
echo "  1. Rebuild your application: npm run build"
echo "  2. Deploy: ./scripts/deploy.sh"
echo "  3. Test error tracking by triggering a test error"
echo ""
echo -e "${BLUE}Test Sentry:${NC}"
echo "  Add this to any page to test:"
echo "  throw new Error('Sentry test error');"
echo ""
echo "Check your Sentry dashboard to see errors appear!"
echo ""
echo -e "${GREEN}Setup complete! 🎉${NC}"
echo ""
