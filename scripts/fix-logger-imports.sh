#!/bin/bash

# Script to fix broken logger imports where the import was inserted in the middle of another import statement
# This happens when the script inserts after a line like "import {" with no closing brace

echo "Fixing broken logger imports..."

# Find all files with the pattern "import {\nimport { logger"
FILES=$(grep -rl "^import {$" src --include="*.tsx" --include="*.ts" | xargs -I {} sh -c 'grep -A 1 "^import {$" {} | grep -q "import { logger" && echo {}')

FIXED=0

for file in $FILES; do
  # Check if file has the broken pattern
  if grep -Pzo "import \{\nimport \{ logger \} from '@/lib/logger'" "$file" > /dev/null 2>&1; then
    # Fix: Move logger import before the broken import statement
    perl -i -0pe "s/import \{\nimport \{ logger \} from '\@\/lib\/logger'\n/import { logger } from '\@\/lib\/logger'\nimport {\n/g" "$file"

    echo "Fixed: $file"
    ((FIXED++))
  fi
done

echo ""
echo "✅ Fixed $FIXED files"
