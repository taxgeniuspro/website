#!/bin/bash

################################################################################
# Console.log Replacement Script
#
# This script helps find and optionally replace console.log statements with
# the proper logger from @/lib/logger
#
# Usage:
#   ./scripts/replace-console-log.sh         # Show report only
#   ./scripts/replace-console-log.sh --fix   # Actually replace (creates backup)
################################################################################

set -euo pipefail

readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color

FIX_MODE=false

if [[ "${1:-}" == "--fix" ]]; then
    FIX_MODE=true
fi

echo ""
echo "========================================"
echo "  Console.log Analysis & Replacement"
echo "========================================"
echo ""

# Find all console.log, console.info, console.debug statements in src directory
# Exclude console.warn and console.error (those are allowed)

echo -e "${BLUE}Searching for console statements in src/...${NC}"
echo ""

# Count different types
LOG_COUNT=$(grep -r "console\.log(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo 0)
INFO_COUNT=$(grep -r "console\.info(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo 0)
DEBUG_COUNT=$(grep -r "console\.debug(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo 0)

TOTAL=$((LOG_COUNT + INFO_COUNT + DEBUG_COUNT))

echo "Found console statements:"
echo "  console.log:   $LOG_COUNT"
echo "  console.info:  $INFO_COUNT"
echo "  console.debug: $DEBUG_COUNT"
echo "  ─────────────────"
echo "  TOTAL:         $TOTAL"
echo ""

if [ $TOTAL -eq 0 ]; then
    echo -e "${GREEN}✓ No console statements found!${NC}"
    echo ""
    exit 0
fi

# Show top files with console statements
echo -e "${YELLOW}Top files with console statements:${NC}"
echo ""
grep -r "console\.\(log\|info\|debug\)(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | \
    cut -d: -f1 | sort | uniq -c | sort -rn | head -10 | \
    awk '{printf "  %3d  %s\n", $1, $2}'
echo ""

if [ "$FIX_MODE" = false ]; then
    echo -e "${BLUE}Preview mode${NC} - No files will be modified"
    echo ""
    echo "To replace console statements with logger, run:"
    echo "  ./scripts/replace-console-log.sh --fix"
    echo ""
    echo "This will:"
    echo "  1. Create .backup files for all modified files"
    echo "  2. Add logger import if needed"
    echo "  3. Replace console.log → logger.info"
    echo "  4. Replace console.info → logger.info"
    echo "  5. Replace console.debug → logger.debug"
    echo ""
    exit 0
fi

# FIX MODE
echo -e "${YELLOW}⚠ FIX MODE ENABLED${NC}"
echo ""
echo "This will modify files. Backups will be created (.backup extension)"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Processing files..."
echo ""

MODIFIED_COUNT=0

# Find all TypeScript files with console statements
while IFS= read -r file; do
    # Skip if file doesn't exist
    [ ! -f "$file" ] && continue

    # Check if file has console statements
    if ! grep -q "console\.\(log\|info\|debug\)(" "$file" 2>/dev/null; then
        continue
    fi

    echo -e "${BLUE}Processing:${NC} $file"

    # Create backup
    cp "$file" "$file.backup"

    # Check if logger import already exists
    if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
        # Add logger import at the top (after other imports)
        # Find the last import line
        LAST_IMPORT_LINE=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)

        if [ -n "$LAST_IMPORT_LINE" ]; then
            # Insert after last import
            sed -i "${LAST_IMPORT_LINE}a\\import { logger } from '@/lib/logger';" "$file"
        else
            # No imports found, add at top
            sed -i "1i\\import { logger } from '@/lib/logger';\n" "$file"
        fi
    fi

    # Replace console statements
    sed -i 's/console\.log(/logger.info(/g' "$file"
    sed -i 's/console\.info(/logger.info(/g' "$file"
    sed -i 's/console\.debug(/logger.debug(/g' "$file"

    MODIFIED_COUNT=$((MODIFIED_COUNT + 1))
    echo -e "  ${GREEN}✓${NC} Modified (backup: $file.backup)"
done < <(grep -rl "console\.\(log\|info\|debug\)(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)

echo ""
echo -e "${GREEN}✓ Replacement complete!${NC}"
echo ""
echo "Summary:"
echo "  Files modified: $MODIFIED_COUNT"
echo "  Backups created: $MODIFIED_COUNT (.backup files)"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test application: npm run dev"
echo "  3. Run linter: npm run lint"
echo "  4. Remove backups: find src -name '*.backup' -delete"
echo ""
echo -e "${YELLOW}Note:${NC} Some console statements might need manual adjustment"
echo "       for complex formatting or multi-line arguments."
echo ""
