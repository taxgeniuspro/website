#!/bin/bash

################################################################################
# Quick Improvements Script
#
# Implements easy wins from the site audit report
# Run this to get quick improvements with minimal effort
################################################################################

set -euo pipefail

readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  TaxGeniusPro Quick Improvements"
echo "========================================"
echo ""

# Track improvements
IMPROVEMENTS=0

# 1. Remove unused dependencies
echo -e "${BLUE}[1/5]${NC} Checking for unused dependencies..."
if npm list pdfjs-dist react-pdf &>/dev/null; then
    echo -e "${YELLOW}  Found unused dependencies${NC}"
    read -p "  Remove pdfjs-dist and react-pdf? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm uninstall pdfjs-dist react-pdf
        echo -e "${GREEN}  ✓ Removed unused dependencies${NC}"
        ((IMPROVEMENTS++))
    fi
else
    echo -e "${GREEN}  ✓ No unused dependencies found${NC}"
fi
echo ""

# 2. Update dependencies
echo -e "${BLUE}[2/5]${NC} Checking for dependency updates..."
OUTDATED_COUNT=$(npm outdated 2>/dev/null | wc -l || echo "0")
if [ "$OUTDATED_COUNT" -gt "1" ]; then
    echo -e "${YELLOW}  Found $OUTDATED_COUNT outdated packages${NC}"
    read -p "  Update non-breaking changes? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm update
        echo -e "${GREEN}  ✓ Updated dependencies${NC}"
        ((IMPROVEMENTS++))
    fi
else
    echo -e "${GREEN}  ✓ Dependencies are up to date${NC}"
fi
echo ""

# 3. Fix security vulnerabilities
echo -e "${BLUE}[3/5]${NC} Checking for security vulnerabilities..."
VULN_COUNT=$(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.total' || echo "0")
if [ "$VULN_COUNT" -gt "0" ]; then
    echo -e "${YELLOW}  Found $VULN_COUNT vulnerabilities${NC}"
    read -p "  Run npm audit fix? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm audit fix
        echo -e "${GREEN}  ✓ Fixed security vulnerabilities${NC}"
        ((IMPROVEMENTS++))
    fi
else
    echo -e "${GREEN}  ✓ No security vulnerabilities${NC}"
fi
echo ""

# 4. Clean up console.log statements
echo -e "${BLUE}[4/5]${NC} Checking for console.log statements..."
CONSOLE_COUNT=$(grep -r "console\." src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "console.warn\|console.error" | wc -l || echo "0")
if [ "$CONSOLE_COUNT" -gt "0" ]; then
    echo -e "${YELLOW}  Found $CONSOLE_COUNT console statements${NC}"
    read -p "  Replace with logger? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/replace-console-log.sh --fix <<< "y"
        echo -e "${GREEN}  ✓ Replaced console statements with logger${NC}"
        ((IMPROVEMENTS++))
    fi
else
    echo -e "${GREEN}  ✓ No console.log statements found${NC}"
fi
echo ""

# 5. Run code formatting
echo -e "${BLUE}[5/5]${NC} Formatting code..."
npm run format >/dev/null 2>&1
echo -e "${GREEN}  ✓ Code formatted${NC}"
((IMPROVEMENTS++))
echo ""

# Summary
echo "========================================"
if [ $IMPROVEMENTS -gt 0 ]; then
    echo -e "${GREEN}✓ Applied $IMPROVEMENTS improvements!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review changes: git diff"
    echo "  2. Test: npm run build"
    echo "  3. Deploy: ./scripts/deploy.sh"
else
    echo -e "${GREEN}✓ Code is already optimized!${NC}"
fi
echo "========================================"
echo ""
