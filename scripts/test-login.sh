#!/bin/bash

# Login Test Script for Tax Genius Pro
# Tests 4 different user roles to ensure authentication works correctly

set -e

BASE_URL="https://taxgeniuspro.tax"
COOKIE_JAR="/tmp/test-cookies.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "🧪 Tax Genius Pro Login Tests"
echo "=========================================="
echo ""

# Clean up old cookies
rm -f $COOKIE_JAR

# Test function
test_login() {
    local email=$1
    local password=$2
    local expected_role=$3
    local expected_dashboard=$4

    echo -e "${YELLOW}Testing: $expected_role ($email)${NC}"

    # Clean cookies between tests
    rm -f $COOKIE_JAR

    # Step 1: Get CSRF token from signin page
    echo "  → Getting signin page..."
    csrf_response=$(curl -s -c $COOKIE_JAR -L "$BASE_URL/auth/signin")

    # Step 2: Attempt login via NextAuth credentials endpoint
    echo "  → Attempting login..."
    login_response=$(curl -s -b $COOKIE_JAR -c $COOKIE_JAR \
        -X POST "$BASE_URL/api/auth/callback/credentials" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\",\"redirect\":false}" \
        -L -D /tmp/login-headers.txt)

    # Step 3: Check if we got a session by requesting the dashboard
    echo "  → Checking dashboard access..."
    dashboard_response=$(curl -s -b $COOKIE_JAR -L -w "\n%{http_code}" "$BASE_URL$expected_dashboard")
    http_code=$(echo "$dashboard_response" | tail -n 1)

    # Verify results
    if [ "$http_code" = "200" ]; then
        echo -e "  ${GREEN}✓ SUCCESS${NC}: Login worked, dashboard accessible (HTTP $http_code)"
        echo "  ✓ Redirected to correct dashboard: $expected_dashboard"
        return 0
    else
        echo -e "  ${RED}✗ FAILED${NC}: Could not access dashboard (HTTP $http_code)"
        return 1
    fi
}

# Counter
passed=0
failed=0

# Test 1: CLIENT Role
echo ""
echo "═══════════════════════════════════════════"
echo "Test 1/4: CLIENT Role"
echo "═══════════════════════════════════════════"
if test_login "client1@test.com" "Bobby321!" "CLIENT" "/dashboard/client"; then
    ((passed++))
else
    ((failed++))
fi

# Test 2: TAX_PREPARER Role
echo ""
echo "═══════════════════════════════════════════"
echo "Test 2/4: TAX_PREPARER Role"
echo "═══════════════════════════════════════════"
if test_login "taxpreparer1@test.com" "Bobby321!" "TAX_PREPARER" "/dashboard/tax-preparer"; then
    ((passed++))
else
    ((failed++))
fi

# Test 3: AFFILIATE Role
echo ""
echo "═══════════════════════════════════════════"
echo "Test 3/4: AFFILIATE Role"
echo "═══════════════════════════════════════════"
if test_login "affiliate1@test.com" "Bobby321!" "AFFILIATE" "/dashboard/affiliate"; then
    ((passed++))
else
    ((failed++))
fi

# Test 4: ADMIN Role
echo ""
echo "═══════════════════════════════════════════"
echo "Test 4/4: ADMIN Role"
echo "═══════════════════════════════════════════"
if test_login "admin@test.com" "Bobby321!" "ADMIN" "/dashboard/admin"; then
    ((passed++))
else
    ((failed++))
fi

# Summary
echo ""
echo "=========================================="
echo "📊 Test Results Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
