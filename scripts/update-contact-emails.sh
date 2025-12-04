#!/bin/bash

# ============================================================================
# Update all contact emails to iradwatkins@gmail.com
# ============================================================================

echo "Updating contact emails to iradwatkins@gmail.com..."

# Replace support@taxgeniuspro.tax with iradwatkins@gmail.com
find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -exec sed -i 's/support@taxgeniuspro\.tax/iradwatkins@gmail.com/g' {} +

# Replace support@taxgeniuspro.com with iradwatkins@gmail.com
find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -exec sed -i 's/support@taxgeniuspro\.com/iradwatkins@gmail.com/g' {} +

# Replace info@taxgeniuspro.tax with iradwatkins@gmail.com
find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -exec sed -i 's/info@taxgeniuspro\.tax/iradwatkins@gmail.com/g' {} +

echo "Done! All contact emails updated."
echo ""
echo "Files modified:"
grep -r "iradwatkins@gmail.com" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l
echo " references to iradwatkins@gmail.com found."
