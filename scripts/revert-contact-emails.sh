#!/bin/bash

# ============================================================================
# Revert contact emails back to business emails
# ============================================================================

echo "Reverting contact emails back to business emails..."

# Replace iradwatkins@gmail.com with support@taxgeniuspro.tax (for support emails)
find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -exec grep -l "iradwatkins@gmail.com" {} \; | while read file; do
  # Check context to determine if it should be support@ or info@
  if grep -q "support\|Support\|help\|Help" "$file" 2>/dev/null; then
    sed -i 's/iradwatkins@gmail\.com/support@taxgeniuspro.tax/g' "$file"
  elif grep -q "info\|Info\|contact\|Contact" "$file" 2>/dev/null; then
    # Check if the line with iradwatkins mentions info specifically
    if grep "iradwatkins@gmail.com" "$file" | grep -q "info"; then
      sed -i 's/iradwatkins@gmail\.com/info@taxgeniuspro.tax/g' "$file"
    else
      sed -i 's/iradwatkins@gmail\.com/support@taxgeniuspro.tax/g' "$file"
    fi
  else
    # Default to support@
    sed -i 's/iradwatkins@gmail\.com/support@taxgeniuspro.tax/g' "$file"
  fi
done

echo "Done! All contact emails reverted to business emails."
echo ""
echo "Verification:"
echo "support@taxgeniuspro.tax references:"
grep -r "support@taxgeniuspro.tax" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l
echo "info@taxgeniuspro.tax references:"
grep -r "info@taxgeniuspro.tax" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l
echo "iradwatkins@gmail.com references (should be 0):"
grep -r "iradwatkins@gmail.com" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l
