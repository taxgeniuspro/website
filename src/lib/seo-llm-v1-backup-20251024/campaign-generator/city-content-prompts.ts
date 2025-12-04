/**
 * Tax Service-Specific Content Generation Prompts
 *
 * Generates unique, city-specific content for tax services
 */

import { OllamaClient } from '../integrations/ollama/ollama-client';
import { logger } from '@/lib/logger';

export interface CityData {
  id: string;
  name: string;
  state: string;
  stateCode: string;
  population: number;
  slug: string;
}

export interface TaxServiceSpec {
  name: string; // "Personal Tax Filing", "Business Tax Services"
  description: string;
  price?: number;
  features: string[];
}

export interface GeneratedCityContent {
  introduction: string; // 300-500 words
  benefits: string[]; // 10 benefits
  faqs: Array<{ question: string; answer: string }>; // 15 FAQs
  imagePrompt: string; // For AI image generation
  wordCount: number;
}

/**
 * Generate complete city-specific content for a tax service
 */
export async function generateCompleteCityContent(params: {
  city: CityData;
  serviceType: string; // 'personal-tax', 'business-tax', 'irs-resolution', 'tax-planning'
  taxServiceSpec: TaxServiceSpec;
  ollamaClient: OllamaClient;
}): Promise<GeneratedCityContent> {
  const { city, serviceType, taxServiceSpec, ollamaClient } = params;

  // Generate introduction (300-500 words)
  const introduction = await generateIntroduction(city, serviceType, taxServiceSpec, ollamaClient);

  // Generate 10 benefits
  const benefits = await generateBenefits(city, serviceType, taxServiceSpec, ollamaClient);

  // Generate 15 FAQs
  const faqs = await generateFAQs(city, serviceType, taxServiceSpec, ollamaClient);

  // Generate image prompt
  const imagePrompt = generateImagePrompt(city, serviceType);

  return {
    introduction,
    benefits,
    faqs,
    imagePrompt,
    wordCount: introduction.split(/\s+/).length,
  };
}

/**
 * Generate 300-500 word introduction for tax service in specific city
 */
async function generateIntroduction(
  city: CityData,
  serviceType: string,
  taxServiceSpec: TaxServiceSpec,
  ollamaClient: OllamaClient
): Promise<string> {
  const serviceDescriptions: Record<string, string> = {
    // Tax services
    'personal-tax': 'personal tax preparation and filing services',
    'business-tax': 'comprehensive business tax services and accounting',
    'irs-resolution': 'IRS tax problem resolution and debt relief',
    'tax-planning': 'strategic tax planning and optimization',
    // Lead generation campaigns
    'get-tax-filing': 'professional tax preparation services for individuals and families',
    'become-tax-preparer': 'exciting career opportunities as a tax preparer or CPA',
    'become-affiliate': 'lucrative affiliate program to earn money referring tax clients',
  };

  const serviceDesc = serviceDescriptions[serviceType] || 'professional tax services';

  const prompt = `Write a professional, compelling 400-word introduction for ${serviceDesc} in ${city.name}, ${city.state}.

Service: ${taxServiceSpec.name}
Description: ${taxServiceSpec.description}
${taxServiceSpec.price ? `Price: Starting at $${taxServiceSpec.price}` : ''}

Requirements:
- Write EXACTLY 400 words (target range: 380-420 words)
- Focus on benefits for ${city.name} residents and businesses
- Mention local ${city.name} context naturally
- Professional, trustworthy tone
- Include subtle urgency (tax deadlines)
- SEO-optimized for "${serviceType} ${city.name}"
- NO bullet points, just flowing paragraphs
- Include a clear value proposition
- Emphasize IRS expertise and certification

IMPORTANT: Output ONLY the final introduction text. No reasoning, no explanations, just the 400-word introduction.`;

  const introduction = await ollamaClient.generate({
    system:
      'You are a professional copywriter specializing in tax services. Output ONLY the final content, no reasoning or explanations.',
    prompt,
    temperature: 0.7,
    maxTokens: 800,
  });

  return introduction.trim();
}

/**
 * Generate 10 unique benefits for the tax service
 */
async function generateBenefits(
  city: CityData,
  serviceType: string,
  taxServiceSpec: TaxServiceSpec,
  ollamaClient: OllamaClient
): Promise<string[]> {
  const prompt = `Generate 10 specific benefits of using ${taxServiceSpec.name} in ${city.name}, ${city.state}.

Service Features:
${taxServiceSpec.features.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Requirements:
- Each benefit should be 1-2 sentences
- Mix of emotional and practical benefits
- Mention ${city.name} or ${city.state} context where relevant
- Professional tone
- Focus on results and outcomes

Format your response as a JSON array of strings:
["Benefit 1 text here", "Benefit 2 text here", ...]

IMPORTANT: Output ONLY valid JSON array, no markdown or explanations.`;

  const response = await ollamaClient.generate({
    system: 'You are a tax services marketing expert. Output ONLY valid JSON, no markdown.',
    prompt,
    temperature: 0.6,
    maxTokens: 800,
  });

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const benefits = JSON.parse(jsonMatch[0]);
      return benefits.slice(0, 10); // Ensure exactly 10
    }
  } catch (error) {
    logger.error('[City Content] Failed to parse benefits:', error);
  }

  // Fallback benefits
  return [
    `Experienced tax professionals serving ${city.name} residents`,
    'Maximum refund guarantee',
    'IRS audit protection included',
    'Year-round tax support',
    'Secure document upload and storage',
    'Expert knowledge of state and federal tax law',
    'Fast, accurate tax preparation',
    'Affordable pricing with no hidden fees',
    'Free consultation to review your tax situation',
    'Convenient online and in-person options',
  ];
}

/**
 * Generate 15 city-specific FAQs
 */
async function generateFAQs(
  city: CityData,
  serviceType: string,
  taxServiceSpec: TaxServiceSpec,
  ollamaClient: OllamaClient
): Promise<Array<{ question: string; answer: string }>> {
  const prompt = `Generate 15 frequently asked questions and answers about ${taxServiceSpec.name} for ${city.name}, ${city.state} residents.

Service Type: ${serviceType}
State: ${city.state}

Requirements:
- Questions should be realistic questions ${city.name} residents would ask
- Answers should be 2-3 sentences, informative
- Include ${city.state} state tax information where relevant
- Mix of general tax questions and service-specific questions
- Professional, helpful tone

Format your response as a JSON array:
[
  {"question": "Q1 here?", "answer": "A1 here"},
  {"question": "Q2 here?", "answer": "A2 here"},
  ...
]

IMPORTANT: Output ONLY valid JSON array, no markdown formatting.`;

  const response = await ollamaClient.generate({
    system: 'You are a tax services expert. Output ONLY valid JSON, no markdown.',
    prompt,
    temperature: 0.6,
    maxTokens: 1500,
  });

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const faqs = JSON.parse(jsonMatch[0]);
      return faqs.slice(0, 15); // Ensure exactly 15
    }
  } catch (error) {
    logger.error('[City Content] Failed to parse FAQs:', error);
  }

  // Fallback FAQs
  return getFallbackFAQs(city, serviceType);
}

/**
 * Generate image prompt for city-specific tax service image
 */
function generateImagePrompt(city: CityData, serviceType: string): string {
  const landmarks: Record<string, string> = {
    'New York': 'with Manhattan skyline in background',
    'Los Angeles': 'with LA downtown skyline visible',
    Chicago: 'with Willis Tower in background',
    Houston: 'with Houston skyline backdrop',
    Phoenix: 'with desert landscape visible',
    'San Antonio': 'with San Antonio River Walk nearby',
    'San Diego': 'with coastal view',
    Dallas: 'with Dallas skyline visible',
    'San Jose': 'in Silicon Valley setting',
    Austin: 'with Texas State Capitol view',
  };

  const landmark = landmarks[city.name] || `in downtown ${city.name}`;

  return `Professional modern tax office exterior ${landmark}, glass windows showing consultation area inside, clean professional signage for tax services, welcoming entrance, afternoon golden hour lighting, ultra realistic, architectural photography, 4k quality, professional business photography`;
}

/**
 * Fallback FAQs if AI generation fails
 */
function getFallbackFAQs(
  city: CityData,
  serviceType: string
): Array<{ question: string; answer: string }> {
  return [
    {
      question: `What tax services do you offer in ${city.name}?`,
      answer: `We offer comprehensive tax services in ${city.name} including personal tax filing, business tax returns, IRS problem resolution, tax planning, and year-round support.`,
    },
    {
      question: 'How much do your tax preparation services cost?',
      answer:
        'Our fees vary based on the complexity of your tax situation. We offer free consultations to review your needs and provide an accurate quote with no hidden fees.',
    },
    {
      question: `Do I need to visit your ${city.name} office in person?`,
      answer: `No, we offer both in-person consultations in ${city.name} and secure online tax preparation services. You can upload documents securely and meet virtually with our tax professionals.`,
    },
    {
      question: 'What documents do I need for tax preparation?',
      answer:
        'Typically you need W-2s, 1099s, receipts for deductions, prior year returns, and identification. We provide a detailed checklist based on your specific situation during your consultation.',
    },
    {
      question: 'How do you maximize my tax refund?',
      answer:
        'Our experienced tax professionals thoroughly review your finances to identify all eligible deductions and credits. We stay current on tax law changes to ensure you benefit from every opportunity to reduce your tax liability.',
    },
    {
      question: `Are you familiar with ${city.state} state taxes?`,
      answer: `Yes, our team specializes in both federal and ${city.state} state tax preparation. We stay updated on ${city.state} tax laws and regulations to optimize your state tax return.`,
    },
    {
      question: 'What if I get audited by the IRS?',
      answer:
        'All our tax preparation services include audit protection. If you are audited, we will represent you before the IRS and guide you through the process at no additional charge.',
    },
    {
      question: 'Can you help with past tax returns?',
      answer:
        'Yes, we can prepare amended returns for previous years and help you get caught up if you have unfiled returns. We also assist with IRS payment plans and penalty abatement.',
    },
    {
      question: 'How long does tax preparation take?',
      answer:
        'For most individual returns, we complete preparation within 2-5 business days. More complex business returns may take 5-7 business days. Rush service is available if needed.',
    },
    {
      question: 'Do you offer year-round tax support?',
      answer:
        'Yes, unlike seasonal tax chains, we provide year-round support for tax questions, estimated payments, IRS notices, and tax planning throughout the year.',
    },
    {
      question: 'Can you help my business with quarterly taxes?',
      answer:
        'Absolutely. We help businesses with quarterly estimated tax payments, payroll taxes, sales tax compliance, and year-end tax planning to minimize your tax burden.',
    },
    {
      question: 'What makes you different from other tax preparers?',
      answer:
        'We combine personalized service with expert knowledge, offer maximum refund guarantees, include audit protection, provide year-round support, and use secure technology for convenience.',
    },
    {
      question: 'Is my information secure?',
      answer:
        'Yes, we use bank-level encryption for all document uploads and communications. Our secure portal is HIPAA-compliant and we never share your information without your permission.',
    },
    {
      question: 'Can you handle complex tax situations?',
      answer:
        'Yes, our team has experience with rental properties, investments, self-employment, multi-state returns, foreign income, and other complex tax scenarios.',
    },
    {
      question: 'What happens after I file?',
      answer:
        'We provide you with copies of your complete return, track your refund status, remain available for questions, and prepare for next tax season with proactive planning.',
    },
  ];
}

export default generateCompleteCityContent;
