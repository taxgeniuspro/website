#!/bin/bash
#
# Find remaining 'any' types in the codebase
# Usage: ./scripts/find-any-types.sh
#

echo "==================================="
echo "  FINDING REMAINING 'ANY' TYPES"
echo "==================================="
echo ""

echo "📝 Searching TypeScript files in src/..."
echo ""

# Find all 'any' types
echo "1️⃣  Explicit 'any' types:"
grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next" | head -20

echo ""
echo "2️⃣  'any' in angle brackets:"
grep -rn "<any>" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next" | head -20

echo ""
echo "3️⃣  'any' in arrays:"
grep -rn "any\[\]" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next" | head -20

echo ""
echo "==================================="
echo "  SUMMARY"
echo "==================================="

total_any=$(grep -r ": any\|<any>\|any\[\]" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next" | wc -l)
echo "Total 'any' types found: $total_any"

echo ""
echo "Run 'npm run lint' to see all type issues"
