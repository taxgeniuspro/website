#!/bin/bash

# Simple bash script to generate Miami tax service page
# This bypasses Node.js/TypeScript issues and calls Ollama directly

echo "🚀 Generating tax service page for Miami, Florida..."
echo ""

# Define service details
SERVICE_NAME="Personal Tax Preparation"
PRICE=199
CITY="Miami"
STATE="Florida"
STATE_CODE="FL"

# Generate 500-word introduction
echo "✍️  Generating 500-word introduction (this takes 30-60 seconds)..."

INTRO_PROMPT="You are an expert local tax services copywriter.

Write a compelling 500-word introduction for Personal Tax Preparation targeting customers in Miami, Florida.

SERVICE DETAILS:
- Service: Personal Tax Preparation
- Starting Price: \$199
- Turnaround: Same-day filing available
- Specialties: W-2 employees, Self-employed, Freelancers, Small business owners

CITY & TAX CONTEXT:
- Location: Miami, Florida
- Population: 467,963
- State Tax: No state income tax (Florida)
- IRS Office: 51 SW 1st Ave, Miami, FL 33130
- Major industries: Tourism, Finance, Real Estate, Healthcare, International Trade
- Popular areas: South Beach, Downtown Miami, Coral Gables, Wynwood, Brickell

REQUIREMENTS:
1. Exactly 500 words
2. Mention at least 5 specific Miami locations
3. Address Miami residents and business owners
4. Reference Florida tax laws and IRS
5. Professional, trustworthy tone
6. Include keywords naturally: \"tax preparation Miami\", \"tax services Miami\", \"Florida taxes\"

Write now (500 words, Miami-specific, plain text, no markdown):"

# Call Ollama
INTRO_RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"qwen3:14b\",\"prompt\":$(echo "$INTRO_PROMPT" | jq -Rs .),\"stream\":false}")

INTRO=$(echo "$INTRO_RESPONSE" | jq -r '.response' | sed 's/<think>.*<\/think>//g')

echo "✅ Introduction generated ($(echo "$INTRO" | wc -w) words)"
echo ""

# Save to file for review
OUTPUT_FILE="/tmp/miami-tax-page-$(date +%s).txt"

cat > "$OUTPUT_FILE" <<EOF
═══════════════════════════════════════════════════════════
MIAMI, FLORIDA - PERSONAL TAX PREPARATION PAGE
═══════════════════════════════════════════════════════════

TITLE: Personal Tax Preparation Miami, FL | Same-day filing | From \$199

H1: Personal Tax Preparation in Miami, Florida

META DESCRIPTION:
Professional personal tax preparation in Miami, Florida. Same-day filing available.
Starting at \$199. Maximize your federal refund. Call now for free consultation!

───────────────────────────────────────────────────────────

500-WORD INTRODUCTION:

$INTRO

═══════════════════════════════════════════════════════════
EOF

echo "📄 Content saved to: $OUTPUT_FILE"
echo ""
echo "Preview (first 500 characters):"
echo "───────────────────────────────────────"
echo "$INTRO" | head -c 500
echo "..."
echo "───────────────────────────────────────"
echo ""
echo "✅ Generation complete!"
echo ""
echo "📊 Next steps:"
echo "   1. Review content: cat $OUTPUT_FILE"
echo "   2. Insert into database"
echo "   3. Create Next.js route to display"
