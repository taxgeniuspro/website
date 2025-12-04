#!/bin/bash

# Script to replace console.log/error/warn/debug with logger equivalents
# Usage: ./scripts/replace-console-with-logger.sh

echo "Replacing console statements with logger..."

# Find all TypeScript files
FILES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*")

UPDATED=0

for file in $FILES; do
  # Check if file contains console statements
  if grep -q "console\.\(log\|error\|warn\|debug\)" "$file"; then
    # Check if file already imports logger
    if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
      # Find the last import statement line
      LAST_IMPORT=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)

      if [ -n "$LAST_IMPORT" ]; then
        # Add logger import after the last import
        sed -i "${LAST_IMPORT}a import { logger } from '@/lib/logger'" "$file"
      else
        # No imports found, add at the top after 'use client' or 'use server' if present
        if grep -q "^'use \(client\|server\)'" "$file"; then
          sed -i "2a import { logger } from '@/lib/logger'" "$file"
        else
          sed -i "1i import { logger } from '@/lib/logger'" "$file"
        fi
      fi
    fi

    # Replace console statements
    sed -i "s/console\.log(/logger.info(/g" "$file"
    sed -i "s/console\.error(/logger.error(/g" "$file"
    sed -i "s/console\.warn(/logger.warn(/g" "$file"
    sed -i "s/console\.debug(/logger.debug(/g" "$file"

    echo "Updated: $file"
    ((UPDATED++))
  fi
done

echo ""
echo "✅ Updated $UPDATED files"
echo ""
echo "Remaining console statements:"
grep -r "console\.\(log\|error\|warn\|debug\)" src --include="*.ts" --include="*.tsx" | wc -l
