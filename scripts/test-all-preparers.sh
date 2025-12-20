#!/bin/bash

# Test intake form submission for multiple tax preparers
# This script tests a sample of preparers to verify the system works for all

PREPARERS=("gw" "rh" "ah" "iw" "ge" "mf" "eb" "ds")
TIMESTAMP=$(date +%s)

echo "=============================================="
echo "TESTING INTAKE FORMS FOR MULTIPLE PREPARERS"
echo "=============================================="
echo ""

for CODE in "${PREPARERS[@]}"; do
  EMAIL="test-${CODE}-${TIMESTAMP}@multitest.com"

  echo "Testing preparer: $CODE"
  echo "  Email: $EMAIL"

  RESULT=$(curl -X POST "https://taxgeniuspro.tax/api/tax-intake/submit" \
    -F "preparer_code=${CODE}" \
    -F "first_name=Test${CODE}" \
    -F "middle_name=Multi" \
    -F "last_name=User${TIMESTAMP}" \
    -F "email=${EMAIL}" \
    -F "phone=470${RANDOM:0:3}${RANDOM:0:4}" \
    -F "address_line_1=123 Test St" \
    -F "city=Atlanta" \
    -F "state=GA" \
    -F "zip_code=30301" \
    -F "date_of_birth=1990-01-15" \
    -F "ssn=123-45-${RANDOM:0:4}" \
    -F "filing_status=single" \
    -F "employment_type=w2" \
    -F "occupation=Tester" \
    -F "has_dependents=no" \
    -F "has_mortgage=no" \
    -F "wants_refund_advance=yes" \
    -F "denied_eitc=no" \
    -F "has_irs_pin=no" \
    -F "drivers_license=GA${RANDOM}" \
    -F "license_expiration=2028-12-31" \
    -F "license_file=@/tmp/test-dl-image.jpg;type=image/jpeg" \
    -s 2>&1)

  # Parse result
  SUCCESS=$(echo "$RESULT" | grep -o '"success":true' | head -1)
  PDF=$(echo "$RESULT" | grep -o '"hasPdfAttachment":true' | head -1)
  FILE=$(echo "$RESULT" | grep -o '"fileUploaded":true' | head -1)

  if [ -n "$SUCCESS" ] && [ -n "$PDF" ] && [ -n "$FILE" ]; then
    echo "  ✅ PASSED (success + PDF + image)"
  else
    echo "  ❌ FAILED"
    echo "  Response: $RESULT"
  fi
  echo ""
done

echo "=============================================="
echo "TEST COMPLETE"
echo "=============================================="
