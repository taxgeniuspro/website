#!/bin/bash

# CRM Integration Testing Script
# Tests all 9 forms with 3 clients each (27 total submissions)
# All test data uses @example.com emails and 404-555-0xxx phone numbers

set -e

BASE_URL="https://taxgeniuspro.tax"
RESULTS_FILE="/tmp/crm-test-results.txt"
SUCCESS_COUNT=0
FAIL_COUNT=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================" > $RESULTS_FILE
echo "CRM Integration Test Results" >> $RESULTS_FILE
echo "Date: $(date)" >> $RESULTS_FILE
echo "========================================" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "✅ $1" >> $RESULTS_FILE
    ((SUCCESS_COUNT++))
}

log_fail() {
    echo -e "${RED}❌ $1${NC}"
    echo "❌ $1" >> $RESULTS_FILE
    ((FAIL_COUNT++))
}

log_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
    echo "ℹ️  $1" >> $RESULTS_FILE
}

# ========================================
# FORM 1: Tax Intake Lead Form (3 clients)
# ========================================
echo ""
log_info "========== Testing Tax Intake Form =========="
echo ""

# Client 1: Complete with Ray attribution
log_info "Test 1.1: Complete tax intake with Ray attribution"
if curl -s -X POST "${BASE_URL}/api/tax-intake/lead?ref=ray" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"Maria","middle_name":"Elena","last_name":"Rodriguez",
    "email":"maria.rodriguez.test1@example.com","phone":"404-555-0101",
    "country_code":"+1","address_line_1":"123 Peachtree St NE","address_line_2":"Apt 4B",
    "city":"Atlanta","state":"GA","zip_code":"30303",
    "date_of_birth":"1985-03-15","ssn":"***-**-1234",
    "filing_status":"Married Filing Jointly","employment_type":"W-2 Employee",
    "occupation":"Nurse","claimed_as_dependent":false,"in_college":false,
    "has_dependents":true,"number_of_dependents":"2",
    "has_mortgage":true,"wants_refund_advance":true
  }' | grep -q "success"; then
    log_success "Tax Intake 1/3: Maria Rodriguez (Complete, Ray attribution)"
else
    log_fail "Tax Intake 1/3: Maria Rodriguez - FAILED"
fi

# Client 2: Partial (no tax details)
log_info "Test 1.2: Partial tax intake (no attribution)"
if curl -s -X POST "${BASE_URL}/api/tax-intake/lead" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"James","last_name":"Thompson",
    "email":"james.thompson.test2@example.com","phone":"404-555-0102",
    "address_line_1":"456 Piedmont Ave","city":"Atlanta","state":"GA","zip_code":"30308"
  }' | grep -q "success"; then
    log_success "Tax Intake 2/3: James Thompson (Partial, no attribution)"
else
    log_fail "Tax Intake 2/3: James Thompson - FAILED"
fi

# Client 3: Complete with international phone
log_info "Test 1.3: Complete with international phone and Ray attribution"
if curl -s -X POST "${BASE_URL}/api/tax-intake/lead?ref=ray" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"Chen","last_name":"Wang",
    "email":"chen.wang.test3@example.com","phone":"+86-138-0000-1234",
    "country_code":"+86","address_line_1":"789 Roswell Rd",
    "city":"Sandy Springs","state":"GA","zip_code":"30350",
    "date_of_birth":"1990-07-22","ssn":"***-**-5678",
    "filing_status":"Single","employment_type":"Self-Employed",
    "occupation":"Software Developer","has_dependents":false
  }' | grep -q "success"; then
    log_success "Tax Intake 3/3: Chen Wang (Complete, international phone)"
else
    log_fail "Tax Intake 3/3: Chen Wang - FAILED"
fi

# ========================================
# FORM 2: Contact Form (3 clients)
# ========================================
echo ""
log_info "========== Testing Contact Form =========="
echo ""

# Client 1: With Ray attribution
log_info "Test 2.1: Contact form with Ray attribution"
if curl -s -X POST "${BASE_URL}/api/contact/submit?ref=ray" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Patricia Williams",
    "email":"patricia.williams.test1@example.com",
    "phone":"404-555-0201",
    "service":"Tax Preparation",
    "message":"I need help filing my 2024 taxes. I have W-2 income and some investment income from stocks."
  }' | grep -q "success"; then
    log_success "Contact 1/3: Patricia Williams (Tax Prep, Ray attribution)"
else
    log_fail "Contact 1/3: Patricia Williams - FAILED"
fi

# Client 2: Bookkeeping
log_info "Test 2.2: Bookkeeping service inquiry"
if curl -s -X POST "${BASE_URL}/api/contact/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Michael Chen",
    "email":"michael.chen.test2@example.com",
    "phone":"404-555-0202",
    "service":"Bookkeeping",
    "message":"I run a small consulting business and need monthly bookkeeping services."
  }' | grep -q "success"; then
    log_success "Contact 2/3: Michael Chen (Bookkeeping)"
else
    log_fail "Contact 2/3: Michael Chen - FAILED"
fi

# Client 3: IRS Audit (no phone)
log_info "Test 2.3: IRS audit support (no phone)"
if curl -s -X POST "${BASE_URL}/api/contact/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Sarah Johnson",
    "email":"sarah.johnson.test3@example.com",
    "service":"IRS Audit Support",
    "message":"I received an IRS audit notice for my 2022 tax return. I need professional help. This is urgent!"
  }' | grep -q "success"; then
    log_success "Contact 3/3: Sarah Johnson (IRS Audit)"
else
    log_fail "Contact 3/3: Sarah Johnson - FAILED"
fi

# ========================================
# FORM 3: Appointment Booking (3 clients)
# ========================================
echo ""
log_info "========== Testing Appointment Booking =========="
echo ""

# Client 1: Video call with Ray
log_info "Test 3.1: Video consultation with Ray"
if curl -s -X POST "${BASE_URL}/api/appointments/book?ref=ray" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName":"Robert Martinez",
    "clientEmail":"robert.martinez.test1@example.com",
    "clientPhone":"404-555-0301",
    "appointmentType":"VIDEO_CALL",
    "notes":"First-time client. Needs help with small business taxes."
  }' | grep -q "success"; then
    log_success "Appointment 1/3: Robert Martinez (Video, Ray)"
else
    log_fail "Appointment 1/3: Robert Martinez - FAILED"
fi

# Client 2: Phone call
log_info "Test 3.2: Phone call (no specific time)"
if curl -s -X POST "${BASE_URL}/api/appointments/book" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName":"Lisa Anderson",
    "clientEmail":"lisa.anderson.test2@example.com",
    "clientPhone":"404-555-0302",
    "appointmentType":"PHONE_CALL",
    "notes":"Quick question about tax deductions for home office."
  }' | grep -q "success"; then
    log_success "Appointment 2/3: Lisa Anderson (Phone)"
else
    log_fail "Appointment 2/3: Lisa Anderson - FAILED"
fi

# Client 3: In-person with Ray
log_info "Test 3.3: In-person consultation with Ray"
if curl -s -X POST "${BASE_URL}/api/appointments/book?ref=ray" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName":"David Kim",
    "clientEmail":"david.kim.test3@example.com",
    "clientPhone":"404-555-0303",
    "appointmentType":"IN_PERSON",
    "notes":"Complex tax situation with rental properties and crypto trading."
  }' | grep -q "success"; then
    log_success "Appointment 3/3: David Kim (In-person, Ray)"
else
    log_fail "Appointment 3/3: David Kim - FAILED"
fi

# ========================================
# FORM 4: Preparer Application (3 clients)
# ========================================
echo ""
log_info "========== Testing Preparer Application =========="
echo ""

# Applicant 1: Seasoned
log_info "Test 4.1: Seasoned preparer application"
if curl -s -X POST "${BASE_URL}/api/preparers/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Jennifer","middleName":"Marie","lastName":"Davis",
    "email":"jennifer.davis.test1@example.com","phone":"404-555-0401",
    "languages":"English, Spanish","smsConsent":"yes",
    "experienceLevel":"SEASONED",
    "taxSoftware":["TurboTax","H&R Block","TaxSlayer"]
  }' | grep -q "success"; then
    log_success "Preparer App 1/3: Jennifer Davis (Seasoned)"
else
    log_fail "Preparer App 1/3: Jennifer Davis - FAILED"
fi

# Applicant 2: New (minimal)
log_info "Test 4.2: New preparer (minimal info)"
if curl -s -X POST "${BASE_URL}/api/preparers/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Kevin","lastName":"Brown",
    "email":"kevin.brown.test2@example.com","phone":"404-555-0402",
    "languages":"English","smsConsent":"yes"
  }' | grep -q "success"; then
    log_success "Preparer App 2/3: Kevin Brown (New)"
else
    log_fail "Preparer App 2/3: Kevin Brown - FAILED"
fi

# Applicant 3: Intermediate
log_info "Test 4.3: Intermediate preparer"
if curl -s -X POST "${BASE_URL}/api/preparers/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Maria","lastName":"Garcia",
    "email":"maria.garcia.test3@example.com","phone":"404-555-0403",
    "languages":"English, Spanish, Portuguese","smsConsent":"yes",
    "experienceLevel":"INTERMEDIATE","taxSoftware":["TaxAct"]
  }' | grep -q "success"; then
    log_success "Preparer App 3/3: Maria Garcia (Intermediate)"
else
    log_fail "Preparer App 3/3: Maria Garcia - FAILED"
fi

# ========================================
# FORM 5: Referral Signup (3 clients)
# ========================================
echo ""
log_info "========== Testing Referral Signup =========="
echo ""

# Referrer 1
log_info "Test 5.1: Referral program signup"
if curl -s -X POST "${BASE_URL}/api/referrals/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Angela","lastName":"White",
    "email":"angela.white.test1@example.com","phone":"404-555-0501"
  }' | grep -q "success"; then
    log_success "Referral 1/3: Angela White"
else
    log_fail "Referral 1/3: Angela White - FAILED"
fi

# Referrer 2
log_info "Test 5.2: Business referrer signup"
if curl -s -X POST "${BASE_URL}/api/referrals/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Thomas","lastName":"Miller",
    "email":"thomas.miller.test2@example.com","phone":"404-555-0502"
  }' | grep -q "success"; then
    log_success "Referral 2/3: Thomas Miller"
else
    log_fail "Referral 2/3: Thomas Miller - FAILED"
fi

# Referrer 3: Duplicate (should fail with 409)
log_info "Test 5.3: Duplicate email (should fail with 409)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/referrals/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Angela","lastName":"White",
    "email":"angela.white.test1@example.com","phone":"404-555-0503"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "409" ]; then
    log_success "Referral 3/3: Duplicate test (correctly rejected with 409)"
else
    log_fail "Referral 3/3: Duplicate test - Expected 409, got $HTTP_CODE"
fi

# ========================================
# FORM 6: Affiliate Application (3 clients)
# ========================================
echo ""
log_info "========== Testing Affiliate Application =========="
echo ""

# Affiliate 1: With bonding to Ray
log_info "Test 6.1: Affiliate with Ray bonding"
if curl -s -X POST "${BASE_URL}/api/applications/affiliate" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Ashley","lastName":"Taylor",
    "email":"ashley.taylor.test1@example.com","phone":"404-555-0601",
    "experience":"5+ years in financial content creation",
    "audience":"Young professionals and small business owners",
    "platforms":["Instagram","TikTok","YouTube"],
    "bondToPreparerUsername":"ray",
    "message":"I create tax tips content. Looking to partner.",
    "agreeToTerms":true
  }' | grep -q "success"; then
    log_success "Affiliate App 1/3: Ashley Taylor (Ray bonding)"
else
    log_fail "Affiliate App 1/3: Ashley Taylor - FAILED"
fi

# Affiliate 2: Blogger (no bonding)
log_info "Test 6.2: Blogger affiliate (no bonding)"
if curl -s -X POST "${BASE_URL}/api/applications/affiliate" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Marcus","lastName":"Johnson",
    "email":"marcus.johnson.test2@example.com","phone":"404-555-0602",
    "experience":"2 years blogging about personal finance",
    "audience":"Millennials interested in financial independence",
    "agreeToTerms":true
  }' | grep -q "success"; then
    log_success "Affiliate App 2/3: Marcus Johnson (Blogger)"
else
    log_fail "Affiliate App 2/3: Marcus Johnson - FAILED"
fi

# Affiliate 3: Minimal
log_info "Test 6.3: Minimal affiliate info"
if curl -s -X POST "${BASE_URL}/api/applications/affiliate" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Nicole","lastName":"Harris",
    "email":"nicole.harris.test3@example.com","phone":"404-555-0603",
    "agreeToTerms":true
  }' | grep -q "success"; then
    log_success "Affiliate App 3/3: Nicole Harris (Minimal)"
else
    log_fail "Affiliate App 3/3: Nicole Harris - FAILED"
fi

# ========================================
# FORM 7: Customer Lead Form (3 clients)
# ========================================
echo ""
log_info "========== Testing Customer Lead Form =========="
echo ""

# Customer 1: With Ray and UTM
log_info "Test 7.1: High income customer with Ray attribution"
if curl -s -X POST "${BASE_URL}/api/leads/customer?ref=ray" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Elizabeth","lastName":"Moore",
    "email":"elizabeth.moore.test1@example.com","phone":"404-555-0701",
    "taxSituation":"Multiple income sources including rental and stocks",
    "estimatedIncome":"$150,000+",
    "utmSource":"google","utmMedium":"cpc","utmCampaign":"tax_season_2025"
  }' | grep -q "success"; then
    log_success "Customer Lead 1/3: Elizabeth Moore (High income, Ray)"
else
    log_fail "Customer Lead 1/3: Elizabeth Moore - FAILED"
fi

# Customer 2: Simple
log_info "Test 7.2: Simple W-2 customer"
if curl -s -X POST "${BASE_URL}/api/leads/customer" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Brian","lastName":"Scott",
    "email":"brian.scott.test2@example.com","phone":"404-555-0702",
    "taxSituation":"W-2 employee, single filer",
    "estimatedIncome":"$50,000 - $75,000"
  }' | grep -q "success"; then
    log_success "Customer Lead 2/3: Brian Scott (Simple W-2)"
else
    log_fail "Customer Lead 2/3: Brian Scott - FAILED"
fi

# Customer 3: Self-employed with Ray
log_info "Test 7.3: Self-employed customer with Ray"
if curl -s -X POST "${BASE_URL}/api/leads/customer?ref=ray" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Samantha","lastName":"Lee",
    "email":"samantha.lee.test3@example.com","phone":"404-555-0703",
    "taxSituation":"Self-employed freelance designer",
    "estimatedIncome":"$75,000 - $100,000"
  }' | grep -q "success"; then
    log_success "Customer Lead 3/3: Samantha Lee (Self-employed, Ray)"
else
    log_fail "Customer Lead 3/3: Samantha Lee - FAILED"
fi

# ========================================
# FORM 8: Preparer Lead Form (3 clients)
# ========================================
echo ""
log_info "========== Testing Preparer Lead Form =========="
echo ""

# Preparer 1: CPA
log_info "Test 8.1: CPA with experience"
if curl -s -X POST "${BASE_URL}/api/leads/preparer" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Christopher","lastName":"Evans",
    "email":"christopher.evans.test1@example.com","phone":"404-555-0801",
    "ptin":"P12345678","certification":"CPA",
    "experience":"10+ years preparing individual and business returns"
  }' | grep -q "success"; then
    log_success "Preparer Lead 1/3: Christopher Evans (CPA)"
else
    log_fail "Preparer Lead 1/3: Christopher Evans - FAILED"
fi

# Preparer 2: EA
log_info "Test 8.2: Enrolled Agent"
if curl -s -X POST "${BASE_URL}/api/leads/preparer" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Michelle","lastName":"Clark",
    "email":"michelle.clark.test2@example.com","phone":"404-555-0802",
    "ptin":"P87654321","certification":"Enrolled Agent",
    "experience":"5 years specializing in small business taxes"
  }' | grep -q "success"; then
    log_success "Preparer Lead 2/3: Michelle Clark (EA)"
else
    log_fail "Preparer Lead 2/3: Michelle Clark - FAILED"
fi

# Preparer 3: No certification
log_info "Test 8.3: New preparer (no certification)"
if curl -s -X POST "${BASE_URL}/api/leads/preparer" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Daniel","lastName":"Martinez",
    "email":"daniel.martinez.test3@example.com","phone":"404-555-0803",
    "ptin":"P11223344"
  }' | grep -q "success"; then
    log_success "Preparer Lead 3/3: Daniel Martinez (No cert)"
else
    log_fail "Preparer Lead 3/3: Daniel Martinez - FAILED"
fi

# ========================================
# FORM 9: Affiliate Lead Form (3 clients)
# ========================================
echo ""
log_info "========== Testing Affiliate Lead Form =========="
echo ""

# Affiliate 1: Podcast
log_info "Test 9.1: Podcast host"
if curl -s -X POST "${BASE_URL}/api/leads/affiliate" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Rachel","lastName":"Green",
    "email":"rachel.green.test1@example.com","phone":"404-555-0901",
    "experience":"Host of Money Matters podcast with 50K+ monthly listeners",
    "audience":"Small business owners and entrepreneurs"
  }' | grep -q "success"; then
    log_success "Affiliate Lead 1/3: Rachel Green (Podcast)"
else
    log_fail "Affiliate Lead 1/3: Rachel Green - FAILED"
fi

# Affiliate 2: Facebook admin
log_info "Test 9.2: Facebook group admin"
if curl -s -X POST "${BASE_URL}/api/leads/affiliate" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Jason","lastName":"Wright",
    "email":"jason.wright.test2@example.com","phone":"404-555-0902",
    "experience":"Admin of 25K member Facebook group for real estate investors",
    "audience":"Real estate investors and landlords"
  }' | grep -q "success"; then
    log_success "Affiliate Lead 2/3: Jason Wright (Facebook)"
else
    log_fail "Affiliate Lead 2/3: Jason Wright - FAILED"
fi

# Affiliate 3: Newsletter
log_info "Test 9.3: Newsletter publisher"
if curl -s -X POST "${BASE_URL}/api/leads/affiliate" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Amanda","lastName":"Rodriguez",
    "email":"amanda.rodriguez.test3@example.com","phone":"404-555-0903",
    "experience":"Weekly newsletter about tax strategies with 10K subscribers",
    "audience":"High-income professionals"
  }' | grep -q "success"; then
    log_success "Affiliate Lead 3/3: Amanda Rodriguez (Newsletter)"
else
    log_fail "Affiliate Lead 3/3: Amanda Rodriguez - FAILED"
fi

# ========================================
# SUMMARY
# ========================================
echo ""
echo "========================================" | tee -a $RESULTS_FILE
echo "TEST SUMMARY" | tee -a $RESULTS_FILE
echo "========================================" | tee -a $RESULTS_FILE
echo -e "${GREEN}✅ Successful: $SUCCESS_COUNT${NC}" | tee -a $RESULTS_FILE
echo -e "${RED}❌ Failed: $FAIL_COUNT${NC}" | tee -a $RESULTS_FILE
echo "========================================" | tee -a $RESULTS_FILE
echo ""
echo "Full results saved to: $RESULTS_FILE"
echo ""

# Exit with error code if any tests failed
if [ $FAIL_COUNT -gt 0 ]; then
    exit 1
else
    exit 0
fi
