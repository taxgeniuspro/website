#!/bin/bash

# Generate complete Miami tax service page with DUAL conversion paths:
# 1. B2C: Tax preparation services for customers
# 2. B2B: Tax preparer recruitment for affiliates

echo "🚀 Generating DUAL-PATH tax service page for Miami, Florida..."
echo ""

# Define service details
SERVICE_NAME="Personal Tax Preparation"
PRICE=199
AVG_REFUND=3200
CITY="Miami"
STATE="Florida"
STATE_CODE="FL"
POPULATION=467963

# Define recruitment details
AVG_INCOME=75000
TOP_EARNER=150000

# ========================================
# SECTION 1: B2C - Tax Service Introduction (500 words)
# ========================================

echo "✍️  [1/2] Generating B2C tax service introduction (500 words)..."
echo "    Target: Customers needing tax preparation"
echo ""

B2C_PROMPT="You are an expert local tax services copywriter with deep knowledge of tax preparation.

Write a compelling 500-word introduction for this tax service page targeting customers in Miami, Florida.

SERVICE DETAILS:
- Service: Personal Tax Preparation
- Type: personal tax preparation
- Starting Price: \$199
- Average Refund: \$3,200
- Turnaround: Same-day filing available
- Specialties: W-2 employees, Self-employed, Freelancers, Small business owners

CITY & TAX CONTEXT:
- Location: Miami, Florida
- Population: 467,963
- State Tax: No state income tax
- IRS Office: 51 SW 1st Ave, Miami, FL 33130
- Major industries: Tourism, Finance, Real Estate, Healthcare, International Trade
- Popular areas: South Beach, Downtown Miami, Coral Gables, Wynwood, Brickell
- ZIP Codes served: 33101, 33109, 33125

WRITING REQUIREMENTS:
1. **Length:** Exactly 500 words (strict requirement)
2. **Local References:** Mention at least 5 specific Miami locations, neighborhoods, or business districts
3. **Target Audience:** Address Miami residents and business owners directly
4. **Use Cases:** Provide 3-4 specific examples relevant to Miami demographics
5. **Tax Specifics:** Reference Florida tax laws, IRS deadlines, local deductions
6. **Trust Signals:** Emphasize expertise, accuracy, audit support, year-round availability
7. **Natural Keywords:** Include naturally: \"tax preparation miami\", \"tax services miami\", \"florida state taxes\", \"IRS miami\"
8. **Tone:** Professional, trustworthy, local expert voice
9. **NO Generic Content:** Every sentence must feel specific to Miami

STRUCTURE:
Paragraph 1 (100 words): Hook with local tax relevance, introduce service
Paragraph 2 (150 words): Detail service offerings and why perfect for Miami taxpayers
Paragraph 3 (150 words): Specific use cases with local business/resident examples
Paragraph 4 (100 words): Pricing, expertise, call-to-action

OUTPUT FORMAT (Plain text, no markdown):
[Your 500-word introduction here]

Write now (500 words, Miami-specific, tax services focus):"

# Call Ollama for B2C content
B2C_RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"qwen3:14b\",\"prompt\":$(echo "$B2C_PROMPT" | jq -Rs .),\"stream\":false}")

B2C_INTRO=$(echo "$B2C_RESPONSE" | jq -r '.response' | sed 's/<think>.*<\/think>//g')

echo "✅ B2C introduction generated ($(echo "$B2C_INTRO" | wc -w) words)"
echo ""

# ========================================
# SECTION 2: B2B - Tax Preparer Recruitment (250-300 words)
# ========================================

echo "✍️  [2/2] Generating B2B recruitment section (250-300 words)..."
echo "    Target: Potential tax preparers (affiliates)"
echo ""

B2B_PROMPT="You are an expert recruitment copywriter specializing in tax preparation careers.

Write a compelling 250-300 word recruitment section for Tax Genius Pro, targeting potential tax preparers in Miami, Florida.

OPPORTUNITY DETAILS:
- Average Income: \$75,000/year
- Top Earners: \$150,000/year
- Work Model: Work from home, Flexible hours, Free training, No experience required
- Training: 4-6 weeks, self-paced
- Certification: Yes - Provided at no cost
- Schedule: Seasonal high-earning period + year-round income potential

CITY CONTEXT:
- Location: Miami, Florida
- Population: 467,963 (large market opportunity)
- Tax Season Demand: High demand in South Beach, Downtown Miami, Coral Gables, Wynwood, Brickell
- Target Recruits: Career changers, retirees, stay-at-home parents, part-time workers in Miami

WRITING REQUIREMENTS:
1. **Length:** 250-300 words (strict requirement)
2. **Hook:** Start with earning potential or lifestyle benefit
3. **City-Specific:** Mention Miami opportunity, local market size, neighborhoods
4. **Address Pain Points:** Dead-end jobs, Miami traffic/commuting, inflexible hours, low pay
5. **Highlight Benefits:**
   - Earn \$75,000+ from home in Miami
   - Free training and certification
   - Flexible hours perfect for Miami lifestyle
   - No experience required
   - Be your own boss serving Miami taxpayers
6. **Social Proof:** Mention successful tax preparers already working in Florida
7. **Urgency:** Tax season approaching, limited training spots, growing Miami market
8. **CTA:** \"Join Tax Genius Pro in Miami\" - click to apply
9. **Tone:** Inspirational, opportunity-focused, empowering
10. **Keywords:** Include naturally: \"tax preparer jobs miami\", \"work from home miami\", \"become a tax preparer\", \"florida tax career\"

STRUCTURE:
Paragraph 1 (80 words): Hook with income potential, introduce opportunity in Miami
Paragraph 2 (100 words): Detail benefits, training, flexibility for Miami residents
Paragraph 3 (70-120 words): Social proof, urgency, strong CTA to join

OUTPUT FORMAT (Plain text, no markdown):
[Your 250-300 word recruitment section here]

Write now (250-300 words, Miami-specific, recruitment focus):"

# Call Ollama for B2B content
B2B_RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"qwen3:14b\",\"prompt\":$(echo "$B2B_PROMPT" | jq -Rs .),\"stream\":false}")

B2B_RECRUITMENT=$(echo "$B2B_RESPONSE" | jq -r '.response' | sed 's/<think>.*<\/think>//g')

echo "✅ B2B recruitment section generated ($(echo "$B2B_RECRUITMENT" | wc -w) words)"
echo ""

# ========================================
# Save complete page to file
# ========================================

OUTPUT_FILE="/tmp/miami-dual-path-$(date +%s).txt"

cat > "$OUTPUT_FILE" <<EOF
═══════════════════════════════════════════════════════════════════
MIAMI, FLORIDA - DUAL CONVERSION PATH TAX SERVICE PAGE
═══════════════════════════════════════════════════════════════════

TITLE: Personal Tax Preparation Miami, FL | Same-day filing | From \$199

H1: Personal Tax Preparation in Miami, Florida

META DESCRIPTION:
Professional personal tax preparation in Miami, Florida. Same-day filing available.
Starting at \$199. Maximize your federal refund. Call now for free consultation!

═══════════════════════════════════════════════════════════════════
SECTION 1: B2C - TAX SERVICES FOR CUSTOMERS (500 words)
═══════════════════════════════════════════════════════════════════

$B2C_INTRO

───────────────────────────────────────────────────────────────────

[CTA BUTTON: Get Started - File Your Taxes Today]
[LINK: /start-filing or /contact]

═══════════════════════════════════════════════════════════════════
SECTION 2: B2B - TAX PREPARER RECRUITMENT (250-300 words)
═══════════════════════════════════════════════════════════════════

$B2B_RECRUITMENT

───────────────────────────────────────────────────────────────────

[CTA BUTTON: Apply Now - Join Tax Genius Pro]
[LINK: pro.taxgenius.tax or /affiliate/apply]

═══════════════════════════════════════════════════════════════════
PAGE STATISTICS
═══════════════════════════════════════════════════════════════════

B2C Section Word Count: $(echo "$B2C_INTRO" | wc -w) words (target: 500)
B2B Section Word Count: $(echo "$B2B_RECRUITMENT" | wc -w) words (target: 250-300)
Total Content: $(echo "$B2C_INTRO $B2B_RECRUITMENT" | wc -w) words

CONVERSION PATHS:
1. B2C: Customers needing tax preparation → /start-filing
2. B2B: Potential tax preparers → pro.taxgenius.tax

═══════════════════════════════════════════════════════════════════
EOF

echo "📄 Complete dual-path page saved to: $OUTPUT_FILE"
echo ""
echo "Preview (first 500 characters of B2C section):"
echo "───────────────────────────────────────────────────────────────"
echo "$B2C_INTRO" | head -c 500
echo "..."
echo ""
echo "Preview (first 300 characters of B2B section):"
echo "───────────────────────────────────────────────────────────────"
echo "$B2B_RECRUITMENT" | head -c 300
echo "..."
echo "───────────────────────────────────────────────────────────────"
echo ""
echo "✅ DUAL-PATH GENERATION COMPLETE!"
echo ""
echo "📊 Next steps:"
echo "   1. Review complete content: cat $OUTPUT_FILE"
echo "   2. Verify both conversion paths are compelling"
echo "   3. Insert into database with both sections"
echo "   4. Create Next.js route with dual CTAs"
echo "   5. Test conversion tracking for both B2C and B2B"
echo ""
echo "🎯 DUAL CONVERSION STRATEGY:"
echo "   - Primary CTA: 'Get Started' (B2C - tax services)"
echo "   - Secondary CTA: 'Apply Now' (B2B - become tax preparer)"
echo "   - Each city page serves BOTH customer acquisition AND recruiter onboarding"
echo ""
