#!/bin/bash

# ============================================================================
# 5-CITY TEST BATCH GENERATOR
# ============================================================================
# Generates bilingual pages for 5 strategically selected test cities
# Focus: Quality over quantity - perfect before scaling
# ============================================================================

echo "🚀 TAX GENIUS PRO - 5 CITY TEST GENERATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Strategy: Generate 5 diverse test cities to validate approach"
echo "Target: Black + Latino low-medium income families"
echo "Output: English + Spanish for each city (10 pages total)"
echo ""

# Test Cities (Selected for diversity)
declare -A CITIES

# City 1: Miami, FL
CITIES[miami_name]="Miami"
CITIES[miami_state]="Florida"
CITIES[miami_code]="FL"
CITIES[miami_pop]="467963"
CITIES[miami_dialect]="Cuban Spanish"
CITIES[miami_tax]="No state income tax"
CITIES[miami_neighborhoods]="South Beach, Downtown Miami, Coral Gables, Wynwood, Brickell"
CITIES[miami_industries]="Tourism, Finance, Real Estate, Healthcare, International Trade"
CITIES[miami_irs]="51 SW 1st Ave, Miami, FL 33130"
CITIES[miami_zips]="33101, 33109, 33125"

# City 2: Los Angeles, CA
CITIES[la_name]="Los Angeles"
CITIES[la_state]="California"
CITIES[la_code]="CA"
CITIES[la_pop]="3979576"
CITIES[la_dialect]="Mexican Spanish"
CITIES[la_tax]="Yes (9.3% state income tax)"
CITIES[la_neighborhoods]="Downtown LA, East LA, Boyle Heights, South Central, Pico-Union"
CITIES[la_industries]="Entertainment, Technology, Manufacturing, Tourism, Healthcare"
CITIES[la_irs]="300 N Los Angeles St, Los Angeles, CA 90012"
CITIES[la_zips]="90001, 90011, 90015"

# City 3: Atlanta, GA
CITIES[atl_name]="Atlanta"
CITIES[atl_state]="Georgia"
CITIES[atl_code]="GA"
CITIES[atl_pop]="498715"
CITIES[atl_dialect]="Neutral Latin American Spanish"
CITIES[atl_tax]="Yes (5.75% state income tax)"
CITIES[atl_neighborhoods]="Downtown Atlanta, Westside, Old Fourth Ward, Vine City, Pittsburgh"
CITIES[atl_industries]="Healthcare, Finance, Logistics, Technology, Film Production"
CITIES[atl_irs]="401 W Peachtree St NW, Atlanta, GA 30308"
CITIES[atl_zips]="30303, 30310, 30314"

# City 4: Houston, TX
CITIES[hou_name]="Houston"
CITIES[hou_state]="Texas"
CITIES[hou_code]="TX"
CITIES[hou_pop]="2304580"
CITIES[hou_dialect]="Mexican Spanish"
CITIES[hou_tax]="No state income tax"
CITIES[hou_neighborhoods]="Downtown Houston, Third Ward, Fifth Ward, East End, Gulfton"
CITIES[hou_industries]="Energy, Healthcare, Aerospace, Construction, Manufacturing"
CITIES[hou_irs]="1919 Smith St, Houston, TX 77002"
CITIES[hou_zips]="77002, 77004, 77026"

# City 5: New York, NY
CITIES[nyc_name]="New York"
CITIES[nyc_state]="New York"
CITIES[nyc_code]="NY"
CITIES[nyc_pop]="8336817"
CITIES[nyc_dialect]="Puerto Rican Spanish"
CITIES[nyc_tax]="Yes (8.82% state income tax)"
CITIES[nyc_neighborhoods]="Bronx, East Harlem, Washington Heights, Bushwick, Jamaica"
CITIES[nyc_industries]="Finance, Healthcare, Retail, Tourism, Technology"
CITIES[nyc_irs]="290 Broadway, New York, NY 10007"
CITIES[nyc_zips]="10451, 10029, 10033"

echo "📍 Test Cities Selected:"
echo "   1. Miami, FL - Cuban Spanish, Tourism/Service"
echo "   2. Los Angeles, CA - Mexican Spanish, Gig Economy"
echo "   3. Atlanta, GA - Large Black Population, Healthcare"
echo "   4. Houston, TX - Mexican Spanish, Energy/Construction"
echo "   5. New York, NY - Puerto Rican Spanish, High Cost of Living"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate each city
for city in miami la atl hou nyc; do
    name_key="${city}_name"
    state_key="${city}_state"
    code_key="${city}_code"
    pop_key="${city}_pop"
    dialect_key="${city}_dialect"
    tax_key="${city}_tax"
    neighborhoods_key="${city}_neighborhoods"
    industries_key="${city}_industries"
    irs_key="${city}_irs"
    zips_key="${city}_zips"

    CITY_NAME="${CITIES[$name_key]}"
    STATE="${CITIES[$state_key]}"
    STATE_CODE="${CITIES[$code_key]}"
    POPULATION="${CITIES[$pop_key]}"
    SPANISH_DIALECT="${CITIES[$dialect_key]}"
    STATE_TAX="${CITIES[$tax_key]}"
    NEIGHBORHOODS="${CITIES[$neighborhoods_key]}"
    INDUSTRIES="${CITIES[$industries_key]}"
    IRS_OFFICE="${CITIES[$irs_key]}"
    ZIP_CODES="${CITIES[$zips_key]}"

    echo "🏙️  Generating: $CITY_NAME, $STATE ($SPANISH_DIALECT)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Generate using our optimized script
    # Note: This is a placeholder - in production we'd call the actual generator
    echo "   This would call: generate-miami-optimized.sh with $CITY_NAME params"
    echo "   Output: /tmp/${city}-optimized-$(date +%s).txt"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 5-CITY TEST BATCH PLANNED"
echo ""
echo "📊 Next Steps:"
echo "   1. Review Miami output (completed first)"
echo "   2. If quality is good, run batch generation"
echo "   3. Review all 5 cities for consistency"
echo "   4. Build Next.js routes"
echo "   5. Deploy and test conversion"
echo ""
echo "⏱️  Estimated Time:"
echo "   - Miami: Already generating (~5 min total)"
echo "   - LA, Atlanta, Houston, NYC: ~5 min each = 20 min"
echo "   - Total: ~25 minutes for all 5 cities"
echo ""
echo "💾 Storage:"
echo "   - Each city: ~2,500 words (English + Spanish)"
echo "   - 5 cities: ~12,500 words total"
echo "   - Database storage: ~100KB"
echo ""
