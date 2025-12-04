/**
 * SEO Brain - City-Specific Tax Service Content Generation Prompts
 *
 * Premium Quality (500-word content with 15 FAQs)
 * Uses Ollama for text generation
 * Uses Google Imagen 4 for city hero images
 *
 * Customized for Tax Preparation Services
 */

export interface CityData {
  name: string
  state: string
  stateCode: string
  population?: number
  neighborhoods?: string[]
  industries?: string[]
  landmarks?: string[]
  zipCodes?: string[]
  irsOffice?: string
  stateTaxRate?: number
  hasStateTax?: boolean
}

export interface TaxServiceSpec {
  serviceName: string // "Personal Tax Preparation", "Business Tax Filing", "Tax Resolution"
  serviceType: 'personal' | 'business' | 'resolution' | 'planning'
  startingPrice: number
  averageRefund?: number
  turnaround: string // "Same-day filing available", "24-48 hours", etc.
  specialties?: string[] // ["W-2 employees", "Self-employed", "Small businesses"]
}

export interface RecruitmentOpportunitySpec {
  avgIncome: number // e.g., 75000
  topEarnerIncome?: number // e.g., 150000
  benefits: string[] // ["Work from home", "Flexible hours", "Free training", "No experience required"]
  trainingDuration: string // "4-6 weeks", "Self-paced", etc.
  certificationProvided: boolean
  seasonalOrYearRound: 'seasonal' | 'year-round'
}

/**
 * Generate city-specific introduction for tax services (500 words)
 * OPTIMIZED FOR: Black and Spanish-speaking low-medium income families
 */
export function generateTaxServiceIntroPrompt(params: {
  city: CityData
  service: TaxServiceSpec
}): string {
  const { city, service } = params

  return `You are an expert tax services copywriter specializing in serving Black and Latino low-medium income families.

Write a compelling 500-word introduction for Tax Genius Pro targeting working families in ${city.name}, ${city.state} who may be missing thousands in tax refunds.

TARGET AUDIENCE:
- Black and Latino families
- Annual income: $20,000-$60,000
- Working parents with children
- Self-employed, gig workers, W-2 employees
- Many eligible for EITC but don't claim it
- Need affordable, trustworthy tax help

SERVICE DETAILS:
- Service: ${service.serviceName}
- Affordable Pricing: $99-$199 (payment plans available)
${service.averageRefund ? `- Average Refund: $${service.averageRefund.toLocaleString()}` : ''}
- EITC Expertise: Help families claim up to $8,046 in EITC
- Turnaround: ${service.turnaround}
- Bilingual: English + Spanish support
- Community-focused: Black-owned, local presence
- Specialties: ${service.specialties?.join(', ') || 'EITC, Child Tax Credit, working families'}

CITY & TAX CONTEXT:
- Location: ${city.name}, ${city.state}
- Population: ${city.population?.toLocaleString() || 'Major metro area'}
- State Tax: ${city.hasStateTax ? `Yes (${city.stateTaxRate}% rate)` : 'No state income tax'}
${city.irsOffice ? `- IRS Office: ${city.irsOffice}` : ''}
- Major industries: ${city.industries?.join(', ') || 'diverse economy'}
- Popular areas: ${city.neighborhoods?.slice(0, 3).join(', ') || 'metro area'}
- ZIP Codes served: ${city.zipCodes?.slice(0, 3).join(', ') || 'all local ZIP codes'}

CRITICAL EITC FOCUS (2025 Tax Year):
- 1 in 4 eligible workers DON'T claim EITC = Missing $2,000-$8,046
- Maximum EITC 2025: $649 (no kids), $4,328 (1 child), $7,152 (2 kids), $8,046 (3+ kids)
- Also emphasize: Child Tax Credit ($2,000/child), Additional CTC ($1,700 refundable)
- MUST mention EITC in opening paragraph

WRITING REQUIREMENTS:
1. **Length:** Exactly 500 words (strict requirement)
2. **EITC Hook (CRITICAL):** First paragraph MUST mention EITC or "missing refund money" - this is the #1 pain point
3. **Local References:** Mention at least 5 specific ${city.name} neighborhoods where Black/Latino families live
4. **Target Audience:** Directly address working families, single parents, gig workers in ${city.name}
5. **Pain Points to Address:**
   - Missing thousands in refunds (EITC, CTC)
   - Can't afford expensive tax preparers ($300-$500 elsewhere)
   - Distrust of tax system/institutions
   - Language barriers (for Spanish speakers)
   - Previous bad experiences
6. **Trust Signals (ESSENTIAL):**
   - "Community-focused" or "Serving ${city.name} families since..."
   - "Black-owned" (builds trust with target demographic)
   - "Bilingual - Hablamos español"
   - "No hidden fees" / "Transparent pricing"
   - "Payment plans available"
   - Success stories: "Maria got $7,200" "DeShawn got $5,800"
7. **Affordability (Front and Center):**
   - Mention "$99-$199" in 2nd paragraph
   - "Payment plans available"
   - "Free consultation"
   - Compare to "other places charge $300-$500"
8. **Natural Keywords:** Include: "EITC ${city.name.toLowerCase()}", "affordable tax preparation ${city.name.toLowerCase()}", "tax services for families ${city.name.toLowerCase()}", "bilingual tax help ${city.name.toLowerCase()}", "child tax credit ${city.name.toLowerCase()}"
9. **Tone:** Warm, community-focused, empowering (not corporate/cold)
10. **Cultural Sensitivity:** Acknowledge community needs without being condescending

STRUCTURE:
Paragraph 1 (125 words):
- HOOK: "Are you leaving $8,046 on the table?"
- Address EITC gap (25% don't claim)
- Introduce Tax Genius Pro as solution for ${city.name} families
- Mention bilingual, affordable, community-focused

Paragraph 2 (150 words):
- Detail EITC + CTC expertise
- Affordable pricing: $99-$199 vs $300-$500 elsewhere
- Payment plans available
- Same-day filing
- Specific neighborhoods served in ${city.name}

Paragraph 3 (150 words):
- Real use cases for ${city.name} families:
  * Single mom with 2 kids working in [neighborhood]: Got $7,200
  * Gig driver in [neighborhood]: Got $3,500
  * Restaurant worker in [neighborhood]: Got $5,800
- Address trust: "We're from YOUR community"
- Bilingual support for Spanish-speaking families

Paragraph 4 (75 words):
- Strong CTA: "Don't miss another year of refunds"
- Free consultation
- Call, text, or visit
- "Let's get you the $8,046 you deserve"

OUTPUT FORMAT (Plain text, no markdown):
[Your 500-word introduction here]

EXAMPLE OPENING (Do NOT copy, just style reference):
"Are you one of the thousands of ${city.name} families leaving up to $8,046 on the table? The Earned Income Tax Credit (EITC) alone could put thousands back in your pocket, but 1 in 4 eligible workers never claim it. If you're a working parent in ${city.neighborhoods?.[0] || 'downtown'} ${city.name}, a gig worker in ${city.neighborhoods?.[1] || 'the area'}, or juggling multiple jobs to make ends meet, you deserve every dollar of your refund. Tax Genius Pro is here to make sure you get it. We're a community-focused, Black-owned tax preparation service serving families throughout ${city.name}—and we speak your language, literally. Hablamos español. Our mission? Help ${city.name} families claim the EITC, Child Tax Credit, and every deduction you've earned, without the $300-$500 price tag other tax places charge..."

Write now (500 words, ${city.name}-specific, EITC-focused, community-oriented):`
}

/**
 * Generate city-specific benefits for tax services (10 benefits)
 * OPTIMIZED FOR: Black and Spanish-speaking low-medium income families
 */
export function generateTaxServiceBenefitsPrompt(params: {
  city: CityData
  service: TaxServiceSpec
}): string {
  const { city, service } = params

  return `Generate 10 compelling benefits for Tax Genius Pro specifically for working families in ${city.name}, ${city.state}.

TARGET AUDIENCE: Black and Latino low-medium income families ($20k-$60k)

SERVICE: ${service.serviceName}
PRICE: $99-$199 (vs $300-$500 elsewhere) - Payment plans available
EITC FOCUS: Help families claim up to $8,046 in refunds
TURNAROUND: ${service.turnaround}
BILINGUAL: English + Spanish support

CITY: ${city.name}, ${city.state} (${city.population?.toLocaleString()} population)
STATE TAX: ${city.hasStateTax ? `${city.stateTaxRate}% state income tax` : 'No state income tax'}
AREAS SERVED: ${city.neighborhoods?.join(', ')}

REQUIREMENTS:
- Each benefit must address pain points of low-medium income families
- MUST include these benefit types:
  1. EITC expertise (finding missed credits)
  2. Affordability (vs expensive competitors)
  3. Community trust (Black-owned, local, trusted)
  4. Bilingual support (Spanish-speaking)
  5. Convenience (locations, hours, online options)
  6. Payment flexibility (payment plans)
  7. Success stories (real refund amounts)
  8. Transparency (no hidden fees)
  9. Year-round support
  10. Mobile-friendly (text, call, online)
- Reference ${city.name} neighborhoods where target audience lives
- Keep each benefit to 25-40 words
- Use warm, community-focused language (not corporate)

OUTPUT FORMAT (JSON):
{
  "benefits": [
    "EITC experts who found $8,046 for families in ${city.neighborhoods?.[0] || city.name} that other preparers missed—we make sure you claim every credit you've earned",
    "Affordable $99-$199 pricing with payment plans available, serving ${city.name} families who can't afford $300-$500 elsewhere",
    "Black-owned, community-focused tax service trusted by hundreds of families throughout ${city.name}—we're from YOUR community",
    "Bilingual English-Spanish support (Hablamos español) for ${city.name}'s Spanish-speaking families who deserve help in their language",
    "Convenient locations and hours throughout ${city.neighborhoods?.join(', ') || city.name} with evening and weekend appointments for working families",
    "Free consultation to review your tax situation and estimate your EITC, Child Tax Credit, and total refund before you pay anything",
    "Real results: Maria in ${city.neighborhoods?.[0] || city.name} got $7,200. DeShawn got $5,800. Jose got $6,500. Your refund is waiting.",
    "No hidden fees, no surprises—transparent pricing because ${city.name} families deserve honesty and respect from their tax preparer",
    "Year-round support for ${city.name} families, not just tax season—we answer questions, help with IRS letters, and protect you from audits",
    "Text, call, or visit—we serve ${city.name} families however you prefer, with online filing options perfect for busy working parents"
  ]
}

Generate all 10 benefits now (JSON only, must follow the example structure above):`
}

/**
 * Generate city-specific FAQs for tax services (15 questions & answers)
 * OPTIMIZED FOR: Black and Spanish-speaking low-medium income families
 */
export function generateTaxServiceFAQsPrompt(params: {
  city: CityData
  service: TaxServiceSpec
}): string {
  const { city, service } = params

  return `Generate 15 frequently asked questions and detailed answers for Tax Genius Pro tax services in ${city.name}, ${city.state}.

TARGET AUDIENCE: Black and Latino working families ($20k-$60k income)

SERVICE: ${service.serviceName}
PRICE: $99-$199 with payment plans available
EITC FOCUS: Claim up to $8,046 in refunds
TURNAROUND: ${service.turnaround}
BILINGUAL: English + Spanish

CITY & TAX CONTEXT:
- Location: ${city.name}, ${city.state}
- Population: ${city.population?.toLocaleString()}
- State Tax: ${city.hasStateTax ? `Yes (${city.stateTaxRate}%)` : 'No state income tax'}
${city.irsOffice ? `- IRS Office: ${city.irsOffice}` : ''}
- ZIP Codes: ${city.zipCodes?.join(', ') || 'all metro area'}

FAQ CATEGORIES (3-4 questions each - MUST address these specific concerns):
1. **EITC & Tax Credits (4 questions)** - MOST IMPORTANT
   - "What is EITC and do I qualify?"
   - "How much EITC can I get?"
   - "What's the Child Tax Credit?"
   - "What if I didn't claim EITC last year?"

2. **Affordability & Pricing (3 questions)**
   - "How much does it cost?" (address affordability concerns)
   - "Can I pay in installments?"
   - "What if I can't afford to pay upfront?"

3. **Trust & Community (3 questions)**
   - "Are you really Black-owned?"
   - "How do I know you won't overcharge me?"
   - "Do you speak Spanish?" / "¿Hablan español?"

4. **Location & Convenience (2 questions)**
   - "Where are you located in ${city.name}?"
   - "Can I file my taxes online/by phone?"

5. **Common Situations (3 questions)**
   - "I have multiple jobs, can you help?"
   - "I drive for Uber/Lyft, is that complicated?"
   - "I'm self-employed, will it cost more?"

REQUIREMENTS:
- Questions must sound like real working families in ${city.name} would ask
- Answers must be 80-120 words, detailed but easy to understand (no jargon)
- Reference ${city.name} neighborhoods where target audience lives
- Address trust concerns directly and honestly
- Emphasize affordability, EITC, community connection
- Use warm, empowering language (not corporate)
- Bilingual mention for Spanish-speaking families
- Include specific examples and dollar amounts

OUTPUT FORMAT (JSON):
{
  "faqs": [
    {
      "question": "What is EITC and do I qualify if I live in ${city.name}?",
      "answer": "The Earned Income Tax Credit (EITC) is money the government gives back to working families—up to $8,046 if you have 3 or more children. If you're working in ${city.name} and earning between $17,000-$60,000 (depending on family size), you likely qualify. Many ${city.name} families in ${city.neighborhoods?.[0]}, ${city.neighborhoods?.[1]}, and throughout ${city.state} don't know about EITC and leave thousands on the table every year. We'll check your eligibility for free and make sure you claim every dollar. ${city.hasStateTax ? `Plus, ${city.state} may have additional state credits available.` : `Since ${city.state} has no state income tax, we focus on maximizing your federal EITC and Child Tax Credit.`}"
    },
    {
      "question": "How much does tax preparation cost in ${city.name}?",
      "answer": "Our tax preparation costs $99-$199 for most ${city.name} families—that's way less than the $300-$500 other places charge. A basic return with EITC and Child Tax Credit starts at $99. If you have multiple jobs, gig work (Uber, DoorDash), or are self-employed, it might be $149-$199. But here's the good news: payment plans are available. If you're getting a refund (and most ${city.name} families do), we can deduct our fee from your refund, so you don't pay anything upfront. We'll always give you a free consultation first so there are no surprises."
    },
    {
      "question": "Do you speak Spanish? My English isn't great.",
      "answer": "¡Sí! Hablamos español. We serve ${city.name}'s Spanish-speaking community with full bilingual support. Our tax preparers speak Spanish fluently and can explain everything about EITC, Child Tax Credit, and your refund in your language. Too many tax places in ${city.name} only speak English, leaving Latino families confused or paying too much. Not here. Whether you live in ${city.neighborhoods?.[0]}, ${city.neighborhoods?.[1]}, or anywhere in ${city.name}, you deserve tax help in español. Call us and ask for Spanish support—we're here para ayudarte."
    },
    {
      "question": "Can I pay in installments? I don't have $200 right now.",
      "answer": "Yes! We offer payment plans because we understand ${city.name} families are juggling bills, rent, and expenses. You can pay in 2-3 installments, or if you're expecting a refund, we can deduct our fee directly from your refund—so you pay nothing upfront. Many ${city.name} families use this option. For example, if your refund is $6,500 and our fee is $149, you get $6,351. Either way, we'll work with you. Money should never stop you from claiming the $8,046 you deserve."
    },
    {
      "question": "What if I didn't claim EITC last year? Did I lose that money?",
      "answer": "Good news! You can still claim EITC for the last 3 years. If you missed EITC in 2024, 2023, or 2022, we can file amended returns and get you that money. Many ${city.name} families don't know this. We've helped families in ${city.neighborhoods?.[0]} and ${city.neighborhoods?.[1]} recover $15,000-$20,000 from 3 years of missed EITC. The IRS doesn't advertise this, but we make sure our ${city.name} clients know their rights. Let's review your past returns for free and see what you're owed."
    }
  ]
}

Generate all 15 FAQs now (JSON only, following the structure and tone above):`
}

/**
 * Generate city-specific tax preparer recruitment section (250-300 words)
 * This creates the B2B conversion path for recruiting tax professionals
 */
export function generateTaxPreparerRecruitmentPrompt(params: {
  city: CityData
  recruitment: RecruitmentOpportunitySpec
}): string {
  const { city, recruitment } = params

  return `You are an expert recruitment copywriter specializing in tax preparation careers.

Write a compelling 250-300 word recruitment section for Tax Genius Pro, targeting potential tax preparers in ${city.name}, ${city.state}.

OPPORTUNITY DETAILS:
- Average Income: $${recruitment.avgIncome.toLocaleString()}/year
${recruitment.topEarnerIncome ? `- Top Earners: $${recruitment.topEarnerIncome.toLocaleString()}/year` : ''}
- Work Model: ${recruitment.benefits.join(', ')}
- Training: ${recruitment.trainingDuration}
- Certification: ${recruitment.certificationProvided ? 'Yes - Provided at no cost' : 'Not required'}
- Schedule: ${recruitment.seasonalOrYearRound === 'year-round' ? 'Year-round income opportunity' : 'Seasonal high-earning period'}

CITY CONTEXT:
- Location: ${city.name}, ${city.state}
- Population: ${city.population?.toLocaleString()} (large market opportunity)
- Tax Season Demand: High demand in ${city.neighborhoods?.slice(0, 3).join(', ') || 'all areas'}
- Target Recruits: Career changers, retirees, stay-at-home parents, part-time workers in ${city.name}

WRITING REQUIREMENTS:
1. **Length:** 250-300 words (strict requirement)
2. **Hook:** Start with earning potential or lifestyle benefit
3. **City-Specific:** Mention ${city.name} opportunity, local market size, neighborhoods
4. **Address Pain Points:** Dead-end jobs, commuting, inflexible hours, low pay
5. **Highlight Benefits:**
   - Earn $${recruitment.avgIncome.toLocaleString()}+ from home in ${city.name}
   - Free training and certification
   - Flexible hours perfect for ${city.name} lifestyle
   - No experience required
   - Be your own boss serving ${city.name} taxpayers
6. **Social Proof:** Mention successful tax preparers already working in ${city.state}
7. **Urgency:** Tax season approaching, limited training spots, growing ${city.name} market
8. **CTA:** "Join Tax Genius Pro in ${city.name}" - click to apply
9. **Tone:** Inspirational, opportunity-focused, empowering
10. **Keywords:** Include naturally: "tax preparer jobs ${city.name.toLowerCase()}", "work from home ${city.name.toLowerCase()}", "become a tax preparer", "${city.state.toLowerCase()} tax career"

STRUCTURE:
Paragraph 1 (80 words): Hook with income potential, introduce opportunity in ${city.name}
Paragraph 2 (100 words): Detail benefits, training, flexibility for ${city.name} residents
Paragraph 3 (70-120 words): Social proof, urgency, strong CTA to join

OUTPUT FORMAT (Plain text, no markdown):
[Your 250-300 word recruitment section here]

EXAMPLE OPENING (Do NOT copy, just style reference):
"Ready to earn $${recruitment.avgIncome.toLocaleString()} or more from your ${city.name} home? Tax Genius Pro is recruiting tax preparers in ${city.neighborhoods?.[0] || 'the area'}, ${city.neighborhoods?.[1] || city.name}, and throughout ${city.state}. Whether you're looking to escape the ${city.name} commute, need flexible hours, or want to build a rewarding career helping ${city.population?.toLocaleString()} ${city.name} residents with their taxes, this is your opportunity..."

Write now (250-300 words, ${city.name}-specific, recruitment focus):`
}

/**
 * Generate Google AI image prompt for city tax service hero image
 */
export function generateTaxServiceHeroImagePrompt(params: {
  city: CityData
  service: TaxServiceSpec
}): string {
  const { city, service } = params

  // Get city's most iconic characteristic for image generation
  const cityCharacteristic = getTaxServiceCityCharacteristic(city)

  return `Professional tax preparation consultation scene, modern office desk with laptop showing tax software, calculator and tax documents neatly organized, ${cityCharacteristic}, natural lighting through office window, professional business atmosphere, trustworthy and competent mood, high-end photography, ultra sharp focus, 4k resolution, sophisticated composition, corporate professional aesthetic`
}

/**
 * Get city's most iconic characteristic for tax service image generation
 */
function getTaxServiceCityCharacteristic(city: CityData): string {
  const cityImageStyles: Record<string, string> = {
    // Major cities with iconic visuals
    'New York': 'Manhattan skyline visible through window, NYC business district ambiance',
    'Los Angeles': 'palm trees and LA skyline in background, California sunshine',
    'Chicago': 'Chicago skyline and Lake Michigan view, modern downtown office',
    'Houston': 'Houston downtown skyline visible, Texas business atmosphere',
    'Phoenix': 'Arizona desert mountains in background, modern Southwestern office',
    'Philadelphia': 'Philadelphia city architecture visible, historic business district',
    'San Antonio': 'San Antonio skyline and Texas Hill Country, professional Texas office',
    'San Diego': 'San Diego harbor view, Southern California coastal atmosphere',
    'Dallas': 'Dallas skyline, modern Texas business office',
    'San Jose': 'Silicon Valley tech atmosphere, Bay Area modern office',
    'Austin': 'Austin skyline and Texas Capitol visible, creative Texas business',
    'Jacksonville': 'Jacksonville skyline and St. Johns River, Florida business setting',
    'Fort Worth': 'Fort Worth skyline, Texas business atmosphere',
    'Columbus': 'Columbus downtown architecture, Ohio professional office',
    'Charlotte': 'Charlotte banking district skyline, North Carolina business',
    'Indianapolis': 'Indianapolis city skyline, Midwest professional office',
    'Seattle': 'Seattle skyline and Puget Sound, Pacific Northwest ambiance',
    'Denver': 'Rocky Mountains and Denver skyline, Colorado professional setting',
    'Washington': 'DC monuments and federal buildings, nation\'s capital atmosphere',
    'Boston': 'Boston skyline and historic architecture, New England professionalism',
    'Nashville': 'Nashville skyline, Tennessee business atmosphere',
    'Portland': 'Portland bridges and mountains, Pacific Northwest office',
    'Las Vegas': 'Las Vegas Strip in background, Nevada business setting',
    'Detroit': 'Detroit skyline and Renaissance Center, Michigan professional office',
    'Memphis': 'Memphis skyline and Mississippi River, Tennessee business',
    'Louisville': 'Louisville skyline, Kentucky professional atmosphere',
    'Baltimore': 'Baltimore Inner Harbor, Maryland business district',
    'Milwaukee': 'Milwaukee skyline and Lake Michigan, Wisconsin office',
    'Albuquerque': 'Sandia Mountains and Albuquerque, New Mexico atmosphere',
    'Tucson': 'Tucson desert and mountains, Arizona professional setting',
    'Fresno': 'Central California valley and Sierra Nevada views',
    'Sacramento': 'California State Capitol visible, Sacramento business',
    'Mesa': 'Arizona desert landscape, modern Southwest office',
    'Atlanta': 'Atlanta skyline, Georgia business hub atmosphere',
    'Miami': 'Miami Beach and downtown skyline, Florida tropical business',
    'Tampa': 'Tampa Bay waterfront, Florida Gulf Coast office',
    'Orlando': 'Orlando skyline and Florida sunshine, professional setting',
  }

  // Return city-specific style or generic professional office
  return (
    cityImageStyles[city.name] ||
    `${city.name}, ${city.state} cityscape in background, professional local office atmosphere`
  )
}

/**
 * Generate meta description for tax service page
 */
export function generateTaxServiceMetaDescription(params: {
  city: CityData
  service: TaxServiceSpec
}): string {
  const { city, service } = params

  return `Professional ${service.serviceName.toLowerCase()} in ${city.name}, ${city.state}. ${service.turnaround}. Starting at $${service.startingPrice}. ${city.hasStateTax ? `Expert in ${city.state} state taxes.` : `Maximize your federal refund.`} Call now for free consultation!`
}

/**
 * Generate H1 for tax service page
 */
export function generateTaxServiceH1(params: {
  city: CityData
  service: TaxServiceSpec
}): string {
  const { city, service } = params

  return `${service.serviceName} in ${city.name}, ${city.state}`
}

/**
 * Generate page title for tax service page
 */
export function generateTaxServiceTitle(params: {
  city: CityData
  service: TaxServiceSpec
}): string {
  const { city, service } = params

  return `${service.serviceName} ${city.name}, ${city.stateCode} | ${service.turnaround} | From $${service.startingPrice}`
}
