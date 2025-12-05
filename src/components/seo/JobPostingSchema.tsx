import { safeJsonLdStringify } from '@/lib/utils/json-ld';

interface JobPostingSchemaProps {
  city: string;
  state: string;
  stateCode: string;
  locale?: string;
}

/**
 * JobPosting JSON-LD Schema for SEO and LLM optimization
 * Enables Google Jobs integration and improves LLM discoverability
 */
export default function JobPostingSchema({
  city,
  state,
  stateCode,
  locale = 'en',
}: JobPostingSchemaProps) {
  const jobPosting = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: `Tax Preparer - ${city}, ${stateCode}`,
    description: `Earn $75,000-$150,000 annually as a remote Tax Preparer in ${city}, ${state}. No experience needed - we provide free 4-6 week training, certification, and ongoing support. Work from home with flexible hours. Perfect for career changers, retirees, and anyone seeking work-life balance.`,
    datePosted: new Date().toISOString().split('T')[0],
    validThrough: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      .toISOString()
      .split('T')[0],
    employmentType: 'CONTRACTOR',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Tax Genius Pro',
      sameAs: 'https://taxgeniuspro.tax',
      logo: 'https://taxgeniuspro.tax/tax-genius-logo.png',
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: city,
        addressRegion: stateCode,
        addressCountry: 'US',
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: {
        '@type': 'QuantitativeValue',
        minValue: 75000,
        maxValue: 150000,
        unitText: 'YEAR',
      },
    },
    jobBenefits: [
      'Free training and certification',
      'Work from home',
      'Flexible hours',
      'Unlimited earning potential',
      'Year-round income opportunities',
      'Free marketing materials',
      'Ongoing support and mentorship',
    ],
    qualifications: [
      'No prior experience required',
      'Must be 18 years or older',
      'Access to computer and internet',
      'Willingness to complete free training',
    ],
    responsibilities: [
      'Prepare federal and state tax returns for clients',
      'Review client documentation for accuracy',
      'Provide exceptional customer service',
      'Stay current with tax law changes through provided training',
    ],
    applicantLocationRequirements: {
      '@type': 'State',
      name: state,
    },
    jobLocationType: 'TELECOMMUTE',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jobPosting) }}
    />
  );
}
